import ApiResult from '../../Util/ApiResult.js';
import { createHash } from 'node:crypto';
import AssetToken from '../../Util/AssetToken.js';
import CacheData from '../../Util/CacheData.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { toDappApiError, toDappApiMessage } from '../../Util/DappApiMessage.js';
import { formatAssetAmount, parseAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import { ensureInvestmentOrderTable } from '../../Util/InvestmentSchema.js';
import { AGREEMENT_THRESHOLD, ensureInvestmentAgreementTable, buildAgreementSnapshot, validateAgreementSignature, agreementDateTime } from '../../Util/InvestmentAgreement.js';
import {
  LEVEL_REWARD_PERCENT_DENOMINATOR,
  calculateLevelRewardRates
} from '../../Util/LevelReward.js';

const TOKEN = 'USDT';
const R_TOKEN = 'RUSD';
const MIXED_TOKEN = 'USDT+RUSD';
const INVESTMENT_TOKENS = [TOKEN, R_TOKEN, MIXED_TOKEN];
const INVESTMENT_DECIMALS = 18;
const DIVIDEND_RECORD_SCENES = [
  'investment_dividend',
  'investment_expansion_reward',
  'investment_differential_income',
  'investment_direct_dividend_reward',
  'position_salary'
];

function address(value) { return String(value || '').trim().toLowerCase(); }
function isWallet(value) { return /^0x[a-f0-9]{40}$/u.test(address(value)); }
function addDays(value, days) { return new Date(value.getTime() + Number(days || 0) * 86400000); }
function scaleRaw(value, fromDecimals, toDecimals) {
  const raw = BigInt(value);
  if (fromDecimals === toDecimals) return raw;
  const factor = 10n ** BigInt(Math.abs(toDecimals - fromDecimals));
  return toDecimals > fromDecimals ? raw * factor : raw / factor;
}
function orderId() {
  const stamp = Helper.dateFormat('YYYYmmddHHMMSS', new Date());
  return `N${stamp}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

function normalizeInvestmentToken(value) {
  const token = String(value || TOKEN).trim().toUpperCase();
  return INVESTMENT_TOKENS.includes(token) ? token : TOKEN;
}

function isInvestmentTokenEnabled(token, config) {
  if (token === TOKEN) return true;
  if (token === R_TOKEN) return Number(config?.rusdt_investment_enabled ?? 1) === 1;
  if (token === MIXED_TOKEN) return Number(config?.mixed_investment_enabled ?? 1) === 1;
  return false;
}

function minimumInvestmentAmountForToken(token, config) {
  if (token === R_TOKEN) return Number(config?.rusdt_minimum_investment_amount || 0);
  if (token === MIXED_TOKEN) return Number(config?.mixed_minimum_investment_amount || 0);
  return Number(config?.usdt_minimum_investment_amount || config?.minimum_investment_amount || 0);
}

function exitMultipleForToken(token, config) {
  if (token === R_TOKEN) return Number(config?.rusdt_exit_multiple || config?.exit_multiple || 0);
  if (token === MIXED_TOKEN) return Number(config?.mixed_exit_multiple || config?.exit_multiple || 0);
  return Number(config?.usdt_exit_multiple || config?.exit_multiple || 0);
}

function normalizePercent(value, fallback = 0) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return fallback;
  return Math.min(100, Math.max(0, percent));
}

function percentBasis(value) {
  return BigInt(Math.round(normalizePercent(value) * 10000));
}

function mixedPercentForToken(token, mixedUsdtPercent) {
  if (token === TOKEN) return 100;
  if (token === R_TOKEN) return 0;
  return normalizePercent(mixedUsdtPercent, 70);
}

function splitMixedRaw(amountRaw, mixedUsdtPercent) {
  const usdtRaw = BigInt(amountRaw) * percentBasis(mixedUsdtPercent) / 1000000n;
  return { usdtRaw, rusdtRaw: BigInt(amountRaw) - usdtRaw };
}

function splitInvestmentAmount(amountRaw, investmentToken, mixedUsdtPercent) {
  if (investmentToken === TOKEN) return [{ token: TOKEN, amountRaw }];
  if (investmentToken === R_TOKEN) return [{ token: R_TOKEN, amountRaw }];
  const { usdtRaw, rusdtRaw } = splitMixedRaw(amountRaw, mixedUsdtPercent);
  return [
    { token: TOKEN, amountRaw: usdtRaw },
    { token: R_TOKEN, amountRaw: rusdtRaw }
  ].filter(item => item.amountRaw > 0n);
}

async function activateMatureOrders(wallet = '') {
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
  const query = DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now]);
  if (wallet) query.whereRaw('LOWER(wallet)=?', [wallet]);
  await query.update({ status: 1, updated_at: now });
}

function paymentParts(row) {
  const token = normalizeInvestmentToken(row.token);
  const amountRaw = BigInt(String(row.amount || '0'));
  if (token !== MIXED_TOKEN) {
    return [{ token, amount: formatAssetAmount(amountRaw.toString(), INVESTMENT_DECIMALS) }];
  }
  const { usdtRaw, rusdtRaw } = splitMixedRaw(amountRaw, mixedPercentForToken(token, row.mixed_usdt_percent));
  return [
    { token: TOKEN, amount: formatAssetAmount(usdtRaw.toString(), INVESTMENT_DECIMALS) },
    { token: R_TOKEN, amount: formatAssetAmount(rusdtRaw.toString(), INVESTMENT_DECIMALS) }
  ].filter(item => Number(item.amount) > 0);
}

function publicOrder(row) {
  const token = normalizeInvestmentToken(row.token);
  return {
    id: Number(row.id || 0),
    order_id: row.order_id || '',
    token,
    amount: formatAssetAmount(row.amount || '0', INVESTMENT_DECIMALS),
    mixed_usdt_percent: mixedPercentForToken(token, row.mixed_usdt_percent),
    payment_parts: paymentParts(row),
    distributed_amount: formatAssetAmount(row.distributed_amount || '0', INVESTMENT_DECIMALS),
    total_dividend: formatAssetAmount(row.total_dividend || '0', INVESTMENT_DECIMALS),
    waiting_days: Number(row.waiting_days || 0),
    cycle_days: Number(row.cycle_days || 0),
    min_percent: Number(row.min_percent || 0),
    max_percent: Number(row.max_percent || 0),
    dividend_multiple: Number(row.dividend_multiple || 0),
    dividend_min_percent: Number(row.dividend_min_percent || 0),
    dividend_max_percent: Number(row.dividend_max_percent || 0),
    exit_multiple: Number(row.exit_multiple || 0),
    guaranteed_percent: Number(row.guaranteed_percent || 0),
    guaranteed_eligible: Number(row.guaranteed_eligible || 0),
    whole_vehicle: Number(row.whole_vehicle || 0),
    is_gift: Number(row.is_gift || 0),
    status: Number(row.status || 0),
    waiting_until: row.waiting_until || '',
    next_dividend_at: row.next_dividend_at || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function publicDividendLog(row) {
  const token = row.token || TOKEN;
  const decimals = await AssetToken.getTokenDecimals(token);
  return {
    id: Number(row.id || 0),
    biz_id: row.biz_id || '',
    token,
    amount: formatAssetAmount(row.balance || '0', decimals),
    scene: row.scene || '',
    time: row.created_at || ''
  };
}

async function updateInvestmentTotals(configName, connection, prefix, wallet, amountRaw, performanceRaw, levelRules) {
  const walletRows = await DB.query(configName, connection).exec(
    `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`, [wallet]
  );
  const lockedWallet = walletRows?.[0];
  if (!lockedWallet || Number(lockedWallet.status || 0) !== 1) throw new Error('This account is unavailable');
  const investsAfter = BigInt(String(lockedWallet.invests || '0')) + amountRaw;
  await DB.query(configName, connection).table('wallet').where('id', lockedWallet.id).update({ invests: investsAfter.toString() });
  await DB.query(configName, connection).exec(
    `UPDATE ${prefix}wallet_relation SET wallet_invests=? WHERE LOWER(wallet)=?`,
    [investsAfter.toString(), wallet]
  );
  await DB.query(configName, connection).exec(
    `UPDATE ${prefix}wallet_relation SET inviter_invests=? WHERE LOWER(inviter)=?`,
    [investsAfter.toString(), wallet]
  );

  const ancestors = await DB.query(configName, connection).table('wallet_relation')
    .whereRaw('LOWER(wallet)=?', [wallet]).orderBy('lv', 'asc').get();
  const rules = levelRules.slice().sort((a, b) => b.level - a.level);
  for (const ancestor of ancestors || []) {
    const inviter = address(ancestor.inviter);
    if (!inviter) continue;
    const rows = await DB.query(configName, connection).exec(
      `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`, [inviter]
    );
    const member = rows?.[0];
    if (!member) continue;
    const communityAfter = BigInt(String(member.community_invests || '0')) + performanceRaw;
    const automaticLevel = rules.find(rule => communityAfter >= BigInt(
      parseAssetAmount(String(rule.min_price || 0), INVESTMENT_DECIMALS)
    ))?.level || 0;
    await DB.query(configName, connection).table('wallet').where('id', member.id).update({
      community_invests: communityAfter.toString(),
      level: automaticLevel,
      level_isupdate: 1
    });
  }
  return investsAfter;
}

async function distributeExpansionRewards(configName, connection, prefix, wallet, amountRaw, assetDecimals, levelRules, newOrderId, now) {
  const ancestors = await DB.query(configName, connection).exec(
    `SELECT relation.inviter AS wallet,
            relation.lv,
            member.invests,
            member.level,
            member.manual_level,
            member.is_manual_level
     FROM ${prefix}wallet_relation AS relation
     INNER JOIN ${prefix}wallet AS member
       ON LOWER(member.wallet)=LOWER(relation.inviter)
     WHERE LOWER(relation.wallet)=?
     ORDER BY relation.lv ASC`,
    [wallet]
  );
  const investedAncestors = (ancestors || []).filter(ancestor => BigInt(String(ancestor.invests || '0')) > 0n);
  const rewards = calculateLevelRewardRates(investedAncestors, levelRules, 'expansion_reward_percent');
  for (const reward of rewards) {
    const configuredReward = amountRaw * reward.percent / LEVEL_REWARD_PERCENT_DENOMINATOR;
    const assetReward = scaleRaw(configuredReward, INVESTMENT_DECIMALS, assetDecimals);
    if (assetReward <= 0n) continue;
    const assetRows = await DB.query(configName, connection).exec(
      `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
      [reward.wallet, TOKEN]
    );
    const asset = assetRows?.[0];
    if (!asset) throw new Error(`Expansion reward asset account not found: ${reward.wallet} ${TOKEN}`);
    const before = BigInt(String(asset.balance || '0'));
    const after = before + assetReward;
    await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
      balance: after.toString(), updated_at: now
    });
    await DB.query(configName, connection).table('wallet_assets_logs').insert({
      biz_id: `${newOrderId}E${reward.level}`,
      wallet: reward.wallet,
      token: TOKEN,
      balance: assetReward.toString(),
      before_balance: before.toString(),
      after_balance: after.toString(),
      scene: 'investment_expansion_reward',
      reason: `Investment expansion reward ${newOrderId} level ${reward.level}`,
      type: 'in',
      created_at: now,
      updated_at: now
    });
  }
}

