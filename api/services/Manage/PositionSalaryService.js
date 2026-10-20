import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Database from '../../Util/Database.js';
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

function recordQuery(req) {
    const wallet = String(req.body?.wallet || '').trim();
    const salaryMonth = String(req.body?.salary_month || '').trim();
    const level = req.body?.level;
    const query = DB.query().table('position_salary_record');
    if (wallet && Helper.parseInt(req.body?.search_team, 0) === 1) {
      const prefix = Database.prefix('default') || '';
      query.whereRaw(
        `LOWER(wallet) IN (SELECT LOWER(wallet) FROM ${prefix}wallet_relation WHERE inviter LIKE ?)`,
        [`%${wallet}%`]
      );
    } else if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (/^\d{4}-\d{2}$/u.test(salaryMonth)) query.where('salary_month', salaryMonth);
    if (level !== '' && level !== null && typeof level !== 'undefined') query.where('level', Number(level));
    return query.orderBy('id', 'desc');
}

async function list(req, res) {
  try {
    await ensurePositionSalaryTable();
    const page = Math.max(Helper.parseInt(req.body?.page, 1), 1);
    const pageSize = Math.min(Math.max(Helper.parseInt(req.body?.page_size, 20), 1), 100);
    const result = await recordQuery(req).paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取岗位工资记录成功'));
  } catch (error) { return res.send(ApiResult.exception(error, 'PositionSalaryService.list')); }
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+@-]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

async function exportCsv(req, res) {
  try {
    await ensurePositionSalaryTable();
    const rows = await recordQuery(req).get();
    const lines = [['ID', '工资流水号', '工资月份', '钱包地址', '发放等级', '工资金额', '币种', '发放时间'].map(csvCell).join(',')];
    for (const raw of rows || []) {
      const row = normalize(raw);
      lines.push([row.id, row.salary_id, row.salary_month, row.wallet, `${row.level}级`, row.amount, row.token, row.paid_at].map(csvCell).join(','));
    }
    const filename = `position-salary-records-${Helper.dateFormat('YYYYmmddHHMMSS', new Date())}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\ufeff${lines.join('\r\n')}\r\n`);
  } catch (error) { return res.send(ApiResult.exception(error, 'PositionSalaryService.exportCsv')); }
}

export default { list, exportCsv };
