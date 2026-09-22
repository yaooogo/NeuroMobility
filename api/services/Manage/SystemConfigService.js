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
import {
  GROWTH_REWARD_SYS_CONFIG_NAME,
  getDefaultGrowthRewardRules,
  normalizeGrowthRewardRules,
  validateGrowthRewardRules
} from '../../config/growthReward.js';

const TABLE_NAME = 'sys_config';
const BRIEF = '等级金额阈值配置';
const INVESTMENT_BRIEF = '投资配置';
const GROWTH_REWARD_BRIEF = '成长奖励配置';

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

function parseGrowthRewardRules(value) {
  try { return normalizeGrowthRewardRules(JSON.parse(value || '[]')); }
  catch { return getDefaultGrowthRewardRules(); }
}

async function ensureGrowthRewardRow() {
  let row = await DB.query().table(TABLE_NAME).where('name', GROWTH_REWARD_SYS_CONFIG_NAME).first();
  if (row) return row;
  const result = { insertId: 0 };
  await DB.query().table(TABLE_NAME).insert({
    name: GROWTH_REWARD_SYS_CONFIG_NAME,
    value: JSON.stringify(getDefaultGrowthRewardRules()),
    brief: GROWTH_REWARD_BRIEF
  }, result);
  return DB.query().table(TABLE_NAME).where('id', result.insertId).first();
}

function format(row, growthRewardRow) {
  return {
    id: Number(row?.id || 0), name: row?.name || WALLET_LEVEL_SYS_CONFIG_NAME,
    brief: row?.brief || BRIEF,
    rules: parseRules(row?.value).map(item => ({
      level: item.level,
      amount: item.min_price,
      differential_percent: item.differential_percent,
      expansion_reward_percent: item.expansion_reward_percent,
      position_salary: item.position_salary
    })),
    growth_rewards: parseGrowthRewardRules(growthRewardRow?.value)
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
  try {
    const [row, growthRewardRow] = await Promise.all([ensureRow(), ensureGrowthRewardRow()]);
    return res.send(ApiResult.success(format(row, growthRewardRow), '获取等级配置成功'));
  }
  catch (error) { return res.send(ApiResult.exception(error, 'SystemConfigService.walletLevelDetail')); }
}

async function walletLevelUpdate(req, res) {
  try {
    const rawRules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const rules = validateWalletLevelRules(rawRules.map(item => ({
      level: item?.level,
      min_price: item?.amount,
      differential_percent: item?.differential_percent,
      expansion_reward_percent: item?.expansion_reward_percent,
      position_salary: item?.position_salary
    })));
    const growthRewards = validateGrowthRewardRules(Array.isArray(req.body?.growth_rewards) ? req.body.growth_rewards : []);
    const [row, growthRewardRow] = await Promise.all([ensureRow(), ensureGrowthRewardRow()]);
    await DB.transaction(async (configName, connection) => {
      await DB.query(configName, connection).table(TABLE_NAME).where('id', row.id)
        .update({ value: JSON.stringify(rules), brief: BRIEF });
      await DB.query(configName, connection).table(TABLE_NAME).where('id', growthRewardRow.id)
        .update({ value: JSON.stringify(growthRewards), brief: GROWTH_REWARD_BRIEF });
    });
    await Promise.all([
      CacheData.removeWalletLevelRules(),
      CacheData.removeSysConfig(GROWTH_REWARD_SYS_CONFIG_NAME)
    ]);
    const [savedRow, savedGrowthRewardRow] = await Promise.all([ensureRow(), ensureGrowthRewardRow()]);
    return res.send(ApiResult.success(format(savedRow, savedGrowthRewardRow), '等级配置保存成功'));
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
