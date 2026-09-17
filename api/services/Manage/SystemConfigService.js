import ApiResult from '../../Util/ApiResult.js';
import CacheData from '../../Util/CacheData.js';
import DB from '../../Util/database/DB.js';
import {
  WALLET_LEVEL_SYS_CONFIG_NAME,
  getDefaultWalletLevelRules,
  normalizeWalletLevelRules,
  validateWalletLevelRules
} from '../../config/walletLevel.js';
import {
  INVESTMENT_SYS_CONFIG_NAME,
  getDefaultInvestmentConfig,
  normalizeInvestmentConfig,
  validateInvestmentConfig
} from '../../config/investmentConfig.js';

const TABLE_NAME = 'sys_config';
const BRIEF = '等级金额阈值配置';
const INVESTMENT_BRIEF = '投资配置';

function parseRules(value) {
  try { return normalizeWalletLevelRules(JSON.parse(value || '[]')); }
  catch { return getDefaultWalletLevelRules(); }
}

async function ensureRow() {
  let row = await DB.query().table(TABLE_NAME).where('name', WALLET_LEVEL_SYS_CONFIG_NAME).first();
  if (row) return row;
  const result = { insertId: 0 };
  await DB.query().table(TABLE_NAME).insert({
    name: WALLET_LEVEL_SYS_CONFIG_NAME,
    value: JSON.stringify(getDefaultWalletLevelRules()),
    brief: BRIEF
  }, result);
  return DB.query().table(TABLE_NAME).where('id', result.insertId).first();
}

function parseInvestmentConfig(value) {
  try { return normalizeInvestmentConfig(JSON.parse(value || '{}')); }
  catch { return getDefaultInvestmentConfig(); }
}

async function ensureInvestmentRow() {
  let row = await DB.query().table(TABLE_NAME).where('name', INVESTMENT_SYS_CONFIG_NAME).first();
  if (row) return row;
  const result = { insertId: 0 };
  await DB.query().table(TABLE_NAME).insert({
    name: INVESTMENT_SYS_CONFIG_NAME,
    value: JSON.stringify(getDefaultInvestmentConfig()),
    brief: INVESTMENT_BRIEF
  }, result);
  return DB.query().table(TABLE_NAME).where('id', result.insertId).first();
}

function format(row) {
  return {
    id: Number(row?.id || 0), name: row?.name || WALLET_LEVEL_SYS_CONFIG_NAME,
    brief: row?.brief || BRIEF,
    rules: parseRules(row?.value).map(item => ({ level: item.level, amount: item.min_price }))
  };
}

function formatInvestment(row) {
  return {
    id: Number(row?.id || 0),
    name: row?.name || INVESTMENT_SYS_CONFIG_NAME,
    brief: row?.brief || INVESTMENT_BRIEF,
    ...parseInvestmentConfig(row?.value)
  };
}

async function walletLevelDetail(req, res) {
  try { return res.send(ApiResult.success(format(await ensureRow()), '获取等级配置成功')); }
  catch (error) { return res.send(ApiResult.exception(error, 'SystemConfigService.walletLevelDetail')); }
}

async function walletLevelUpdate(req, res) {
  try {
    const rawRules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const rules = validateWalletLevelRules(rawRules.map(item => ({ level: item?.level, min_price: item?.amount })));
    const row = await ensureRow();
    await DB.query().table(TABLE_NAME).where('id', row.id).update({ value: JSON.stringify(rules), brief: BRIEF });
    await CacheData.removeWalletLevelRules();
    return res.send(ApiResult.success(format(await ensureRow()), '等级配置保存成功'));
  } catch (error) {
    return res.send(ApiResult.error(400, error.message || '等级配置格式不正确'));
  }
}

async function investmentDetail(req, res) {
  try { return res.send(ApiResult.success(formatInvestment(await ensureInvestmentRow()), '获取投资配置成功')); }
  catch (error) { return res.send(ApiResult.exception(error, 'SystemConfigService.investmentDetail')); }
}

async function investmentUpdate(req, res) {
  try {
    const config = validateInvestmentConfig(req.body || {});
    const row = await ensureInvestmentRow();
    await DB.query().table(TABLE_NAME).where('id', row.id).update({
      value: JSON.stringify(config),
      brief: INVESTMENT_BRIEF
    });
    await CacheData.removeSysConfig(INVESTMENT_SYS_CONFIG_NAME);
    return res.send(ApiResult.success(formatInvestment(await ensureInvestmentRow()), '投资配置保存成功'));
  } catch (error) {
    return res.send(ApiResult.error(400, error.message || '投资配置格式不正确'));
  }
}

export default { walletLevelDetail, walletLevelUpdate, investmentDetail, investmentUpdate };
