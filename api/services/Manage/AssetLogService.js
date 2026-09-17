import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';

const ASSET_TABLE = 'wallet_assets_logs';
const FROZEN_TABLE = 'wallet_frozen_assets_logs';

function filters(req) {
  return {
    wallet: String(req.body?.wallet || '').trim(), token: String(req.body?.token || '').trim().toUpperCase(),
    type: String(req.body?.type || '').trim(), scene: String(req.body?.scene || '').trim(),
    start: String(req.body?.start_date || '').trim(), end: String(req.body?.end_date || '').trim()
  };
}

function applyFilters(query, value) {
  if (value.wallet) query.where('wallet', 'like', `%${value.wallet}%`);
  if (value.token) query.where('token', value.token);
  if (value.type) query.where('type', value.type);
  if (value.scene) query.where('scene', 'like', `%${value.scene}%`);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value.start)) query.where('created_at', '>=', `${value.start} 00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value.end)) query.where('created_at', '<=', `${value.end} 23:59:59`);
  return query;
}

async function normalize(row) {
  const decimals = await AssetToken.getTokenDecimals(row.token);
  return {
    id: Number(row.id || 0), biz_id: row.biz_id || '', wallet: row.wallet || '', token: row.token || '',
    balance: formatAssetAmount(row.balance || '0', decimals),
    before_balance: formatAssetAmount(row.before_balance || '0', decimals),
    after_balance: formatAssetAmount(row.after_balance || '0', decimals),
    scene: row.scene || '', reason: row.reason || '', type: row.type || '',
    created_at: row.created_at || '', updated_at: row.updated_at || ''
  };
}

async function listByTable(table, req, res, label) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size ?? req.body?.pageSize, 10);
    const query = applyFilters(DB.query().table(table), filters(req)).orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    const [items, tokens] = await Promise.all([
      Promise.all((result.items || []).map(normalize)),
      AssetToken.getTokens()
    ]);
    return res.send(ApiResult.success({
      items, token_options: tokens.map(item => ({ label: item.label, value: item.value })),
      type_options: [{ label: '转入', value: 'in' }, { label: '转出', value: 'out' }],
      total: result.total, page: result.currentPage, page_size: result.perPage, last_page: result.lastPage
    }, `获取${label}成功`));
  } catch (error) {
    return res.send(ApiResult.exception(error, `AssetLogService.${label}`));
  }
}

async function list(req, res) { return listByTable(ASSET_TABLE, req, res, '资产变更记录'); }
async function frozenList(req, res) { return listByTable(FROZEN_TABLE, req, res, '冻结资产变更记录'); }

export default { list, frozenList };