async function create(req, res) {
  return createInvestment(req, res);
}

async function prepareAgreement(req, res) {
  try {
    await ensureInvestmentAgreementTable();
    const wallet = address(req.auth?.address());
    if (!isWallet(wallet)) return res.send(ApiResult.error(400, 'Invalid wallet address'));
    const config = await CacheData.getInvestmentConfig();
    const token = String(req.body?.token || TOKEN).trim().toUpperCase();
    if (!INVESTMENT_TOKENS.includes(token) || !isInvestmentTokenEnabled(token, config)) throw new Error('Invalid payment method');
    const amountRaw = BigInt(parseAssetAmount(String(req.body?.amount || ''), INVESTMENT_DECIMALS));
    const minimumRaw = BigInt(parseAssetAmount(String(minimumInvestmentAmountForToken(token, config)), INVESTMENT_DECIMALS));
    const wholeRaw = BigInt(parseAssetAmount(String(config.whole_vehicle_tier), INVESTMENT_DECIMALS));
    if (minimumRaw <= 0n || amountRaw < minimumRaw || (amountRaw !== wholeRaw && amountRaw % minimumRaw !== 0n)) throw new Error('Invalid investment amount');
    const mixedUsdtPercent = mixedPercentForToken(token, config.mixed_usdt_percent);
    const usdtRaw = splitInvestmentAmount(amountRaw, token, mixedUsdtPercent).find(item => item.token === TOKEN)?.amountRaw ?? 0n;
    if (usdtRaw < AGREEMENT_THRESHOLD) throw new Error('An agreement is required when the USDT portion is at least 1000 USDT');
    const snapshot = buildAgreementSnapshot({
      investor: req.body?.investor, maturity: req.body?.maturity, token,
      amount: formatAssetAmount(amountRaw.toString(), INVESTMENT_DECIMALS), amountRaw,
      usdtAmount: formatAssetAmount(usdtRaw.toString(), INVESTMENT_DECIMALS), usdtRaw, mixedUsdtPercent
    });
    await DB.query().table('investment_agreement').insert({ agreement_id: snapshot.agreement_id, wallet, snapshot: JSON.stringify(snapshot), created_at: snapshot.created_at });
    return res.send(ApiResult.success(snapshot));
  } catch (error) { return res.send(ApiResult.error(400, toDappApiMessage(error, 'Unable to prepare investment agreement'))); }
}

