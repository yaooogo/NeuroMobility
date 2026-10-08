import ApiResult from '../../Util/ApiResult.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { ensureTeamInvestmentConfigTable } from '../../Util/TeamInvestmentConfigSchema.js';

const TABLE_NAME = 'team_investment_config';

function address(value) {
  return String(value || '').trim().toLowerCase();
}

function isWallet(value) {
  return /^0x[a-f0-9]{40}$/u.test(address(value));
}

function normalize(row) {
  return {
    id: Number(row.id || 0),
    wallet: row.wallet || '',
    status: Number(row.status || 0),
    min_percent: Number(row.min_percent || 0),
    max_percent: Number(row.max_percent || 0),
    dividend_multiple: Number(row.dividend_multiple || 1),
    dividend_min_percent: Number(row.dividend_min_percent || 0),
    dividend_max_percent: Number(row.dividend_max_percent || 0),
    guaranteed_percent: Number(row.guaranteed_percent || 0),
    remark: row.remark || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function validateConfig(body) {
  const wallet = address(body?.wallet);
  const minPercent = Number(body?.min_percent);
  const maxPercent = Number(body?.max_percent);
  const dividendMultiple = Number(body?.dividend_multiple);
  const dividendMinPercent = Number(body?.dividend_min_percent);
  const dividendMaxPercent = Number(body?.dividend_max_percent);
  const guaranteedPercent = Number(body?.guaranteed_percent);

  if (!isWallet(wallet)) throw new Error('请输入正确的钱包地址');
  if (!Number.isFinite(minPercent) || !Number.isFinite(maxPercent) || minPercent < 0 || minPercent > 100 || maxPercent < 0 || maxPercent > 100) throw new Error('分红百分比必须在 0% 到 100% 之间');
  if (minPercent > maxPercent) throw new Error('分红百分比起始值不能大于结束值');
  if (!Number.isFinite(dividendMultiple) || dividendMultiple <= 0) throw new Error('分红规则倍数必须大于 0');
  if (!Number.isFinite(dividendMinPercent) || !Number.isFinite(dividendMaxPercent) || dividendMinPercent < 0 || dividendMinPercent > 100 || dividendMaxPercent < 0 || dividendMaxPercent > 100) throw new Error('分红规则百分比必须在 0% 到 100% 之间');
  if (dividendMinPercent > dividendMaxPercent) throw new Error('分红规则起始值不能大于结束值');
  if (!Number.isFinite(guaranteedPercent) || guaranteedPercent < 0 || guaranteedPercent > 100) throw new Error('保底分红必须在 0% 到 100% 之间');

  return {
    wallet,
    status: Number(body?.status) === 1 ? 1 : 0,
    min_percent: minPercent,
    max_percent: maxPercent,
    dividend_multiple: dividendMultiple,
    dividend_min_percent: dividendMinPercent,
    dividend_max_percent: dividendMaxPercent,
    guaranteed_percent: guaranteedPercent,
    remark: Helper.safeString(body?.remark, 255).trim()
  };
}

async function list(req, res) {
  try {
    await ensureTeamInvestmentConfigTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const wallet = String(req.body?.wallet || '').trim();
    const status = req.body?.status;
    const query = DB.query().table(TABLE_NAME);
    if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '团队分红配置列表获取成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'TeamInvestmentConfigService.list'));
  }
}

async function save(req, res) {
  try {
    await ensureTeamInvestmentConfigTable();
    const id = Helper.parseInt(req.body?.id, 0);
    const config = validateConfig(req.body || {});
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    let savedId = id;

    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      const walletRows = await DB.query(configName, connection).exec(
        `SELECT wallet FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1`,
        [config.wallet]
      );
      if (!walletRows?.[0]) throw new Error('钱包不存在');

      const duplicate = await DB.query(configName, connection).table(TABLE_NAME)
        .whereRaw('LOWER(wallet)=?', [config.wallet])
        .first();
      if (duplicate && Number(duplicate.id || 0) !== id) throw new Error('该钱包已配置团队分红');

      if (id) {
        await DB.query(configName, connection).table(TABLE_NAME).where('id', id).update({
          ...config,
          updated_at: now
        });
      } else {
        const result = { insertId: 0 };
        await DB.query(configName, connection).table(TABLE_NAME).insert({
          ...config,
          created_at: now,
          updated_at: now
        }, result);
        savedId = result.insertId;
      }
    });

    const row = await DB.query().table(TABLE_NAME).where('id', savedId).first();
    return res.send(ApiResult.success(normalize(row), '团队分红配置已保存'));
  } catch (error) {
    if (/钱包|分红|百分比|倍数|wallet/iu.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'TeamInvestmentConfigService.save'));
  }
}

async function remove(req, res) {
  try {
    await ensureTeamInvestmentConfigTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '配置不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '团队分红配置已删除'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'TeamInvestmentConfigService.remove'));
  }
}

export default { list, save, remove };
