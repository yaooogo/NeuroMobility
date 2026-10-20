import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import ManagePermission from '../../Util/ManagePermission.js';
import { TEAM_TABLE, LEVEL_TABLE, ensureWithdrawalLimitTables, readTeamRules, validateLimitRules } from '../../Util/WithdrawalLimitRules.js';

async function validationTokens() {
  await AssetToken.ensureAssetTokenColumns();
  return (await DB.query().table('assets_tokens').get()).map(AssetToken.normalizeTokenRow);
}

async function teamList(req, res) {
  try {
    await ensureWithdrawalLimitTables();
    const query = DB.query().table(TEAM_TABLE);
    const wallet = String(req.body?.wallet || '').trim();
    if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (req.body?.enabled === 0 || req.body?.enabled === 1 || ['0', '1'].includes(req.body?.enabled)) query.where('enabled', Number(req.body.enabled));
    const page = Math.max(1, Helper.parseInt(req.body?.page, 1));
    const pageSize = Math.min(100, Math.max(1, Helper.parseInt(req.body?.page_size, 20)));
    const [result, tokens] = await Promise.all([query.orderBy('id', 'desc').paginate(page, pageSize), AssetToken.getTokens()]);
    return res.send(ApiResult.success({ items: result.items.map(row => ({ ...row, rules: readTeamRules(row) })),
      token_options: tokens, total: result.total, last_page: result.lastPage }));
  } catch (error) { return res.send(ApiResult.exception(error, 'WithdrawalLimitService.teamList')); }
}

async function teamSave(req, res) {
  try {
    await ensureWithdrawalLimitTables();
    const id = Helper.parseInt(req.body?.id, 0);
    const permission = id ? 'team-withdraw-limit-rules-update' : 'team-withdraw-limit-rules-create';
    if (!ManagePermission.hasPermission(req.auth?.user, permission)) return res.send(ApiResult.error(403, 'No permission'));
    const existing = id ? await DB.query().table(TEAM_TABLE).where('id', id).first() : null;
    if (id && !existing) return res.send(ApiResult.error(404, '配置不存在'));
    const wallet = String(req.body?.wallet || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/u.test(wallet)) return res.send(ApiResult.error(400, '钱包地址格式不正确'));
    if (existing && wallet !== existing.wallet.toLowerCase()) return res.send(ApiResult.error(400, '编辑时不能修改团队钱包'));
    if (!await DB.query().table('wallet').whereRaw('LOWER(wallet)=?', [wallet]).first()) return res.send(ApiResult.error(400, '钱包不存在'));
    let rules;
    try { rules = validateLimitRules(req.body?.rules, await validationTokens()); }
    catch (error) { return res.send(ApiResult.error(400, error.message)); }
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    if (existing) {
      await DB.query().table(TEAM_TABLE).where('id', id).update({ rules_json: JSON.stringify(rules), updated_at: now });
    } else {
      await DB.query().table(TEAM_TABLE).insert({ wallet, rules_json: JSON.stringify(rules), enabled: 1, created_at: now, updated_at: now });
    }
    return res.send(ApiResult.success({}, '团队提现限额已保存'));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.send(ApiResult.error(400, '该钱包已配置团队提现限额'));
    return res.send(ApiResult.exception(error, 'WithdrawalLimitService.teamSave'));
  }
}

async function teamToggle(req, res) {
  try {
    await ensureWithdrawalLimitTables();
    const id = Helper.parseInt(req.body?.id, 0);
    if (![0, 1, '0', '1'].includes(req.body?.enabled)) return res.send(ApiResult.error(400, '启用状态无效'));
    if (!await DB.query().table(TEAM_TABLE).where('id', id).first()) return res.send(ApiResult.error(404, '配置不存在'));
    await DB.query().table(TEAM_TABLE).where('id', id).update({ enabled: Number(req.body.enabled), updated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date()) });
    return res.send(ApiResult.success({}, '状态已更新'));
  } catch (error) { return res.send(ApiResult.exception(error, 'WithdrawalLimitService.teamToggle')); }
}

async function levelDetail(req, res) {
  try {
    await ensureWithdrawalLimitTables();
    const [rules, tokens] = await Promise.all([DB.query().table(LEVEL_TABLE).orderBy('level', 'asc').get(), AssetToken.getTokens()]);
    return res.send(ApiResult.success({ rules, token_options: tokens }));
  } catch (error) { return res.send(ApiResult.exception(error, 'WithdrawalLimitService.levelDetail')); }
}

async function levelSave(req, res) {
  try {
    await ensureWithdrawalLimitTables();
    let rules;
    try { rules = validateLimitRules(req.body?.rules, await validationTokens(), true); }
    catch (error) { return res.send(ApiResult.error(400, error.message)); }
    await DB.transaction(async (config, connection) => {
      const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
      for (const rule of rules) {
        await DB.query(config, connection).table(LEVEL_TABLE).upsert({ ...rule, created_at: now, updated_at: now },
          ['level', 'token'], ['limit_type', 'daily_limit', 'enabled', 'updated_at']);
      }
    });
    return res.send(ApiResult.success({}, '等级提现限额已保存'));
  } catch (error) { return res.send(ApiResult.exception(error, 'WithdrawalLimitService.levelSave')); }
}

export default { teamList, teamSave, teamToggle, levelDetail, levelSave };
