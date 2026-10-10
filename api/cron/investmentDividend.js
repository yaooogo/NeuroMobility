import { randomInt } from 'node:crypto';
import AssetToken from '../Util/AssetToken.js';
import CacheData from '../Util/CacheData.js';
import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import Helper from '../Util/Helper.js';
import { ensureAssetTransferTables } from '../Util/AssetTransferSchema.js';
import { ensureInvestmentOrderTable } from '../Util/InvestmentSchema.js';
import { ensureTeamInvestmentConfigTable } from '../Util/TeamInvestmentConfigSchema.js';
import growthSnapshot from './growthSnapshot.js';

const INVESTMENT_DECIMALS = 18;
const PERCENT_DECIMALS = 4;
const DIVIDEND_PERCENT_DECIMALS = 1;
const MULTIPLE_DECIMALS = 8;
const PERCENT_DENOMINATOR = 100n * (10n ** BigInt(PERCENT_DECIMALS));
const DIVIDEND_PERCENT_DENOMINATOR = 100n * (10n ** BigInt(DIVIDEND_PERCENT_DECIMALS));
const MULTIPLE_DENOMINATOR = 10n ** BigInt(MULTIPLE_DECIMALS);
const BATCH_SIZE = 100;
const DIVIDEND_TOKEN = 'USDT';

function scaledDecimal(value, decimals) {
  const text = String(value ?? '0').trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text)) return 0n;
  const [integer, fraction = ''] = text.split('.');
  return BigInt(`${integer}${fraction.slice(0, decimals).padEnd(decimals, '0')}`);
}

function randomPercent(min, max) {
  const minimum = Number(min);
  const maximum = Number(max);
  if (minimum >= maximum) return BigInt(minimum);
  return BigInt(randomInt(minimum, maximum + 1));
}

function scaleRaw(value, fromDecimals, toDecimals) {
  const raw = BigInt(value);
  if (fromDecimals === toDecimals) return raw;
  const factor = 10n ** BigInt(Math.abs(toDecimals - fromDecimals));
  return toDecimals > fromDecimals ? raw * factor : raw / factor;
}

function addDays(value, days) {
  return new Date(value.getTime() + Math.max(Number(days || 1), 1) * 86400000);
}

function asDate(value) {
  if (value instanceof Date) return value;
  return new Date(String(value || '').replace(' ', 'T'));
}

function dividendRuleValue(rule, key, fallback) {
  if (!rule || !Object.prototype.hasOwnProperty.call(rule, key)) return fallback;
  const value = rule[key];
  return value === null || typeof value === 'undefined' || String(value).trim() === '' ? fallback : value;
}

function exitMultipleForOrder(order, investmentConfig) {
  const token = String(order?.token || 'USDT').trim().toUpperCase();
  if (token === 'RUSD') return investmentConfig.rusdt_exit_multiple;
  if (token === 'USDT+RUSD') return investmentConfig.mixed_exit_multiple;
  return investmentConfig.usdt_exit_multiple ?? investmentConfig.exit_multiple;
}

function dividendRuleForOrder(order, investmentConfig, teamDividendRule = null) {
  return {
    min_percent: investmentConfig.min_percent,
    max_percent: investmentConfig.max_percent,
    dividend_multiple: investmentConfig.dividend_multiple,
    dividend_min_percent: investmentConfig.dividend_min_percent,
    dividend_max_percent: investmentConfig.dividend_max_percent,
    guaranteed_percent: investmentConfig.guaranteed_dividend_percent,
    exit_multiple: exitMultipleForOrder(order, investmentConfig),
    ...(teamDividendRule || {})
  };
}