async function agreements(req, res) {
  try {
    await ensureInvestmentAgreementTable();
    const rows = await DB.query().table('investment_agreement').where('wallet', address(req.auth?.address()))
      .whereRaw('order_id IS NOT NULL').orderBy('id', 'desc').take(100).get();
    return res.send(ApiResult.success({ items: (rows || []).map(row => {
      const snapshot = JSON.parse(row.snapshot);
      return { agreement_id: row.agreement_id, order_id: row.order_id, usdt_amount: snapshot.usdt_amount, signed_at: row.signed_at };
    }) }));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentService.agreements')); }
}

async function agreement(req, res) {
  try {
    await ensureInvestmentAgreementTable();
    const orderId = String(req.body?.order_id || '').trim();
    if (!orderId) return res.send(ApiResult.error(400, 'Investment order not found'));
    const row = await DB.query().table('investment_agreement').where('wallet', address(req.auth?.address())).where('order_id', orderId).first();
    if (!row) return res.send(ApiResult.error(404, 'Signed agreement not found'));
    return res.send(ApiResult.success({ ...JSON.parse(row.snapshot), order_id: row.order_id, signature: row.signature, signed_at: row.signed_at, status: 'signed' }));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentService.agreement')); }
}

export async function createInvestment(req, res, options = {}) {
  try {
    await Promise.all([ensureAssetTransferTables(), ensureInvestmentOrderTable()]);
    const wallet = address(options.wallet ?? req.auth?.address());
    if (!isWallet(wallet)) return res.send(ApiResult.error(400, 'Invalid wallet address'));
    const [investmentConfig, levelRules] = await Promise.all([
      CacheData.getInvestmentConfig(),
      CacheData.getWalletLevelRules()
    ]);
    const amountText = String(req.body?.amount ?? '').trim();
    const requestedToken = String(req.body?.token || TOKEN).trim().toUpperCase();
    if (!INVESTMENT_TOKENS.includes(requestedToken)) return res.send(ApiResult.error(400, 'Invalid payment method'));
    const investmentToken = normalizeInvestmentToken(requestedToken);
    if (!isInvestmentTokenEnabled(investmentToken, investmentConfig)) {
      return res.send(ApiResult.error(400, `${investmentToken} investment is currently unavailable`));
    }
    const minimumInvestmentAmount = minimumInvestmentAmountForToken(investmentToken, investmentConfig);
    const exitMultiple = exitMultipleForToken(investmentToken, investmentConfig);
    const mixedUsdtPercent = mixedPercentForToken(investmentToken, investmentConfig.mixed_usdt_percent);
    const amountRaw = BigInt(parseAssetAmount(amountText, INVESTMENT_DECIMALS));
    const minimumRaw = BigInt(parseAssetAmount(String(minimumInvestmentAmount), INVESTMENT_DECIMALS));
    const wholeRaw = BigInt(parseAssetAmount(String(investmentConfig.whole_vehicle_tier), INVESTMENT_DECIMALS));
    if (amountRaw <= 0n) return res.send(ApiResult.error(400, 'Payment amount must be greater than zero'));
    if (minimumRaw <= 0n) return res.send(ApiResult.error(400, 'Invalid minimum investment configuration'));
    if (amountRaw < minimumRaw) return res.send(ApiResult.error(400, `The minimum investment amount is ${minimumInvestmentAmount} U`));
    if (amountRaw !== wholeRaw && amountRaw % minimumRaw !== 0n) {
      return res.send(ApiResult.error(400, 'The investment amount must be an integer multiple of the minimum investment amount'));
    }
    const debitItems = [];
    for (const item of splitInvestmentAmount(amountRaw, investmentToken, mixedUsdtPercent)) {
      const token = await AssetToken.getTokenItem(item.token);
      if (!token) return res.send(ApiResult.error(400, `${item.token} asset is not configured`));
      const assetDecimals = Number(token.decimals ?? AssetToken.DEFAULT_DECIMALS);
      debitItems.push({
        token: item.token,
        amountRaw: item.amountRaw,
        assetDecimals,
        debitRaw: scaleRaw(item.amountRaw, INVESTMENT_DECIMALS, assetDecimals)
      });
    }
    const rewardToken = await AssetToken.getTokenItem(TOKEN);
    const rewardAssetDecimals = Number(rewardToken?.decimals ?? AssetToken.DEFAULT_DECIMALS);
    const nowDate = new Date();
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nowDate);
    const waitingUntil = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', addDays(nowDate, investmentConfig.waiting_period_days));
    const nextDividendAt = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', addDays(nowDate, Number(investmentConfig.waiting_period_days) + Number(investmentConfig.dividend_cycle_days)));
    const newOrderId = orderId();
    let createdId = 0;
    const usdtRaw = debitItems.find(item => item.token === TOKEN)?.amountRaw ?? 0n;
    const requiresAgreement = !options.wallet && usdtRaw >= AGREEMENT_THRESHOLD;
    const agreementId = String(req.body?.agreement_id || '').trim();
    let signature;
    if (requiresAgreement) {
      if (!agreementId || !Array.isArray(req.body?.agreement_consents) || req.body.agreement_consents.length !== 4
        || !req.body.agreement_consents.every(value => value === true || value === 'true')) {
        return res.send(ApiResult.error(409, 'Please read and sign the investment agreement', { agreement_required: true }));
      }
      try { signature = validateAgreementSignature(req.body?.agreement_signature); }
      catch (error) { return res.send(ApiResult.error(400, error.message)); }
      await ensureInvestmentAgreementTable();
    }

    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      let agreementSnapshot;
      if (requiresAgreement) {
        const rows = await DB.query(configName, connection).exec(
          `SELECT * FROM ${prefix}investment_agreement WHERE agreement_id=? AND wallet=? LIMIT 1 FOR UPDATE`, [agreementId, wallet]
        );
        const draft = rows?.[0];
        if (!draft) throw new Error('Investment agreement not found');
        const snapshot = JSON.parse(draft.snapshot);
        agreementSnapshot = snapshot;
        if (snapshot.amount_raw !== amountRaw.toString() || snapshot.token !== investmentToken || snapshot.usdt_raw !== usdtRaw.toString()) {
          throw new Error('Investment details changed. Please confirm a new agreement');
        }
        if (draft.order_id) {
          const existing = await DB.query(configName, connection).table('investment_order').where('order_id', draft.order_id).where('wallet', wallet).first();
          if (!existing) throw new Error('Investment order not found');
          createdId = existing.id;
          return;
        }
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowDate);
        if (snapshot.start_date !== today) throw new Error('Investment agreement expired. Please confirm a new agreement');
      }
      for (const debit of options.deductWallet === false ? [] : debitItems) {
        const assetRows = await DB.query(configName, connection).exec(
          `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`, [wallet, debit.token]
        );
        const asset = assetRows?.[0];
        if (!asset) throw new Error(`${debit.token} asset account not found`);
        const before = BigInt(String(asset.balance || '0'));
        if (before < debit.debitRaw) throw new Error(`Insufficient ${debit.token} balance`);
        const after = before - debit.debitRaw;
        await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({ balance: after.toString(), updated_at: now });
        await DB.query(configName, connection).table('wallet_assets_logs').insert({
          biz_id: newOrderId, wallet, token: debit.token, balance: debit.debitRaw.toString(),
          before_balance: before.toString(), after_balance: after.toString(), scene: 'investment',
          reason: `${investmentToken === MIXED_TOKEN ? 'mix ' : ''}Investment order ${newOrderId}`, type: 'out', created_at: now, updated_at: now
        });
      }
      const performanceRaw = debitItems.find(item => item.token === TOKEN)?.amountRaw ?? 0n;
      const investsAfter = await updateInvestmentTotals(configName, connection, prefix, wallet, amountRaw, performanceRaw, levelRules);
      await distributeExpansionRewards(
        configName,
        connection,
        prefix,
        wallet,
        amountRaw,
        rewardAssetDecimals,
        levelRules,
        newOrderId,
        now
      );
      if (investsAfter >= wholeRaw) {
        await DB.query(configName, connection).table('investment_order')
          .whereRaw('LOWER(wallet)=?', [wallet]).whereIn('status', [0, 1])
          .update({ guaranteed_eligible: 1, updated_at: now });
      }
      const result = { insertId: 0 };
      await DB.query(configName, connection).table('investment_order').insert({
        order_id: newOrderId, wallet, token: investmentToken, amount: amountRaw.toString(),
        mixed_usdt_percent: mixedUsdtPercent,
        waiting_days: investmentConfig.waiting_period_days, cycle_days: investmentConfig.dividend_cycle_days,
        min_percent: investmentConfig.min_percent, max_percent: investmentConfig.max_percent,
        dividend_multiple: investmentConfig.dividend_multiple,
        dividend_min_percent: investmentConfig.dividend_min_percent,
        dividend_max_percent: investmentConfig.dividend_max_percent,
        exit_multiple: exitMultiple,
        guaranteed_percent: investmentConfig.guaranteed_dividend_percent,
        guaranteed_eligible: investsAfter >= wholeRaw ? 1 : 0,
        whole_vehicle: amountRaw >= wholeRaw ? 1 : 0,
        is_gift: options.deductWallet === false ? 1 : 0,
        status: Number(investmentConfig.waiting_period_days) > 0 ? 0 : 1,
        waiting_until: waitingUntil, next_dividend_at: nextDividendAt, created_at: now, updated_at: now
      }, result);
      createdId = result.insertId;
      if (requiresAgreement) {
        await DB.query(configName, connection).table('investment_agreement').where('agreement_id', agreementId).where('wallet', wallet).update({
          order_id: newOrderId, signature, signed_at: agreementDateTime(nowDate),
          snapshot: JSON.stringify({ ...agreementSnapshot, status: 'signed', signed_at: agreementDateTime(nowDate), consents: [true, true, true, true], signer_wallet: wallet,
            content_sha256: createHash('sha256').update(agreementSnapshot.content).digest('hex'),
            signature_sha256: createHash('sha256').update(signature).digest('hex') })
        });
      }
    });

    const row = await DB.query().table('investment_order').where('id', createdId).first();
    return res.send(ApiResult.success(publicOrder(row), 'Investment created successfully'));
  } catch (error) {
    const message = toDappApiMessage(error, 'Investment failed');
    if (/Insufficient|asset account not found|account is unavailable|asset amount|agreement|Investment details changed/iu.test(message)) return res.send(ApiResult.error(400, message));
    return res.send(ApiResult.exception(toDappApiError(error, 'Investment failed'), 'InvestmentService.create'));
  }
}

