import { randomInt } from 'node:crypto';
import AssetToken from '../Util/AssetToken.js';
import CacheData from '../Util/CacheData.js';
import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import Helper from '../Util/Helper.js';
import { ensureAssetTransferTables } from '../Util/AssetTransferSchema.js';
import { ensureInvestmentOrderTable } from '../Util/InvestmentSchema.js';

const INVESTMENT_DECIMALS = 18;
const PERCENT_DECIMALS = 4;
const MULTIPLE_DECIMALS = 8;
const PERCENT_DENOMINATOR = 100n * (10n ** BigInt(PERCENT_DECIMALS));
const MULTIPLE_DENOMINATOR = 10n ** BigInt(MULTIPLE_DECIMALS);
const BATCH_SIZE = 100;

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

export function calculateDividendPayout(order, selectPercent = randomPercent) {
  const amount = BigInt(String(order.amount || '0'));
  const totalDividend = BigInt(String(order.total_dividend || '0'));
  const dividendMultiple = scaledDecimal(order.dividend_multiple || '1', MULTIPLE_DECIMALS);
  const exitMultiple = scaledDecimal(order.exit_multiple || '1', MULTIPLE_DECIMALS);
  const threshold = amount * dividendMultiple / MULTIPLE_DENOMINATOR;
  const exitTarget = amount * exitMultiple / MULTIPLE_DENOMINATOR;
  const useLaterRule = totalDividend >= threshold;
  const configuredMinPercent = scaledDecimal(
    useLaterRule ? order.dividend_min_percent : order.min_percent,
    PERCENT_DECIMALS
  );
  const configuredMaxPercent = scaledDecimal(
    useLaterRule ? order.dividend_max_percent : order.max_percent,
    PERCENT_DECIMALS
  );
  const minPercent = configuredMinPercent <= configuredMaxPercent ? configuredMinPercent : configuredMaxPercent;
  const maxPercent = configuredMaxPercent >= configuredMinPercent ? configuredMaxPercent : configuredMinPercent;
  let percent = selectPercent(minPercent, maxPercent);
  const guaranteed = scaledDecimal(order.guaranteed_percent, PERCENT_DECIMALS);
  const guaranteedFloor = guaranteed < maxPercent ? guaranteed : maxPercent;
  if (Number(order.guaranteed_eligible || 0) === 1 && percent < guaranteedFloor) percent = guaranteedFloor;

  const remaining = exitTarget > totalDividend ? exitTarget - totalDividend : 0n;
  let payout = amount * percent / PERCENT_DENOMINATOR;
  if (payout > remaining) payout = remaining;
  return {
    payout,
    percent,
    totalAfter: totalDividend + payout,
    exitTarget,
    exited: remaining === 0n || totalDividend + payout >= exitTarget
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
    recipientsByLevel.set(level, {
      wallet: String(ancestor.wallet || ancestor.inviter || '').trim().toLowerCase(),
      level
    });
  }

  let lowerLevelPercentTotal = 0n;
  const rewards = [];
  for (const recipient of [...recipientsByLevel.values()].sort((a, b) => a.level - b.level)) {
    const configuredPercent = rulesByLevel.get(recipient.level) || 0n;
    const rewardPercent = configuredPercent > lowerLevelPercentTotal
      ? configuredPercent - lowerLevelPercentTotal
      : 0n;
    lowerLevelPercentTotal += configuredPercent;
    if (recipient.wallet && rewardPercent > 0n) rewards.push({ ...recipient, percent: rewardPercent });
  }
  return rewards;
}