export function calculateDividendPayout(order, ruleOrSelectPercent = null, selectPercentOverride = null) {
  const rule = typeof ruleOrSelectPercent === 'function' ? null : ruleOrSelectPercent;
  const selectPercent = typeof ruleOrSelectPercent === 'function'
    ? ruleOrSelectPercent
    : (selectPercentOverride || randomPercent);
  const amount = BigInt(String(order.amount || '0'));
  const totalDividend = BigInt(String(order.total_dividend || '0'));
  const dividendMultiple = scaledDecimal(dividendRuleValue(rule, 'dividend_multiple', order.dividend_multiple || '1'), MULTIPLE_DECIMALS);
  const exitMultiple = scaledDecimal(dividendRuleValue(rule, 'exit_multiple', order.exit_multiple || '1'), MULTIPLE_DECIMALS);
  const threshold = amount * dividendMultiple / MULTIPLE_DENOMINATOR;
  const exitTarget = amount * exitMultiple / MULTIPLE_DENOMINATOR;
  const useLaterRule = totalDividend >= threshold;
  const configuredMinPercent = scaledDecimal(
    useLaterRule
      ? dividendRuleValue(rule, 'dividend_min_percent', order.dividend_min_percent)
      : dividendRuleValue(rule, 'min_percent', order.min_percent),
    DIVIDEND_PERCENT_DECIMALS
  );
  const configuredMaxPercent = scaledDecimal(
    useLaterRule
      ? dividendRuleValue(rule, 'dividend_max_percent', order.dividend_max_percent)
      : dividendRuleValue(rule, 'max_percent', order.max_percent),
    DIVIDEND_PERCENT_DECIMALS
  );
  const minPercent = configuredMinPercent <= configuredMaxPercent ? configuredMinPercent : configuredMaxPercent;
  const maxPercent = configuredMaxPercent >= configuredMinPercent ? configuredMaxPercent : configuredMinPercent;
  let percent = selectPercent(minPercent, maxPercent);
  const guaranteed = scaledDecimal(dividendRuleValue(rule, 'guaranteed_percent', order.guaranteed_percent), DIVIDEND_PERCENT_DECIMALS);
  const guaranteedFloor = guaranteed < maxPercent ? guaranteed : maxPercent;
  if (Number(order.guaranteed_eligible || 0) === 1 && percent < guaranteedFloor) percent = guaranteedFloor;

  const remaining = exitTarget > totalDividend ? exitTarget - totalDividend : 0n;
  let payout = amount * percent / DIVIDEND_PERCENT_DENOMINATOR;
  if (payout > remaining) payout = remaining;
  return {
    payout,
    percent,
    totalAfter: totalDividend + payout,
    exitTarget,
    exited: remaining === 0n || totalDividend + payout >= exitTarget
  };
}

async function teamDividendRuleForWallet(configName, connection, prefix, wallet) {
  const rows = await DB.query(configName, connection).exec(
    `SELECT config.min_percent,
            config.max_percent,
            config.dividend_multiple,
            config.dividend_min_percent,
            config.dividend_max_percent,
            config.guaranteed_percent
     FROM ${prefix}team_investment_config AS config
     WHERE config.status=1
       AND (
         LOWER(config.wallet)=?
         OR LOWER(config.wallet)=(
           SELECT LOWER(relation.inviter)
           FROM ${prefix}wallet_relation AS relation
           WHERE LOWER(relation.wallet)=?
             AND relation.lv=1
           LIMIT 1
         )
       )
     ORDER BY CASE WHEN LOWER(config.wallet)=? THEN 0 ELSE 1 END
     LIMIT 1`,
    [
      String(wallet || '').toLowerCase(),
      String(wallet || '').toLowerCase(),
      String(wallet || '').toLowerCase()
    ]
  );
  const config = rows?.[0];
  if (!config) return null;
  return {
    min_percent: config.min_percent,
    max_percent: config.max_percent,
    dividend_multiple: config.dividend_multiple,
    dividend_min_percent: config.dividend_min_percent,
    dividend_max_percent: config.dividend_max_percent,
    guaranteed_percent: config.guaranteed_percent
  };
}

export function calculateDifferentialRewardRates(ancestors, levelRules) {
  const rulesByLevel = new Map((levelRules || []).map(rule => [
    Number(rule.level || 0),
    scaledDecimal(rule.differential_percent || '0', PERCENT_DECIMALS)
  ]));
  const recipientsByLevel = new Map();
  for (const ancestor of ancestors || []) {
    const level = Number(ancestor.is_manual_level) === 1
      ? Number(ancestor.manual_level || 0)
      : Number(ancestor.level || 0);
    if (!rulesByLevel.has(level) || recipientsByLevel.has(level)) continue;
    const growthPercent = scaledDecimal(ancestor.growth_percent || '0', PERCENT_DECIMALS);
    recipientsByLevel.set(level, {
      wallet: String(ancestor.wallet || ancestor.inviter || '').trim().toLowerCase(),
      level,
      effectivePercent: (rulesByLevel.get(level) || 0n) + growthPercent
    });
  }

  let lowerEffectivePercent = 0n;
  const rewards = [];
  for (const recipient of [...recipientsByLevel.values()].sort((a, b) => a.level - b.level)) {
    const rewardPercent = recipient.effectivePercent > lowerEffectivePercent
      ? recipient.effectivePercent - lowerEffectivePercent
      : 0n;
    if (recipient.effectivePercent > lowerEffectivePercent) lowerEffectivePercent = recipient.effectivePercent;
    if (recipient.wallet) rewards.push({ wallet: recipient.wallet, level: recipient.level, percent: rewardPercent });
  }
  return rewards;
}

