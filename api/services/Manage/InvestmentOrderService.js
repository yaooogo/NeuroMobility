import ApiResult from '../../Util/ApiResult.js';
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
    guaranteed_percent: Number(row.guaranteed_percent || 0), whole_vehicle: Number(row.whole_vehicle || 0),
    status: Number(row.status || 0), waiting_until: row.waiting_until || '', next_dividend_at: row.next_dividend_at || '',
    created_at: row.created_at || '', updated_at: row.updated_at || ''
  };
}

async function list(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    await DB.query().table('investment_order').where('status', 0).whereRaw('waiting_until<=?', [now])
      .update({ status: 1, updated_at: now });
    const page = Math.max(Helper.parseInt(req.body?.page, 1), 1);
    const pageSize = Math.min(Math.max(Helper.parseInt(req.body?.page_size, 20), 1), 100);
    const query = DB.query().table('investment_order');
    const wallet = String(req.body?.wallet || '').trim();
    const orderId = String(req.body?.order_id || '').trim();
    const status = req.body?.status;
    if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (orderId) query.where('order_id', 'like', `%${orderId}%`);
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize), total: result.total, page: result.currentPage,
      page_size: result.perPage, last_page: result.lastPage
    }, '获取投资订单成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'InvestmentOrderService.list')); }
}

export default { list };