async function distributeDifferentialRewards(configName, connection, prefix, order, payout, tokenDecimals, levelRules, dividendId, now) {
  if (payout <= 0n) return;
  const ancestors = await DB.query(configName, connection).exec(
    `SELECT relation.inviter AS wallet,
            relation.lv,
            member.level,
            member.manual_level,
            member.is_manual_level
     FROM ${prefix}wallet_relation AS relation
     INNER JOIN ${prefix}wallet AS member
       ON LOWER(member.wallet)=LOWER(relation.inviter)
     WHERE LOWER(relation.wallet)=?
     ORDER BY relation.lv ASC`,
    [String(order.wallet || '').toLowerCase()]
  );
  const rewards = calculateDifferentialRewardRates(ancestors, levelRules);
  for (const reward of rewards) {
    const investmentReward = payout * reward.percent / PERCENT_DENOMINATOR;
    const assetReward = scaleRaw(investmentReward, INVESTMENT_DECIMALS, tokenDecimals);
    if (assetReward <= 0n) continue;
    const assetRows = await DB.query(configName, connection).exec(
      `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
      [reward.wallet, order.token || 'USDT']
    );
    const asset = assetRows?.[0];
    if (!asset) throw new Error(`极差收益资产账户不存在: ${reward.wallet} ${order.token || 'USDT'}`);
    const before = BigInt(String(asset.balance || '0'));
    const after = before + assetReward;
    await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
      balance: after.toString(), updated_at: now
    });
    await DB.query(configName, connection).table('wallet_assets_logs').insert({
      biz_id: `${dividendId}L${reward.level}`,
      wallet: reward.wallet,
      token: order.token || 'USDT',
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

async function processOrder(candidate, tokenDecimals, levelRules) {
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
      if (!order || Number(order.status || 0) !== 1 || !order.next_dividend_at) return;
      const cycleDate = asDate(order.next_dividend_at);
      if (!Number.isFinite(cycleDate.getTime()) || cycleDate.getTime() > nowDate.getTime()) return;

      const cycleAt = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', cycleDate);
      const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nowDate);
      const dividendId = `D${order.order_id}${Helper.dateFormat('YYYYmmddHHMMSS', cycleDate)}`;
      const calculation = calculateDividendPayout(order);
      const assetPayout = scaleRaw(calculation.payout, INVESTMENT_DECIMALS, tokenDecimals);
      const payout = scaleRaw(assetPayout, tokenDecimals, INVESTMENT_DECIMALS);
      const previousTotal = BigInt(String(order.total_dividend || '0'));
      const totalAfter = previousTotal + payout;
      const exited = totalAfter >= calculation.exitTarget;

      await DB.query(configName, connection).table('investment_dividend').insert({
        dividend_id: dividendId,
        order_id: order.order_id,
        wallet: String(order.wallet || '').toLowerCase(),
        token: order.token || 'USDT',
        cycle_at: cycleAt,
        percent: (Number(calculation.percent) / (10 ** PERCENT_DECIMALS)).toFixed(PERCENT_DECIMALS),
        amount: payout.toString(),
        created_at: now,
        updated_at: now
      });

      if (assetPayout > 0n) {
        const assetRows = await DB.query(configName, connection).exec(
          `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
          [String(order.wallet || '').toLowerCase(), order.token || 'USDT']
        );
        const asset = assetRows?.[0];
        if (!asset) throw new Error(`分红资产账户不存在: ${order.wallet} ${order.token || 'USDT'}`);
        const before = BigInt(String(asset.balance || '0'));
        const after = before + assetPayout;
        await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
          balance: after.toString(), updated_at: now
        });
        await DB.query(configName, connection).table('wallet_assets_logs').insert({
          biz_id: dividendId,
          wallet: String(order.wallet || '').toLowerCase(),
          token: order.token || 'USDT',
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
  await Promise.all([ensureAssetTransferTables(), ensureInvestmentOrderTable()]);
  const levelRules = await CacheData.getWalletLevelRules();
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
  await DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now])
    .update({ status: 1, updated_at: now });
  const orders = await DB.query().table('investment_order').where('status', 1)
    .whereRaw('next_dividend_at IS NOT NULL AND next_dividend_at<=?', [now])
    .orderBy('next_dividend_at', 'asc').take(BATCH_SIZE).get();
  const decimals = new Map();
  let processed = 0;
  for (const order of orders || []) {
    const token = String(order.token || 'USDT').toUpperCase();
    if (!decimals.has(token)) {
      const item = await AssetToken.getTokenItem(token);
      decimals.set(token, Number(item?.decimals ?? AssetToken.DEFAULT_DECIMALS));
    }
    if (await processOrder(order, decimals.get(token), levelRules)) processed += 1;
  }
  if (processed > 0) console.log(`[InvestmentDividend] processed=${processed}`);
  return { matched: (orders || []).length, processed };
}

export default { distribute };
