import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensurePositionSalaryTable } from '../../Util/PositionSalarySchema.js';

function normalize(row) {
  return {
    id: Number(row.id || 0),
    salary_id: row.salary_id || '',
    salary_month: row.salary_month || '',
    wallet: row.wallet || '',
    level: Number(row.level || 0),
    token: row.token || 'USDT',
    amount: formatAssetAmount(row.amount || '0', 18),
    paid_at: row.paid_at || '',
    created_at: row.created_at || ''
  };
}

async function list(req, res) {
  try {
    await ensurePositionSalaryTable();
    const page = Math.max(Helper.parseInt(req.body?.page, 1), 1);
    const pageSize = Math.min(Math.max(Helper.parseInt(req.body?.page_size, 20), 1), 100);
    const wallet = String(req.body?.wallet || '').trim();
    const salaryMonth = String(req.body?.salary_month || '').trim();
    const level = req.body?.level;
    const query = DB.query().table('position_salary_record');
    if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (/^\d{4}-\d{2}$/u.test(salaryMonth)) query.where('salary_month', salaryMonth);
    if (level !== '' && level !== null && typeof level !== 'undefined') query.where('level', Number(level));
    const result = await query.orderBy('id', 'desc').paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取岗位工资记录成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'PositionSalaryService.list')); }
}

export default { list };
