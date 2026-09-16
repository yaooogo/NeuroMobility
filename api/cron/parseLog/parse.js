import { ethers } from 'ethers';
import { TokenReceiverAbi } from "../../Util/Abi/TokenReceiverAbi.js";
import { TokenWithdrawalAbi } from "../../Util/Abi/TokenWithdrawalAbi.js";
import AssetToken from '../../Util/AssetToken.js';
import ChainConfig from '../../Util/ChainConfig.js';
import Helper from '../../Util/Helper.js';
import DB from '../../Util/database/DB.js';
import Database from '../../Util/Database.js';
import { RedisCache } from '../../Util/Cache.js';
import BigNumber from 'bignumber.js';

const TokenReceiverIface = new ethers.Interface(TokenReceiverAbi.abi);
const TokenReceiverEvent = ethers.id(ChainConfig.getContractEvent('TokenReceiver', 'PaymentReceived'));
const TokenWithdrawalIface = new ethers.Interface(TokenWithdrawalAbi.abi);
const TokenWithdrawalEvent = ethers.id(ChainConfig.getContractEvent('TokenWithdrawal', 'Claimed'));
const USER_ASSET_LOG_SCENE = 'token_recharge';

function normalizeAddress(value) {
    return String(value || '').trim().toLowerCase();
}

async function resolveTokenItemByContract(address) {
    return await AssetToken.getTokenItemByContract(normalizeAddress(address));
}

function formatOrderCreatedAt(timestamp) {
    const unix = Number(timestamp || 0);
    if (!unix) {
        return Helper.dateFormat();
    }

    return Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date(unix * 1000));
}

function toRawBigInt(value) {
    const amount = new BigNumber(String(value || '0'));
    if (!amount.isFinite() || amount.isNaN()) {
        return 0n;
    }

    return BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toFixed(0));
}