async function list(req, res) {
  try {
    await Promise.all([ensureInvestmentOrderTable(), ensureInvestmentAgreementTable()]);
    const wallet = address(req.auth?.address());
    await activateMatureOrders(wallet);
    const rows = await DB.query().table('investment_order').whereRaw('LOWER(wallet)=?', [wallet]).orderBy('id', 'desc').take(100).get();
    const agreementRows = rows?.length ? await DB.query().table('investment_agreement')
      .select(['order_id', 'agreement_id']).where('wallet', wallet)
      .whereIn('order_id', rows.map(row => row.order_id)).whereRaw('signed_at IS NOT NULL').get() : [];
    const agreementIds = new Map((agreementRows || []).map(row => [row.order_id, row.agreement_id]));
    const items = (rows || []).map(row => ({ ...publicOrder(row),
      has_agreement: agreementIds.has(row.order_id), agreement_id: agreementIds.get(row.order_id) || ''
    }));
    const principal = (rows || []).filter(row => [0, 1].includes(Number(row.status || 0)))
      .reduce((sum, row) => sum + BigInt(String(row.amount || 0)), 0n);
    const distributed = (rows || []).reduce((sum, row) => sum + BigInt(String(row.distributed_amount || 0)), 0n);
    const now = new Date();
    const monthStart = Helper.dateFormat('YYYY-mm-01 00:00:00', now);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nextMonth);
    const monthlyRows = await DB.query().exec(
      `SELECT COALESCE(SUM(amount), 0) AS amount FROM ${Database.prefix('default') || ''}investment_dividend
       WHERE LOWER(wallet)=? AND created_at>=? AND created_at<?`,
      [wallet, monthStart, monthEnd]
    );
    const monthlyDividend = String(monthlyRows?.[0]?.amount || '0');
    return res.send(ApiResult.success({
      items,
      principal: formatAssetAmount(principal.toString(), INVESTMENT_DECIMALS),
      total_dividend: formatAssetAmount(distributed.toString(), INVESTMENT_DECIMALS),
      monthly_dividend: formatAssetAmount(monthlyDividend, INVESTMENT_DECIMALS)
    }, 'Investment orders retrieved successfully'));
  } catch (error) { return res.send(ApiResult.exception(toDappApiError(error), 'InvestmentService.list')); }
}

