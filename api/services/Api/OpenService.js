import crypto from 'crypto';
import querystring from 'querystring';
import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import { parseAssetAmount } from '../../Util/AssetAmount.js';
import Config from '../../Util/Config.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { ensureOpenDepositTable } from '../../Util/OpenDepositSchema.js';
import { toDappApiError } from '../../Util/DappApiMessage.js';

const TOKEN = 'USDT';
const DEPOSIT_SCENE = 'open_api_recharge';

function normalizeWallet(value) {
    return String(value || '').trim().toLowerCase();
}

function isWallet(value) {
    return /^0x[a-f0-9]{40}$/u.test(value);
}

function signaturesMatch(received, expected) {
    const receivedBuffer = Buffer.from(String(received || '').trim().toLowerCase(), 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return receivedBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

async function generateRefCode(config, connection) {
    for (let index = 0; index < 20; index += 1) {
        const candidate = Helper.randomStr(8).toUpperCase();
        const exists = await DB.query(config, connection)
            .table('wallet')
            .where('ref_code', candidate)
            .first();
        if (!exists) return candidate;
    }
    return `NM${Date.now().toString(36).toUpperCase()}`;
}

async function createWalletIfMissing(wallet, config, connection, prefix, now) {
    const existingRows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`,
        [wallet]
    );
    if (existingRows?.[0]) return existingRows[0];

    const configuredInviter = normalizeWallet(Config.OPEN_API_WALLET);
    let inviter = null;
    if (configuredInviter) {
        if (!isWallet(configuredInviter)) {
            throw new Error('OPEN_API_WALLET configuration is invalid');
        }
        if (configuredInviter === wallet) {
            throw new Error('The deposit wallet cannot be the same as OPEN_API_WALLET');
        }
        const inviterRows = await DB.query(config, connection).exec(
            `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`,
            [configuredInviter]
        );
        inviter = inviterRows?.[0] || null;
        if (!inviter) {
            throw new Error('The wallet configured in OPEN_API_WALLET does not exist');
        }
    }

    const refCode = await generateRefCode(config, connection);
    const inserted = await DB.query(config, connection).table('wallet').insertOrIgnore({
        wallet,
        invests: '0',
        community_invests: '0',
        community_users: 0,
        inviter: inviter?.wallet || null,
        ref_code: refCode,
        lv: inviter ? Number(inviter.lv || 0) + 1 : 0,
        level: 0,
        level_isupdate: 0,
        created_at: now,
        updated_at: now
    });

    if (inserted && inviter) {
        const ancestors = await DB.query(config, connection).table('wallet_relation')
            .whereRaw('LOWER(wallet)=?', [configuredInviter])
            .orderBy('lv', 'asc')
            .get();
        const relationRows = [{
            wallet,
            wallet_invests: '0',
            inviter: inviter.wallet,
            inviter_invests: String(inviter.invests ?? '0'),
            lv: 1,
            created_at: now,
            updated_at: now
        }];
        for (const ancestor of ancestors || []) {
            if (!ancestor.inviter) continue;
            relationRows.push({
                wallet,
                wallet_invests: '0',
                inviter: ancestor.inviter,
                inviter_invests: String(ancestor.inviter_invests ?? '0'),
                lv: Number(ancestor.lv || 0) + 1,
                created_at: now,
                updated_at: now
            });
        }
        await DB.query(config, connection).table('wallet_relation').insert(relationRows);
    }

    const walletRows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`,
        [wallet]
    );
    if (!walletRows?.[0]) throw new Error('Failed to create wallet');
    return walletRows[0];
}

async function deposits(req, res) {
    try {
        const uniqueId = String(req.body?.unique_id ?? '').trim();
        const walletInput = String(req.body?.wallet ?? '').trim();
        const amountInput = String(req.body?.amount ?? '').trim();
        const signature = String(req.body?.signature ?? '').trim();

        if (!uniqueId || !walletInput || !amountInput || !signature) {
            return res.send(ApiResult.error(400, 'unique_id, wallet, amount, and signature are required'));
        }

        const wallet = normalizeWallet(walletInput);
        if (!isWallet(wallet)) {
            return res.send(ApiResult.error(400, 'Invalid wallet address'));
        }
        if (!/^[a-f0-9]{64}$/iu.test(signature)) {
            return res.send(ApiResult.error(401, 'Invalid signature'));
        }

        const secretKey = String(Config.OPEN_API_SECRET_KEY || '');
        if (!secretKey) {
            throw new Error('OPEN_API_SECRET_KEY is not configured');
        }

        // The field order is part of the signing protocol and must not be changed.
        const params = querystring.stringify({
            unique_id: uniqueId,
            wallet: walletInput,
            amount: amountInput
        });
        const expectedSignature = Helper.createHmacSha256(params, secretKey);
        if (!signaturesMatch(signature, expectedSignature)) {
            return res.send(ApiResult.error(401, 'Signature verification failed'));
        }

        await ensureOpenDepositTable();
        const token = await AssetToken.getTokenItem(TOKEN);
        if (!token) {
            throw new Error('USDT asset is not configured');
        }

        let rawAmount;
        try {
            rawAmount = parseAssetAmount(amountInput, Number(token.decimals || AssetToken.DEFAULT_DECIMALS));
        } catch {
            return res.send(ApiResult.error(400, 'Invalid deposit amount format'));
        }
        if (BigInt(rawAmount) <= 0n) {
            return res.send(ApiResult.error(400, 'The deposit amount must be greater than 0'));
        }

        let duplicated = false;
        await DB.transaction(async (config, connection) => {
            const prefix = Database.prefix(config) || '';
            const now = Helper.dateFormat();
            const inserted = await DB.query(config, connection).table('open_deposit_order').insertOrIgnore({
                unique_id: uniqueId,
                wallet,
                token: TOKEN,
                amount: rawAmount,
                created_at: now,
                updated_at: now
            });

            // open_deposit_order.unique_id has a unique index, so concurrent retries
            // cannot credit the same external order more than once.
            if (!inserted) {
                duplicated = true;
                return;
            }

            await createWalletIfMissing(wallet, config, connection, prefix, now);

            await DB.query(config, connection).exec(
                `INSERT IGNORE INTO ${prefix}wallet_assets
                    (wallet, token, balance, frozen_balance, updated_at)
                 VALUES (?, ?, '0', '0', ?)`,
                [wallet, TOKEN, now]
            );
            const assetRows = await DB.query(config, connection).exec(
                `SELECT * FROM ${prefix}wallet_assets
                 WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
                [wallet, TOKEN]
            );
            const asset = assetRows?.[0];
            if (!asset) {
                throw new Error('Failed to create wallet asset account');
            }

            const beforeBalance = BigInt(String(asset.balance || '0'));
            const afterBalance = beforeBalance + BigInt(rawAmount);
            await DB.query(config, connection).table('wallet_assets').where('id', asset.id).update({
                balance: afterBalance.toString(),
                updated_at: now
            });
            await DB.query(config, connection).table('wallet_assets_logs').insert({
                biz_id: uniqueId,
                wallet,
                token: TOKEN,
                balance: rawAmount,
                before_balance: beforeBalance.toString(),
                after_balance: afterBalance.toString(),
                scene: DEPOSIT_SCENE,
                reason: `USDT open API recharge ${uniqueId}`,
                type: 'in',
                created_at: now,
                updated_at: now
            });
        });

        if (duplicated) {
            return res.send(ApiResult.error(409, 'unique_id already exists; do not submit it again'));
        }
        return res.send(ApiResult.success({
            unique_id: uniqueId,
            wallet,
            amount: amountInput,
            token: TOKEN
        }, 'Deposit completed successfully'));
    } catch (error) {
        return res.send(ApiResult.exception(toDappApiError(error), 'OpenService.deposits'));
    }
}

export default { deposits };
