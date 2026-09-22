import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import CacheData from '../../Util/CacheData.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount, parseAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import { ensureInvestmentOrderTable } from '../../Util/InvestmentSchema.js';
import {
  LEVEL_REWARD_PERCENT_DENOMINATOR,
  calculateLevelRewardRates
} from '../../Util/LevelReward.js';

const TOKEN = 'USDT';
const INVESTMENT_DECIMALS = 18;

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

async function activateMatureOrders(wallet = '') {
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
  const query = DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now]);
  if (wallet) query.whereRaw('LOWER(wallet)=?', [wallet]);
  await query.update({ status: 1, updated_at: now });
}

function publicOrder(row) {
  return {
    id: Number(row.id || 0),
    order_id: row.order_id || '',
    amount: formatAssetAmount(row.amount || '0', INVESTMENT_DECIMALS),
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
    status: Number(row.status || 0),
    waiting_until: row.waiting_until || '',
    next_dividend_at: row.next_dividend_at || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function publicDividend(row) {
  return {
    id: Number(row.id || 0),
    dividend_id: row.dividend_id || '',
    order_id: row.order_id || '',
    token: row.token || TOKEN,
    amount: formatAssetAmount(row.amount || '0', INVESTMENT_DECIMALS),
    percent: Number(row.percent || 0),
    time: row.cycle_at || row.created_at || ''
  };
}

async function updateInvestmentTotals(configName, connection, prefix, wallet, amountRaw, levelRules) {
  const walletRows = await DB.query(configName, connection).exec(
    `SELECT * FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`, [wallet]
  );
  const lockedWallet = walletRows?.[0];
  if (!lockedWallet || Number(lockedWallet.status || 0) !== 1) throw new Error('当前账户不可用');
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
    const communityAfter = BigInt(String(member.community_invests || '0')) + amountRaw;
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
  const rewards = calculateLevelRewardRates(ancestors, levelRules, 'expansion_reward_percent');
  for (const reward of rewards) {
    const configuredReward = amountRaw * reward.percent / LEVEL_REWARD_PERCENT_DENOMINATOR;
    const assetReward = scaleRaw(configuredReward, INVESTMENT_DECIMALS, assetDecimals);
    if (assetReward <= 0n) continue;
    const assetRows = await DB.query(configName, connection).exec(
      `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
      [reward.wallet, TOKEN]
    );
    const asset = assetRows?.[0];
    if (!asset) throw new Error(`拓展奖励资产账户不存在: ${reward.wallet} ${TOKEN}`);
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
  try {
    await Promise.all([ensureAssetTransferTables(), ensureInvestmentOrderTable()]);
    const wallet = address(req.auth?.address());
    if (!isWallet(wallet)) return res.send(ApiResult.error(400, '钱包地址无效'));
    const [investmentConfig, levelRules] = await Promise.all([
      CacheData.getInvestmentConfig(),
      CacheData.getWalletLevelRules()
    ]);
    const amountText = String(req.body?.amount ?? '').trim();
    const amountRaw = BigInt(parseAssetAmount(amountText, INVESTMENT_DECIMALS));
    const minimumRaw = BigInt(parseAssetAmount(String(investmentConfig.minimum_investment_amount), INVESTMENT_DECIMALS));
    const wholeRaw = BigInt(parseAssetAmount(String(investmentConfig.whole_vehicle_tier), INVESTMENT_DECIMALS));
    if (amountRaw < minimumRaw) return res.send(ApiResult.error(400, `最低投资 ${investmentConfig.minimum_investment_amount} U`));
    if (amountRaw !== wholeRaw && amountRaw % minimumRaw !== 0n) {
      return res.send(ApiResult.error(400, '投资金额必须为最低投资金额的整数倍'));
    }
    const token = await AssetToken.getTokenItem(TOKEN);
    const assetDecimals = Number(token?.decimals ?? AssetToken.DEFAULT_DECIMALS);
    const debitRaw = BigInt(parseAssetAmount(amountText, assetDecimals));
    const nowDate = new Date();
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nowDate);
    const waitingUntil = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', addDays(nowDate, investmentConfig.waiting_period_days));
    const nextDividendAt = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', addDays(nowDate, Number(investmentConfig.waiting_period_days) + Number(investmentConfig.dividend_cycle_days)));
    const newOrderId = orderId();
    let createdId = 0;

    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      const assetRows = await DB.query(configName, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`, [wallet, TOKEN]
      );
      const asset = assetRows?.[0];
      if (!asset) throw new Error('USDT 资产不存在');
      const before = BigInt(String(asset.balance || '0'));
      if (before < debitRaw) throw new Error('USDT 余额不足');
      const after = before - debitRaw;
      await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({ balance: after.toString(), updated_at: now });
      await DB.query(configName, connection).table('wallet_assets_logs').insert({
        biz_id: newOrderId, wallet, token: TOKEN, balance: debitRaw.toString(),
        before_balance: before.toString(), after_balance: after.toString(), scene: 'investment',
        reason: `Investment order ${newOrderId}`, type: 'out', created_at: now, updated_at: now
      });
      const investsAfter = await updateInvestmentTotals(configName, connection, prefix, wallet, amountRaw, levelRules);
      await distributeExpansionRewards(
        configName,
        connection,
        prefix,
        wallet,
        amountRaw,
        assetDecimals,
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
        order_id: newOrderId, wallet, token: TOKEN, amount: amountRaw.toString(),
        waiting_days: investmentConfig.waiting_period_days, cycle_days: investmentConfig.dividend_cycle_days,
        min_percent: investmentConfig.min_percent, max_percent: investmentConfig.max_percent,
        dividend_multiple: investmentConfig.dividend_multiple,
        dividend_min_percent: investmentConfig.dividend_min_percent,
        dividend_max_percent: investmentConfig.dividend_max_percent,
        exit_multiple: investmentConfig.exit_multiple,
        guaranteed_percent: investmentConfig.guaranteed_dividend_percent,
        guaranteed_eligible: investsAfter >= wholeRaw ? 1 : 0,
        whole_vehicle: amountRaw >= wholeRaw ? 1 : 0,
        status: Number(investmentConfig.waiting_period_days) > 0 ? 0 : 1,
        waiting_until: waitingUntil, next_dividend_at: nextDividendAt, created_at: now, updated_at: now
      }, result);
      createdId = result.insertId;
    });

    const row = await DB.query().table('investment_order').where('id', createdId).first();
    return res.send(ApiResult.success(publicOrder(row), '投资成功'));
  } catch (error) {
    const message = error.message || '投资失败';
    if (/余额不足|资产不存在|账户不可用|金额/u.test(message)) return res.send(ApiResult.error(400, message));
    return res.send(ApiResult.exception(error, 'InvestmentService.create'));
  }
}

