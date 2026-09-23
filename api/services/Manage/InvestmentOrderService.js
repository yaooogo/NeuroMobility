import ApiResult from '../../Util/ApiResult.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensureInvestmentOrderTable } from '../../Util/InvestmentSchema.js';

function normalize(row) {
  return {
    id: Number(row.id || 0), order_id: row.order_id || '', wallet: row.wallet || '', token: row.token || 'USDT',
    amount: formatAssetAmount(row.amount || '0', 18),
    distributed_amount: formatAssetAmount(row.distributed_amount || '0', 18),
    total_dividend: formatAssetAmount(row.total_dividend || '0', 18),
    waiting_days: Number(row.waiting_days || 0), cycle_days: Number(row.cycle_days || 0),
    min_percent: Number(row.min_percent || 0), max_percent: Number(row.max_percent || 0),
    dividend_multiple: Number(row.dividend_multiple || 0),
    dividend_min_percent: Number(row.dividend_min_percent || 0),
    dividend_max_percent: Number(row.dividend_max_percent || 0),
    exit_multiple: Number(row.exit_multiple || 0),
    guaranteed_percent: Number(row.guaranteed_percent || 0),
    guaranteed_eligible: Number(row.guaranteed_eligible || 0), whole_vehicle: Number(row.whole_vehicle || 0),
    status: Number(row.status || 0), waiting_until: row.waiting_until || '', next_dividend_at: row.next_dividend_at || '',
    created_at: row.created_at || '', updated_at: row.updated_at || ''
  };
}

function normalizeDividend(row) {
  return {
    id: Number(row.id || 0),
    dividend_id: row.dividend_id || '',
    order_id: row.order_id || '',
    wallet: row.wallet || '',
    token: row.token || 'USDT',
    cycle_at: row.cycle_at || '',
    percent: Number(row.percent || 0),
    amount: formatAssetAmount(row.amount || '0', 18),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function applyListFilters(query, filters, prefix) {
  if (filters.wallet) {
    if (filters.searchTeam) {
      query.whereRaw(
        `LOWER(wallet) IN (
           SELECT LOWER(wallet)
           FROM ${prefix}wallet_relation
           WHERE inviter LIKE ?
         )`,
        [`%${filters.wallet}%`]
      );
    } else {
      query.where('wallet', 'like', `%${filters.wallet}%`);
    }
  }
  if (filters.orderId) query.where('order_id', 'like', `%${filters.orderId}%`);
  if (filters.hasStatus) query.where('status', filters.status);
  return query;
}

function buildSummaryWhere(filters, prefix) {
  const clauses = [];
  const bindings = [];
  if (filters.wallet) {
    if (filters.searchTeam) {
      clauses.push(`LOWER(wallet) IN (
        SELECT LOWER(wallet)
        FROM ${prefix}wallet_relation
        WHERE inviter LIKE ?
      )`);
    } else {
      clauses.push('wallet LIKE ?');
    }
    bindings.push(`%${filters.wallet}%`);
  }
  if (filters.orderId) {
    clauses.push('order_id LIKE ?');
    bindings.push(`%${filters.orderId}%`);
  }
  if (filters.hasStatus) {
    clauses.push('status=?');
    bindings.push(filters.status);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', bindings };
}

async function list(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    await DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now])
      .update({ status: 1, updated_at: now });
    const page = Math.max(Helper.parseInt(req.body?.page, 1), 1);
    const pageSize = Math.min(Math.max(Helper.parseInt(req.body?.page_size, 20), 1), 100);
    const prefix = Database.prefix('default') || '';
    const statusInput = req.body?.status;
    const filters = {
      wallet: String(req.body?.wallet || '').trim(),
      orderId: String(req.body?.order_id || '').trim(),
      searchTeam: Helper.parseInt(req.body?.search_team, 0) === 1,
      hasStatus: statusInput !== '' && statusInput !== null && typeof statusInput !== 'undefined',
      status: Number(statusInput)
    };
    const query = applyListFilters(DB.query().table('investment_order'), filters, prefix);
    query.orderBy('id', 'desc');
    const summaryWhere = buildSummaryWhere(filters, prefix);
    const [result, summaryRows] = await Promise.all([
      query.paginate(page, pageSize),
      DB.query().exec(
        `SELECT COUNT(*) AS order_count,
                COALESCE(SUM(amount), 0) AS amount,
                COALESCE(SUM(distributed_amount), 0) AS distributed_amount,
                COALESCE(SUM(total_dividend), 0) AS total_dividend
         FROM ${prefix}investment_order
         ${summaryWhere.sql}`,
        summaryWhere.bindings
      )
    ]);
    const summary = summaryRows?.[0] || {};
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize), total: result.total, page: result.currentPage,
      page_size: result.perPage, last_page: result.lastPage,
      summary: {
        order_count: Number(summary.order_count || 0),
        amount: formatAssetAmount(summary.amount || '0', 18),
        distributed_amount: formatAssetAmount(summary.distributed_amount || '0', 18),
        total_dividend: formatAssetAmount(summary.total_dividend || '0', 18)
      }
    }, '获取投资订单成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentOrderService.list')); }
}

async function dividendList(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const orderId = String(req.body?.order_id || '').trim();
    if (!orderId) return res.send(ApiResult.error(400, '投资订单号不能为空'));

    const page = Math.max(Helper.parseInt(req.body?.page, 1), 1);
    const pageSize = Math.min(Math.max(Helper.parseInt(req.body?.page_size, 20), 1), 100);
    const result = await DB.query().table('investment_dividend')
      .where('order_id', orderId)
      .orderBy('id', 'desc')
      .paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalizeDividend), total: result.total, page: result.currentPage,
      page_size: result.perPage, last_page: result.lastPage
    }, '获取投资分红记录成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentOrderService.dividendList')); }
}

export default { list, dividendList };