async function detail(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const wallet = address(req.auth?.address());
    await activateMatureOrders(wallet);
    const orderId = String(req.body?.order_id ?? req.query?.order_id ?? '');
    const order = await DB.query().table('investment_order')
      .where('order_id', orderId).whereRaw('LOWER(wallet)=?', [wallet]).first();
    if (!order) return res.send(ApiResult.error(404, 'Investment order not found'));
    return res.send(ApiResult.success(publicOrder(order)));
  } catch (error) { return res.send(ApiResult.exception(toDappApiError(error), 'InvestmentService.detail')); }
}

async function dividends(req, res) {
  try {
    await ensureAssetTransferTables();
    const wallet = address(req.auth?.address());
    if (!isWallet(wallet)) return res.send(ApiResult.error(400, 'Invalid wallet address'));

    const now = new Date();
    const monthStart = Helper.dateFormat('YYYY-mm-01 00:00:00', now);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nextMonth);
    const prefix = Database.prefix('default') || '';
    const [summaryRows, rows] = await Promise.all([
      DB.query().exec(
        `SELECT COALESCE(SUM(balance), 0) AS total_dividend,
                COALESCE(SUM(CASE WHEN created_at>=? AND created_at<? THEN balance ELSE 0 END), 0) AS monthly_dividend
         FROM ${prefix}wallet_assets_logs
         WHERE LOWER(wallet)=?
           AND token=?
           AND type='in'
           AND scene IN (?, ?, ?, ?)`,
        [monthStart, monthEnd, wallet, TOKEN, ...DIVIDEND_RECORD_SCENES]
      ),
      DB.query().table('wallet_assets_logs')
        .whereRaw('LOWER(wallet)=?', [wallet])
        .where('token', TOKEN)
        .where('type', 'in')
        .whereIn('scene', DIVIDEND_RECORD_SCENES)
        .orderBy('id', 'desc')
        .take(100)
        .get()
    ]);
    const summary = summaryRows?.[0] || {};
    return res.send(ApiResult.success({
      total_dividend: formatAssetAmount(summary.total_dividend || '0', INVESTMENT_DECIMALS),
      monthly_dividend: formatAssetAmount(summary.monthly_dividend || '0', INVESTMENT_DECIMALS),
      items: await Promise.all((rows || []).map(publicDividendLog))
    }, 'Dividend records retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'InvestmentService.dividends'));
  }
}

export default { create, list, detail, dividends, prepareAgreement, agreements, agreement };