export function calculateGrossRewardAmount(payout, rewardPercent) {
  return BigInt(payout) * BigInt(rewardPercent) / PERCENT_DENOMINATOR;
}

async function distributeDifferentialRewards(configName, connection, prefix, order, payout, tokenDecimals, levelRules, dividendId, now) {
  if (payout <= 0n) return;
  const snapshotMonth = String(now || '').slice(0, 7);
  const ancestors = await DB.query(configName, connection).exec(
    `SELECT relation.inviter AS wallet,
            relation.lv,
            member.level,
            member.manual_level,
            member.is_manual_level,
            COALESCE(growth.growth_percent, 0) AS growth_percent
     FROM ${prefix}wallet_relation AS relation
     INNER JOIN ${prefix}wallet AS member
       ON LOWER(member.wallet)=LOWER(relation.inviter)
     LEFT JOIN ${prefix}wallet_growth_snapshot AS growth
       ON growth.wallet=LOWER(relation.inviter)
      AND growth.snapshot_month=?
     WHERE LOWER(relation.wallet)=?
     ORDER BY relation.lv ASC`,
    [snapshotMonth, String(order.wallet || '').toLowerCase()]
  );
  const rewards = calculateDifferentialRewardRates(ancestors, levelRules);
  for (const reward of rewards) {
    const investmentReward = calculateGrossRewardAmount(payout, reward.percent);
    const assetReward = scaleRaw(investmentReward, INVESTMENT_DECIMALS, tokenDecimals);
    if (assetReward <= 0n) continue;
    const assetRows = await DB.query(configName, connection).exec(
      `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
      [reward.wallet, DIVIDEND_TOKEN]
    );
    const asset = assetRows?.[0];
    if (!asset) throw new Error(`毛利分成资产账户不存在: ${reward.wallet} ${DIVIDEND_TOKEN}`);
    const before = BigInt(String(asset.balance || '0'));
    const after = before + assetReward;
    await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
      balance: after.toString(), updated_at: now
    });
    await DB.query(configName, connection).table('wallet_assets_logs').insert({
      biz_id: `${dividendId}L${reward.level}`,
      wallet: reward.wallet,
      token: DIVIDEND_TOKEN,
      balance: assetReward.toString(),
      before_balance: before.toString(),
      after_balance: after.toString(),
      scene: 'investment_differential_income',
      reason: `Investment differential income ${order.order_id} level ${reward.level}`,
      type: 'in',
      created_at: now,
      updated_at: now
    });
  }
}

async function processOrder(candidate, tokenDecimals, levelRules, investmentConfig, options = {}) {
  let paid = false;
  try {
    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      const rows = await DB.query(configName, connection).exec(
        `SELECT * FROM ${prefix}investment_order WHERE id=? LIMIT 1 FOR UPDATE`,
        [candidate.id]
      );
      const order = rows?.[0];
      const nowDate = new Date();
      const status = Number(order?.status || 0);
      if (!order || (!options.force && status !== 1) || (options.force && ![0, 1].includes(status)) || !order.next_dividend_at) return;
      const scheduledCycleDate = asDate(order.next_dividend_at);
      if (!Number.isFinite(scheduledCycleDate.getTime())) return;
      if (!options.force && scheduledCycleDate.getTime() > nowDate.getTime()) return;
      const cycleDate = options.force ? nowDate : scheduledCycleDate;

      const cycleAt = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', cycleDate);
      const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nowDate);
      const dividendId = `D${order.order_id}${Helper.dateFormat('YYYYmmddHHMMSS', cycleDate)}`;
      const teamDividendRule = await teamDividendRuleForWallet(configName, connection, prefix, order.wallet);
      const calculation = calculateDividendPayout(order, dividendRuleForOrder(order, investmentConfig, teamDividendRule));
      const assetPayout = scaleRaw(calculation.payout, INVESTMENT_DECIMALS, tokenDecimals);
      const payout = scaleRaw(assetPayout, tokenDecimals, INVESTMENT_DECIMALS);
      const previousTotal = BigInt(String(order.total_dividend || '0'));
      const totalAfter = previousTotal + payout;
      const exited = totalAfter >= calculation.exitTarget;

      await DB.query(configName, connection).table('investment_dividend').insert({
        dividend_id: dividendId,
        order_id: order.order_id,
        wallet: String(order.wallet || '').toLowerCase(),
        token: DIVIDEND_TOKEN,
        cycle_at: cycleAt,
        percent: (Number(calculation.percent) / (10 ** DIVIDEND_PERCENT_DECIMALS)).toFixed(DIVIDEND_PERCENT_DECIMALS),
        amount: payout.toString(),
        created_at: now,
        updated_at: now
      });

      if (assetPayout > 0n) {
        const assetRows = await DB.query(configName, connection).exec(
          `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
          [String(order.wallet || '').toLowerCase(), DIVIDEND_TOKEN]
        );
        const asset = assetRows?.[0];
        if (!asset) throw new Error(`分红资产账户不存在: ${order.wallet} ${DIVIDEND_TOKEN}`);
        const before = BigInt(String(asset.balance || '0'));
        const after = before + assetPayout;
        await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
          balance: after.toString(), updated_at: now
        });
        await DB.query(configName, connection).table('wallet_assets_logs').insert({
          biz_id: dividendId,
          wallet: String(order.wallet || '').toLowerCase(),
          token: DIVIDEND_TOKEN,
          balance: assetPayout.toString(),
          before_balance: before.toString(),
          after_balance: after.toString(),
          scene: 'investment_dividend',
          reason: `Investment dividend ${order.order_id}`,
          type: 'in',
          created_at: now,
          updated_at: now
        });
      }

      await distributeDifferentialRewards(
        configName,
        connection,
        prefix,
        order,
        payout,
        tokenDecimals,
        levelRules,
        dividendId,
        now
      );

      await DB.query(configName, connection).table('investment_order').where('id', order.id).update({
        distributed_amount: (BigInt(String(order.distributed_amount || '0')) + payout).toString(),
        total_dividend: totalAfter.toString(),
        status: exited ? 2 : 1,
        next_dividend_at: exited
          ? null
          : Helper.dateFormat('YYYY-mm-dd HH:MM:SS', addDays(cycleDate, order.cycle_days)),
        updated_at: now
      });
      if (exited) {
        const wallet = String(order.wallet || '').toLowerCase();
        await DB.query(configName, connection).exec(
          `UPDATE ${prefix}wallet AS member
           SET member.level_isupdate=1,
               member.updated_at=?
           WHERE LOWER(member.wallet)=?
              OR EXISTS (
                SELECT 1
                FROM ${prefix}wallet_relation AS relation
                WHERE LOWER(relation.wallet)=?
                  AND LOWER(relation.inviter)=LOWER(member.wallet)
              )`,
          [now, wallet, wallet]
        );
      }
      paid = true;
    });
  } catch (error) {
    if (error?.code !== 'ER_DUP_ENTRY') throw error;
  }
  return paid;
}

