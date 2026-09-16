import ApiResult from '../../Util/ApiResult.js';
import CacheData from '../../Util/CacheData.js';
import DB from '../../Util/database/DB.js';
import {
  WALLET_LEVEL_SYS_CONFIG_NAME,
  getDefaultWalletLevelRules,
  normalizeWalletLevelRules,
  validateWalletLevelRules
} from '../../config/walletLevel.js';

const TABLE_NAME = 'sys_config';
const BRIEF = '等级金额阈值配置';

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

function format(row) {
  return {
    id: Number(row?.id || 0), name: row?.name || WALLET_LEVEL_SYS_CONFIG_NAME,
    brief: row?.brief || BRIEF,
    rules: parseRules(row?.value).map(item => ({ level: item.level, amount: item.min_price }))
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

export default { walletLevelDetail, walletLevelUpdate };
