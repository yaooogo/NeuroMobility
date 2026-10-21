import DB from './database/DB.js';
import Database from './Database.js';
import { parseAssetAmount } from './AssetAmount.js';

export const TEAM_TABLE = 'team_withdraw_limit_config';
export const LEVEL_TABLE = 'level_withdraw_limit_config';
let tablePromise;

export async function ensureWithdrawalLimitTables() {
  if (!tablePromise) {
    const prefix = Database.prefix('default') || '';
    tablePromise = (async () => {
      await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${prefix}${TEAM_TABLE} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wallet VARCHAR(80) NOT NULL, rules_json JSON NOT NULL,
        enabled TINYINT UNSIGNED NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT NULL, updated_at DATETIME DEFAULT NULL,
        UNIQUE KEY uk_team_withdraw_wallet (wallet)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${prefix}${LEVEL_TABLE} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        level TINYINT UNSIGNED NOT NULL, token VARCHAR(80) NOT NULL,
        limit_type VARCHAR(16) NOT NULL DEFAULT 'fixed', daily_limit VARCHAR(80) NOT NULL DEFAULT '0',
        enabled TINYINT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT NULL, updated_at DATETIME DEFAULT NULL,
        UNIQUE KEY uk_level_withdraw_token (level, token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    })().catch(error => { tablePromise = null; throw error; });
  }
  await tablePromise;
}

export function readTeamRules(row) {
  const rules = typeof row.rules_json === 'string' ? JSON.parse(row.rules_json) : row.rules_json;
  return Array.isArray(rules) ? rules : [];
}

export function validateLimitRules(input, tokens, levelRules = false) {
  const rules = typeof input === 'string' ? JSON.parse(input) : input;
  if (!Array.isArray(rules) || !rules.length) throw new Error('请填写限额规则');
  const seen = new Set();
  return rules.map(rule => {
    const token = String(rule.token || '').trim().toUpperCase();
    const asset = tokens.find(item => item.value === token);
    if (!asset) throw new Error('资产类型不存在或已禁用');
    const level = Number(rule.level);
    if (levelRules && (!Number.isInteger(level) || level < 0 || level > 3)) throw new Error('等级必须为 0-3');
    const key = levelRules ? `${level}:${token}` : token;
    if (seen.has(key)) throw new Error('限额规则重复');
    seen.add(key);
    if (!['fixed', 'percent'].includes(rule.limit_type)) throw new Error('限额方式无效');
    const dailyLimit = String(rule.daily_limit ?? '').trim();
    parseAssetAmount(dailyLimit, rule.limit_type === 'percent' ? 6 : Number(asset.decimals));
    if (dailyLimit.length > 80) throw new Error('限额数值过长');
    if (rule.limit_type === 'percent' && Number(dailyLimit) > 100) throw new Error('收益百分比不能超过 100');
    const result = { token, limit_type: rule.limit_type, daily_limit: dailyLimit };
    if (levelRules) {
      if (![0, 1, '0', '1'].includes(rule.enabled)) throw new Error('启用状态无效');
      Object.assign(result, { level, enabled: Number(rule.enabled) });
    } else {
      if (!['personal', 'team'].includes(rule.scope_type)) throw new Error('限额范围无效');
      result.scope_type = rule.scope_type;
    }
    return result;
  });
}

export function effectiveLevel(wallet) {
  return Number(wallet.is_manual_level) === 1 ? Number(wallet.manual_level || 0) : Number(wallet.level || 0);
}

export function limitRaw(rule, decimals, incomeRaw = 0n) {
  if (rule.limit_type === 'percent') {
    const percent = BigInt(parseAssetAmount(rule.daily_limit, 6));
    return incomeRaw * percent / 100000000n;
  }
  return BigInt(parseAssetAmount(rule.daily_limit, decimals));
}

export function chooseRule(levelRule, teamConfigs, ancestors, token, defaultLimit) {
  if (levelRule) return { ...levelRule, scope_type: 'personal', source: 'level' };
  const configs = new Map(teamConfigs.map(row => [row.wallet.toLowerCase(), row]));
  // Match the nearest enabled config first, including when its token is absent.
  for (const wallet of ancestors) {
    const config = configs.get(wallet.toLowerCase());
    if (!config) continue;
    const rule = readTeamRules(config).find(item => item.token === token);
    if (rule) return { ...rule, config_wallet: config.wallet, source: 'team' };
    break;
  }
  return { limit_type: 'fixed', daily_limit: String(defaultLimit || '0'), scope_type: 'personal', source: 'asset' };
}

// Called inside the asset-token lock, before the first non-locking transaction read.
export async function enforceWithdrawalLimit({ wallet, walletInfo, token, decimals, rawDebit, defaultLimit, config, connection }) {
  const prefix = Database.prefix(config) || '';
  const query = () => DB.query(config, connection);
  const parents = await query().table('wallet_relation').whereRaw('LOWER(wallet)=?', [wallet]).orderBy('lv', 'asc').get();
  const ancestors = [...new Set([wallet, ...parents.map(row => String(row.inviter || '').toLowerCase()).filter(Boolean)])];
  const levelRule = await query().table(LEVEL_TABLE).where('level', effectiveLevel(walletInfo)).where('token', token).where('enabled', 1).first();
  const configs = levelRule ? [] : await query().table(TEAM_TABLE).where('enabled', 1)
    .whereRaw(`LOWER(wallet) IN (${ancestors.map(() => '?').join(',')})`, ancestors).get();
  const rule = chooseRule(levelRule, configs, ancestors, token, defaultLimit);
  const shared = rule.scope_type === 'team';
  const scopeSql = shared
    ? `(LOWER(wallet)=? OR LOWER(wallet) IN (SELECT LOWER(wallet) FROM ${prefix}wallet_relation WHERE LOWER(inviter)=?))`
    : 'LOWER(wallet)=?';
  const root = String(rule.config_wallet || wallet).toLowerCase();
  const scopeBindings = shared ? [root, root] : [wallet];
  let income = 0n;
  if (rule.limit_type === 'percent') {
    const rows = await query().exec(
      `SELECT COALESCE(SUM(CAST(balance AS DECIMAL(65,0))),0) AS total FROM ${prefix}wallet_assets_logs
       WHERE token=? AND type='in' AND scene IN ('investment_dividend','investment_direct_dividend_reward','investment_differential_income')
       AND created_at>=CURDATE() AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND ${scopeSql}`,
      [token, ...scopeBindings]
    );
    income = BigInt(String(rows?.[0]?.total || '0'));
  }
  const limit = limitRaw(rule, decimals, income);
  if (rule.limit_type === 'fixed' && limit === 0n) return;
  const totals = await query().exec(
    `SELECT COALESCE(SUM(CAST(debit_amount AS DECIMAL(65,0))),0) AS total FROM ${prefix}withdrawal_order
     WHERE token=? AND status IN (0,1,2) AND created_at>=CURDATE() AND created_at<DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND ${scopeSql}`,
    [token, ...scopeBindings]
  );
  if (BigInt(String(totals?.[0]?.total || '0')) + rawDebit > limit) throw new Error('Network Security risk detected. Please try again later.');
}