async function distribute() {
  await growthSnapshot.capture();
  await Promise.all([ensureAssetTransferTables(), ensureInvestmentOrderTable(), ensureTeamInvestmentConfigTable()]);
  const [levelRules, investmentConfig] = await Promise.all([
    CacheData.getWalletLevelRules(),
    CacheData.getInvestmentConfig()
  ]);
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
  await DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now])
    .update({ status: 1, updated_at: now });
  const orders = await DB.query().table('investment_order').where('status', 1)
    .whereRaw('next_dividend_at IS NOT NULL AND next_dividend_at<=?', [now])
    .orderBy('next_dividend_at', 'asc').take(BATCH_SIZE).get();
  const decimals = new Map();
  let processed = 0;
  for (const order of orders || []) {
    if (!decimals.has(DIVIDEND_TOKEN)) {
      const item = await AssetToken.getTokenItem(DIVIDEND_TOKEN);
      decimals.set(DIVIDEND_TOKEN, Number(item?.decimals ?? AssetToken.DEFAULT_DECIMALS));
    }
    if (await processOrder(order, decimals.get(DIVIDEND_TOKEN), levelRules, investmentConfig)) processed += 1;
  }
  if (processed > 0) console.log(`[InvestmentDividend] processed=${processed}`);
  return { matched: (orders || []).length, processed };
}

export async function distributeOrderNow(orderId) {
  await growthSnapshot.capture();
  await Promise.all([ensureAssetTransferTables(), ensureInvestmentOrderTable(), ensureTeamInvestmentConfigTable()]);
  const order = await DB.query().table('investment_order').where('order_id', orderId).first();
  if (!order) return { status: 'not_found', processed: false };
  if (![0, 1].includes(Number(order.status || 0))) return { status: 'not_active', processed: false };

  const item = await AssetToken.getTokenItem(DIVIDEND_TOKEN);
  const tokenDecimals = Number(item?.decimals ?? AssetToken.DEFAULT_DECIMALS);
  const [levelRules, investmentConfig] = await Promise.all([
    CacheData.getWalletLevelRules(),
    CacheData.getInvestmentConfig()
  ]);
  const processed = await processOrder(order, tokenDecimals, levelRules, investmentConfig, { force: true });
  return { status: processed ? 'processed' : 'skipped', processed };
}

export default { distribute, distributeOrderNow };
