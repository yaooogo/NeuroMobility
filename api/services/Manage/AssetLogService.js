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
  { value: 'investment_direct_dividend_reward', label: '直推分红奖励' },
  { value: 'investment_differential_income', label: '投资级差收益' },
  { value: 'position_salary', label: '岗位工资' }
];
const SCENE_LABELS = new Map(SCENE_OPTIONS.map(item => [item.value, item.label]));

function filters(req) {
  return {
    wallet: String(req.body?.wallet || '').trim(), searchTeam: Helper.parseInt(req.body?.search_team, 0) === 1,
    token: String(req.body?.token || '').trim().toUpperCase(),
    reason: Helper.safeString(req.body?.reason, 255).trim(),
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
  if (value.reason) query.where('reason', 'like', `%${value.reason}%`);
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

function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+@-]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

async function exportCsv(req, res) {
  try {
    const value = filters(req);
    if (value.start && value.end && value.start > value.end) return res.send(ApiResult.error(400, '结束日期不能早于开始日期'));
    const prefix = Database.prefix('default') || '';
    const rows = await applyFilters(DB.query().table(ASSET_TABLE), value, prefix).orderBy('id', 'desc').get();
    const lines = [['ID', '业务单号', '钱包地址', '资产', '变动数量', '变动前', '变动后', '业务类型', '原因', '类型', '创建时间', '更新时间'].map(csvCell).join(',')];
    const decimalsByToken = new Map();
    for (const raw of rows || []) {
      if (!decimalsByToken.has(raw.token)) decimalsByToken.set(raw.token, await AssetToken.getTokenDecimals(raw.token));
      const decimals = decimalsByToken.get(raw.token);
      lines.push([
        raw.id, raw.biz_id, raw.wallet, raw.token,
        formatAssetAmount(raw.balance || '0', decimals),
        formatAssetAmount(raw.before_balance || '0', decimals),
        formatAssetAmount(raw.after_balance || '0', decimals),
        SCENE_LABELS.get(raw.scene) || raw.scene, raw.reason,
        raw.type === 'in' ? '转入' : raw.type === 'out' ? '转出' : '-',
        raw.created_at, raw.updated_at
      ].map(csvCell).join(','));
    }
    const filename = `asset-logs-${Helper.dateFormat('YYYYmmddHHMMSS', new Date())}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\ufeff${lines.join('\r\n')}\r\n`);
  } catch (error) { return res.send(ApiResult.exception(error, 'AssetLogService.exportCsv')); }
}

export default { list, frozenList, exportCsv };
