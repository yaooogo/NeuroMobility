import { ethers } from 'ethers';
import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import { ensureInvestmentOrderTable } from '../../Util/InvestmentSchema.js';
import ChainConfig from '../../Util/ChainConfig.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';

const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'];

function countValue(rows) {
  return Number(rows?.[0]?.count || 0);
}

function tokenMap(tokens) {
  return new Map((tokens || []).map(item => [String(item.value || '').toUpperCase(), item]));
}

async function userStats(prefix) {
  const since = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [newRows, totalRows, activeRows, investmentRows] = await Promise.all([
    DB.query().exec(`SELECT COUNT(*) AS count FROM ${prefix}wallet WHERE created_at>=?`, [since]),
    DB.query().exec(`SELECT COUNT(*) AS count FROM ${prefix}wallet`),
    // invests is the wallet's own activated/invested amount; status only means enabled/disabled.
    DB.query().exec(`SELECT COUNT(*) AS count FROM ${prefix}wallet WHERE COALESCE(invests, 0)>0`),
    DB.query().exec(
      `SELECT COALESCE(SUM(has_active), 0) AS investing,
              COALESCE(SUM(CASE WHEN has_active=0 AND has_exited=1 THEN 1 ELSE 0 END), 0) AS exited
       FROM (
         SELECT LOWER(wallet) AS wallet,
                MAX(CASE WHEN status IN (0, 1) THEN 1 ELSE 0 END) AS has_active,
                MAX(CASE WHEN status=2 THEN 1 ELSE 0 END) AS has_exited
         FROM ${prefix}investment_order
         GROUP BY LOWER(wallet)
       ) AS wallet_investments`
    )
  ]);
  return {
    new_24h: countValue(newRows),
    total: countValue(totalRows),
    active: countValue(activeRows),
    investing: Number(investmentRows?.[0]?.investing || 0),
    exited: Number(investmentRows?.[0]?.exited || 0)
  };
}

async function platformBalances(prefix, tokens) {
  const rows = await DB.query().exec(
    `SELECT UPPER(token) AS token,
            COALESCE(SUM(COALESCE(balance, 0)), 0) AS balance_raw,
            COALESCE(SUM(COALESCE(frozen_balance, 0)), 0) AS frozen_balance_raw
     FROM ${prefix}wallet_assets
     GROUP BY UPPER(token)`
  );
  const configured = tokenMap(tokens);
  const balances = new Map((rows || []).map(row => [String(row.token || '').toUpperCase(), row]));
  const symbols = [...new Set([...configured.keys(), ...balances.keys()])];
  return symbols.map(symbol => {
    const token = configured.get(symbol);
    const row = balances.get(symbol) || {};
    const decimals = Number(token?.decimals || AssetToken.DEFAULT_DECIMALS);
    const balanceRaw = String(row.balance_raw || '0');
    const frozenRaw = String(row.frozen_balance_raw || '0');
    return {
      token: symbol,
      name: token?.name || symbol,
      decimals,
      balance: formatAssetAmount(balanceRaw, decimals),
      balance_raw: balanceRaw,
      frozen_balance: formatAssetAmount(frozenRaw, decimals),
      frozen_balance_raw: frozenRaw
    };
  });
}

function dateRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    today: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', today),
    month: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', month),
    lastMonth: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', lastMonth)
  };
}

function periodAmounts(row, decimals) {
  const todayRaw = String(row?.today_raw || '0');
  const monthRaw = String(row?.month_raw || '0');
  const lastMonthRaw = String(row?.last_month_raw || '0');
  const totalRaw = String(row?.total_raw || '0');
  return {
    today: formatAssetAmount(todayRaw, decimals),
    month: formatAssetAmount(monthRaw, decimals),
    last_month: formatAssetAmount(lastMonthRaw, decimals),
    total: formatAssetAmount(totalRaw, decimals),
    today_raw: todayRaw,
    month_raw: monthRaw,
    last_month_raw: lastMonthRaw,
    total_raw: totalRaw
  };
}

async function investmentStats(prefix, tokens) {
  const ranges = dateRanges();
  const usdt = tokens.find(item => String(item.value || '').toUpperCase() === 'USDT');
  const assetDecimals = Number(usdt?.decimals || AssetToken.DEFAULT_DECIMALS);
  const [investmentRows, rewardRows] = await Promise.all([
    DB.query().exec(
      `SELECT COALESCE(SUM(CASE WHEN created_at>=? THEN amount ELSE 0 END), 0) AS today_raw,
              COALESCE(SUM(CASE WHEN created_at>=? THEN amount ELSE 0 END), 0) AS month_raw,
              COALESCE(SUM(amount), 0) AS total_raw
       FROM ${prefix}investment_order
       WHERE UPPER(token)='USDT'`,
      [ranges.today, ranges.month]
    ),
    DB.query().exec(
      `SELECT scene,
              COALESCE(SUM(CASE WHEN created_at>=? THEN CAST(balance AS DECIMAL(65,0)) ELSE 0 END), 0) AS today_raw,
              COALESCE(SUM(CASE WHEN created_at>=? THEN CAST(balance AS DECIMAL(65,0)) ELSE 0 END), 0) AS month_raw,
              COALESCE(SUM(CASE WHEN created_at>=? AND created_at<? THEN CAST(balance AS DECIMAL(65,0)) ELSE 0 END), 0) AS last_month_raw,
              COALESCE(SUM(CAST(balance AS DECIMAL(65,0))), 0) AS total_raw
       FROM ${prefix}wallet_assets_logs
       WHERE UPPER(token)='USDT' AND type='in'
         AND scene IN ('investment_dividend', 'investment_differential_income', 'investment_expansion_reward', 'position_salary')
       GROUP BY scene`,
      [ranges.today, ranges.month, ranges.lastMonth, ranges.month]
    )
  ]);
  const rewards = new Map((rewardRows || []).map(row => [row.scene, row]));
  return {
    investment: periodAmounts(investmentRows?.[0], 18),
    dividend: periodAmounts(rewards.get('investment_dividend'), assetDecimals),
    commission_growth: periodAmounts(rewards.get('investment_differential_income'), assetDecimals),
    expansion_reward: periodAmounts(rewards.get('investment_expansion_reward'), assetDecimals),
    salary: periodAmounts(rewards.get('position_salary'), assetDecimals)
  };
}

