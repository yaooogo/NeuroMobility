import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';

const ASSET_TABLE = 'wallet_assets_logs';
const FROZEN_TABLE = 'wallet_frozen_assets_logs';
const SCENE_OPTIONS = [
  { value: 'token_recharge', label: '链上充值' },
  { value: 'open_api_recharge', label: 'API 充值' },
  { value: 'token_withdrawal', label: '提现' },
  { value: 'token_withdrawal_expired', label: '提现超时退回' },
  { value: 'token_withdrawal_cancel', label: '后台取消提现' },
  { value: 'admin_change', label: '后台资产调整' },
  { value: 'investment', label: '投资扣款' },
  { value: 'investment_expansion_reward', label: '投资拓展奖励' },
  { value: 'investment_dividend', label: '投资分红' },
  { value: 'investment_principal_return', label: '本金返还' },
  { value: 'investment_differential_income', label: '投资级差收益' },
  { value: 'position_salary', label: '岗位工资' }
];
const SCENE_LABELS = new Map(SCENE_OPTIONS.map(item => [item.value, item.label]));

function filters(req) {
  return {
    wallet: String(req.body?.wallet || '').trim(), searchTeam: Helper.parseInt(req.body?.search_team, 0) === 1,
    token: String(req.body?.token || '').trim().toUpperCase(),
    type: String(req.body?.type || '').trim(), scene: String(req.body?.scene || '').trim(),
    start: String(req.body?.start_date || '').trim(), end: String(req.body?.end_date || '').trim()
  };
}

function applyFilters(query, value, prefix) {
  if (value.wallet && value.searchTeam) {
    query.whereRaw(
      `LOWER(wallet) IN (
         SELECT LOWER(wallet)
         FROM ${prefix}wallet_relation
         WHERE inviter LIKE ?
       )`,
      [`%${value.wallet}%`]
    );
  } else if (value.wallet) {
    query.where('wallet', 'like', `%${value.wallet}%`);
  }
  if (value.token) query.where('token', value.token);
  if (value.type) query.where('type', value.type);
  if (value.scene) query.where('scene', value.scene);
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
    scene: row.scene || '', scene_label: SCENE_LABELS.get(row.scene) || row.scene || '',
    reason: row.reason || '', type: row.type || '',
    created_at: row.created_at || '', updated_at: row.updated_at || ''
  };
}

async function listByTable(table, req, res, label) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size ?? req.body?.pageSize, 10);
    const value = filters(req);
    const prefix = Database.prefix('default') || '';
    const query = applyFilters(DB.query().table(table), value, prefix).orderBy('id', 'desc');
    const summaryQuery = applyFilters(DB.query().table(table), value, prefix)
      .select([
        'token',
        DB.raw("COALESCE(SUM(CASE WHEN type='in' THEN balance ELSE 0 END), 0) AS total_in"),
        DB.raw("COALESCE(SUM(CASE WHEN type='out' THEN balance ELSE 0 END), 0) AS total_out")
      ])
      .groupBy('token')
      .orderBy('token', 'asc');
    const [result, summaryRows, tokens] = await Promise.all([
      query.paginate(page, pageSize),
      summaryQuery.get(),
      AssetToken.getTokens()
    ]);
    const [items, summary] = await Promise.all([
      Promise.all((result.items || []).map(normalize)),
      Promise.all((summaryRows || []).map(async row => {
        const token = String(row.token || '').toUpperCase();
        const decimals = await AssetToken.getTokenDecimals(token);
        return {
          token,
          total_in: formatAssetAmount(row.total_in || '0', decimals),
          total_out: formatAssetAmount(row.total_out || '0', decimals)
        };
      }))
    ]);
    return res.send(ApiResult.success({
      items, token_options: tokens.map(item => ({ label: item.label, value: item.value })),
      type_options: [{ label: '转入', value: 'in' }, { label: '转出', value: 'out' }],
      scene_options: SCENE_OPTIONS,
      summary,
      total: result.total, page: result.currentPage, page_size: result.perPage, last_page: result.lastPage
    }, `获取${label}成功`));
  } catch (error) {
    return res.send(ApiResult.exception(error, `AssetLogService.${label}`));
  }
}

async function list(req, res) { return listByTable(ASSET_TABLE, req, res, '资产变更记录'); }
async function frozenList(req, res) { return listByTable(FROZEN_TABLE, req, res, '冻结资产变更记录'); }

export default { list, frozenList };