export default {
    async TokenReceiver(log) {
        try {
            if (!log?.topics?.length || log.topics[0] !== TokenReceiverEvent) {
                return false;
            }

            const parsedLog = TokenReceiverIface.parseLog(log);
            if (!parsedLog || parsedLog.name !== 'PaymentReceived') {
                return false;
            }

            const payer = normalizeAddress(parsedLog.args?.payer || parsedLog.args?.[0] || '');
            const tokenAddress = normalizeAddress(parsedLog.args?.token || parsedLog.args?.[1] || '');
            const tokenItem = await resolveTokenItemByContract(tokenAddress);
            const tokenSymbol = String(tokenItem?.symbol || '').trim().toUpperCase();
            const amount = String(parsedLog.args?.amount || parsedLog.args?.[3] || '0');
            const orderId = String(parsedLog.args?.orderId || parsedLog.args?.[4] || '');
            const eventTimestamp = parsedLog.args?.timestamp || parsedLog.args?.[5] || 0;
            const createdAt = formatOrderCreatedAt(eventTimestamp);
            const logIndex = Number(log.index ?? log.logIndex ?? 0);
            const cacheKey = `TOKEN_RECEIVER_PAYMENT_RECEIVED:${orderId}:${log.blockNumber}:${logIndex}`;

            if (!orderId || !payer || !tokenSymbol || !tokenAddress) {
                return false;
            }

            if (await RedisCache.get(cacheKey)) {
                return false;
            }

            await DB.transaction(async (config, connection) => {
                const prefix = Database.prefix(config);
                const now = Helper.dateFormat();
                const inserted = await DB.query(config, connection).table('receiver_order').insertOrIgnore({
                    order_id: orderId,
                    contract: tokenAddress,
                    wallet: payer,
                    amount,
                    block_number: Number(log.blockNumber || 0),
                    "`index`": logIndex,
                    created_at: createdAt,
                    updated_at: now
                });

                if (!inserted) {
                    return false;
                }

                const assetRows = await DB.query(config, connection).exec(
                    `SELECT * FROM ${prefix}user_assets WHERE wallet=? AND token=? LIMIT 1 FOR UPDATE`,
                    [payer, tokenSymbol]
                );
                let asset = Array.isArray(assetRows) ? assetRows[0] : null;

                if (!asset) {
                    let nextAssetId = await DB.query(config, connection).table('user_assets').max('id');
                    nextAssetId = Helper.parseInt(nextAssetId, 0);

                    await DB.query(config, connection).table('user_assets').insert({
                        id: nextAssetId + 1,
                        wallet: payer,
                        token: tokenSymbol,
                        balance: '0',
                        frozen_balance: '0',
                        updated_at: now
                    });

                    asset = {
                        balance: '0'
                    };
                }

                const beforeBalance = toRawBigInt(asset.balance);
                const rechargeAmount = toRawBigInt(amount);
                const afterBalance = beforeBalance + rechargeAmount;

                await DB.query(config, connection).exec(
                    `UPDATE ${prefix}user_assets SET balance=?, updated_at=? WHERE wallet=? AND token=?`,
                    [afterBalance.toString(), now, payer, tokenSymbol]
                );

                let nextLogId = await DB.query(config, connection).table('user_assets_logs').max('id');
                nextLogId = Helper.parseInt(nextLogId, 0);

                await DB.query(config, connection).table('user_assets_logs').insert({
                    id: nextLogId + 1,
                    biz_id: orderId,
                    wallet: payer,
                    token: tokenSymbol,
                    balance: rechargeAmount.toString(),
                    before_balance: beforeBalance.toString(),
                    after_balance: afterBalance.toString(),
                    scene: USER_ASSET_LOG_SCENE,
                    reason: `${tokenSymbol} recharge order ${orderId}`,
                    type: 'in',
                    created_at: now,
                    updated_at: now
                });
            });

            await RedisCache.set(cacheKey, "1", 180);
            console.log("parse TokenReceiver", payer, tokenSymbol, orderId);
            return true;
        }
        catch (e) {
            throw new Error(e?.message || e);
        }
    },
    async TokenWithdrawal(log) {
        try {
            if (!log?.topics?.length || log.topics[0] !== TokenWithdrawalEvent) {
                return false;
            }

            const parsedLog = TokenWithdrawalIface.parseLog(log);
            if (!parsedLog || parsedLog.name !== 'Claimed') {
                return false;
            }

            const tokenAddress = normalizeAddress(parsedLog.args?.token || parsedLog.args?.[0] || '');
            const tokenItem = await resolveTokenItemByContract(tokenAddress);
            const tokenSymbol = String(tokenItem?.symbol || '').trim().toUpperCase();
            const orderId = String(parsedLog.args?.orderId || parsedLog.args?.[1] || '');
            const user = normalizeAddress(parsedLog.args?.user || parsedLog.args?.[2] || '');
            const claimAmount = String(parsedLog.args?.claimAmount || parsedLog.args?.[3] || '0');
            const serviceAmount = String(parsedLog.args?.serviceAmount || parsedLog.args?.[4] || '0');
            const feeReceiver = normalizeAddress(parsedLog.args?.feeReceiver || parsedLog.args?.[5] || '');
            const claimTime = Number(parsedLog.args?.claimTime || parsedLog.args?.[6] || 0);
            const txHash = String(log.transactionHash || '').trim();
            const logIndex = Number(log.index ?? log.logIndex ?? 0);
            const cacheKey = `TOKEN_WITHDRAWAL_CLAIMED:${orderId}:${log.blockNumber}:${logIndex}`;

            if (!orderId || !user || !tokenSymbol) {
                return false;
            }

            if (await RedisCache.get(cacheKey)) {
                return false;
            }

            await DB.transaction(async (config, connection) => {
                const prefix = Database.prefix(config);
                const now = Helper.dateFormat();
                const createdAt = claimTime
                    ? Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date(claimTime * 1000))
                    : now;

                const orderRows = await DB.query(config, connection).exec(
                    `SELECT * FROM ${prefix}withdrawal_order WHERE order_id=? LIMIT 1 FOR UPDATE`,
                    [orderId]
                );
                const order = Array.isArray(orderRows) ? orderRows[0] : null;

                if (!order) {
                    throw new Error(`withdrawal order not found: ${orderId}`);
                }

                if (String(order.wallet || '').toLowerCase() !== user) {
                    throw new Error(`withdrawal wallet mismatch: ${orderId}`);
                }

                if (String(order.token || '').toUpperCase() !== tokenSymbol) {
                    throw new Error(`withdrawal token mismatch: ${orderId}`);
                }

                if (toRawBigInt(order.amount) !== toRawBigInt(claimAmount)) {
                    throw new Error(`withdrawal amount mismatch: ${orderId}`);
                }

                if (toRawBigInt(order.service_amount) !== toRawBigInt(serviceAmount)) {
                    throw new Error(`withdrawal service amount mismatch: ${orderId}`);
                }

                await DB.query(config, connection).exec(
                    `UPDATE ${prefix}withdrawal_order
                     SET status=2,
                         tx_hash=?,
                         updated_at=?
                     WHERE order_id=?`,
                    [txHash, createdAt, orderId]
                );
            });

            await RedisCache.set(cacheKey, "1", 180);
            console.log("parse TokenWithdrawal", user, orderId, tokenSymbol, serviceAmount, feeReceiver);
            return true;
        }
        catch (e) {
            throw new Error(e?.message || e);
        }
    },
}