async function fundStats(prefix, tokens) {
  const ranges = dateRanges();
  const usdt = tokens.find(item => String(item.value || '').toUpperCase() === 'USDT');
  const decimals = Number(usdt?.decimals || AssetToken.DEFAULT_DECIMALS);
  const [depositRows, withdrawalRows] = await Promise.all([
    DB.query().exec(
      `SELECT COALESCE(SUM(CASE WHEN created_at>=? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END), 0) AS today_raw,
              COALESCE(SUM(CASE WHEN created_at>=? THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END), 0) AS month_raw,
              COALESCE(SUM(CAST(amount AS DECIMAL(65,0))), 0) AS total_raw
       FROM ${prefix}receiver_order
       WHERE UPPER(COALESCE(token, 'USDT'))='USDT'`,
      [ranges.today, ranges.month]
    ),
    DB.query().exec(
      `SELECT COALESCE(SUM(CASE WHEN updated_at>=? THEN CAST(debit_amount AS DECIMAL(65,0)) ELSE 0 END), 0) AS today_raw,
              COALESCE(SUM(CASE WHEN updated_at>=? THEN CAST(debit_amount AS DECIMAL(65,0)) ELSE 0 END), 0) AS month_raw,
              COALESCE(SUM(CAST(debit_amount AS DECIMAL(65,0))), 0) AS total_raw
       FROM ${prefix}withdrawal_order
       WHERE UPPER(token)='USDT' AND status=2`,
      [ranges.today, ranges.month]
    )
  ]);
  return {
    recharge_usdt: periodAmounts(depositRows?.[0], decimals),
    withdrawal_usdt: periodAmounts(withdrawalRows?.[0], decimals)
  };
}

async function levelStats(prefix) {
  const rows = await DB.query().exec(
    `SELECT effective_level AS level, COUNT(*) AS count
     FROM (
       SELECT CASE WHEN is_manual_level=1 THEN manual_level ELSE level END AS effective_level
       FROM ${prefix}wallet
     ) AS wallet_levels
     WHERE effective_level BETWEEN 1 AND 3
     GROUP BY effective_level`
  );
  const counts = new Map((rows || []).map(row => [Number(row.level || 0), Number(row.count || 0)]));
  return [1, 2, 3].map(level => ({ level, count: counts.get(level) || 0 }));
}

function rpcUrl() {
  const values = ChainConfig.getRpcs();
  return Array.isArray(values) ? String(values.find(Boolean) || '').trim() : String(values || '').trim();
}

async function contractTokenBalance(token, withdrawalContract, provider) {
  const symbol = String(token.value || '').toUpperCase();
  const tokenContract = String(token.contract || '').trim();
  const decimals = Number(token.decimals || AssetToken.DEFAULT_DECIMALS);
  if (!provider || !ethers.isAddress(withdrawalContract) || !ethers.isAddress(tokenContract)) {
    return {
      token: symbol, name: token.name || symbol, token_contract: tokenContract,
      balance: '0', balance_raw: '0', configured: false
    };
  }
  const raw = String(await new ethers.Contract(tokenContract, ERC20_ABI, provider).balanceOf(withdrawalContract));
  return {
    token: symbol, name: token.name || symbol, token_contract: tokenContract,
    balance: formatAssetAmount(raw, decimals), balance_raw: raw, configured: true
  };
}

async function overview(req, res) {
  try {
    await ensureAssetTransferTables();
    await ensureInvestmentOrderTable();
    const prefix = Database.prefix('default') || '';
    const tokens = await AssetToken.getTokens();
    const [users, balances, funds, investments, levels] = await Promise.all([
      userStats(prefix),
      platformBalances(prefix, tokens),
      fundStats(prefix, tokens),
      investmentStats(prefix, tokens),
      levelStats(prefix)
    ]);
    return res.send(ApiResult.success({
      generated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date()),
      users,
      platform_balances: balances,
      funds,
      investments,
      levels
    }, '获取首页总览成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'OverviewService.overview'));
  }
}

async function withdrawalContractBalance(req, res) {
  try {
    const tokens = await AssetToken.getTokens();
    const withdrawalContract = String(ChainConfig.getContract('TokenWithdrawal').address || '').trim();
    const url = rpcUrl();
    const provider = url ? new ethers.JsonRpcProvider(url) : null;
    const balances = await Promise.all(tokens.map(token => contractTokenBalance(token, withdrawalContract, provider)));
    return res.send(ApiResult.success({
      generated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date()),
      withdrawal_contract: withdrawalContract,
      rpc_configured: Boolean(url),
      balances
    }, '获取提现合约余额成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'OverviewService.withdrawalContractBalance'));
  }
}

export default { overview, withdrawalContractBalance };