async function list(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const wallet = address(req.auth?.address());
    await activateMatureOrders(wallet);
    const rows = await DB.query().table('investment_order').whereRaw('LOWER(wallet)=?', [wallet]).orderBy('id', 'desc').take(100).get();
    const items = (rows || []).map(publicOrder);
    const principal = (rows || []).filter(row => Number(row.status || 0) !== 2)
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
    }, '获取投资订单成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentService.list')); }
}

async function detail(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const wallet = address(req.auth?.address());
    await activateMatureOrders(wallet);
    const order = await DB.query().table('investment_order')
      .where('order_id', String(req.query?.order_id || '')).whereRaw('LOWER(wallet)=?', [wallet]).first();
    if (!order) return res.send(ApiResult.error(404, '投资订单不存在'));
    return res.send(ApiResult.success(publicOrder(order)));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentService.detail')); }
}

async function dividends(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const wallet = address(req.auth?.address());
    if (!isWallet(wallet)) return res.send(ApiResult.error(400, '钱包地址无效'));

    const now = new Date();
    const monthStart = Helper.dateFormat('YYYY-mm-01 00:00:00', now);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', nextMonth);
    const prefix = Database.prefix('default') || '';
    const [summaryRows, rows] = await Promise.all([
      DB.query().exec(
        `SELECT COALESCE(SUM(amount), 0) AS total_dividend,
                COALESCE(SUM(CASE WHEN cycle_at>=? AND cycle_at<? THEN amount ELSE 0 END), 0) AS monthly_dividend
         FROM ${prefix}investment_dividend
         WHERE LOWER(wallet)=?`,
        [monthStart, monthEnd, wallet]
      ),
      DB.query().table('investment_dividend')
        .whereRaw('LOWER(wallet)=?', [wallet])
        .orderBy('id', 'desc')
        .take(100)
        .get()
    ]);
    const summary = summaryRows?.[0] || {};
    return res.send(ApiResult.success({
      total_dividend: formatAssetAmount(summary.total_dividend || '0', INVESTMENT_DECIMALS),
      monthly_dividend: formatAssetAmount(summary.monthly_dividend || '0', INVESTMENT_DECIMALS),
      items: (rows || []).map(publicDividend)
    }, '获取分红记录成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'InvestmentService.dividends'));
  }
}

export default { create, list, detail, dividends };
