import { randomUUID, createHash } from 'node:crypto';
import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Database from '../../Util/Database.js';
import AssetToken from '../../Util/AssetToken.js';
import Helper from '../../Util/Helper.js';
import { parseAssetAmount, formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import { allocateStockDividend, allocatePerShareDividend } from '../../Util/StockDividend.js';

let ready = false;
export async function ensureTables() {
  if (ready) return;
  await ensureAssetTransferTables();
  const p = Database.prefix('default') || '';
  await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${p}stock_dividend_batch (
    id VARCHAR(40) PRIMARY KEY, amount DECIMAL(65,0) NOT NULL, shares DECIMAL(65,0) NOT NULL,
    holders INT NOT NULL, snapshot_hash VARCHAR(64) NOT NULL, decimals INT NOT NULL,
    stock_decimals INT NOT NULL, status TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL, paid_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const columns = await DB.query().exec(`SHOW COLUMNS FROM ${p}stock_dividend_batch`);
  for (const [name, type] of [['submitted_at', 'DATETIME DEFAULT NULL'], ['mode', "VARCHAR(20) NOT NULL DEFAULT 'total'"], ['per_share_amount', 'DECIMAL(65,0) DEFAULT NULL']]) {
    if (columns.some(row => row.Field === name)) continue;
    try { await DB.query().exec(`ALTER TABLE ${p}stock_dividend_batch ADD COLUMN ${name} ${type}`); }
    catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
  }
  await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${p}stock_dividend_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, batch_id VARCHAR(40) NOT NULL, wallet VARCHAR(80) NOT NULL,
    shares DECIMAL(65,0) NOT NULL, amount DECIMAL(65,0) NOT NULL,
    UNIQUE KEY batch_wallet (batch_id,wallet)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const itemColumns = await DB.query().exec(`SHOW COLUMNS FROM ${p}stock_dividend_item`);
  for (const [name, type] of [['status', 'TINYINT NOT NULL DEFAULT 1'], ['error_message', "VARCHAR(500) NOT NULL DEFAULT ''"], ['paid_at', 'DATETIME DEFAULT NULL']]) {
    if (itemColumns.some(row => row.Field === name)) continue;
    try { await DB.query().exec(`ALTER TABLE ${p}stock_dividend_item ADD COLUMN ${name} ${type}`); }
    catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
  }
  ready = true;
}
async function holders(config = 'default', connection = null, lock = false) {
  const p = Database.prefix(config) || '';
  const rows = await DB.query(config, connection).exec(`SELECT a.wallet,a.balance FROM ${p}wallet_assets a
    INNER JOIN ${p}wallet w ON LOWER(w.wallet)=LOWER(a.wallet)
    WHERE a.token='STOCK' AND a.balance>0 ORDER BY a.wallet${lock ? ' FOR UPDATE' : ''}`);
  return rows.map(row => ({ wallet: row.wallet.toLowerCase(), shares: String(row.balance) }));
}
function hash(rows) { return createHash('sha256').update(JSON.stringify(rows)).digest('hex'); }
function paging(req) {
  return [Math.max(1, Number.parseInt(req.body?.page, 10) || 1), Math.min(100, Math.max(1, Number.parseInt(req.body?.page_size, 10) || 20))];
}
function pageData(result, items) {
  return { items, total: result.total, page: result.currentPage, page_size: result.perPage, last_page: result.lastPage };
}
function publicBatch(row) {
  return { ...row, amount: formatAssetAmount(String(row.amount), Number(row.decimals)),
    mode: row.mode || 'total',
    per_share_amount: row.per_share_amount == null ? null : formatAssetAmount(String(row.per_share_amount), Number(row.decimals)),
    shares: formatAssetAmount(String(row.shares), Number(row.stock_decimals)) };
}
async function taskBatch(row) {
  const p = Database.prefix('default') || '';
  const stats = await DB.query().exec(`SELECT COUNT(*) AS total, COALESCE(SUM(status=1),0) AS completed, COALESCE(SUM(status=2),0) AS failed FROM ${p}stock_dividend_item WHERE batch_id=?`, [row.id]);
  return { ...publicBatch(row), completed: Number(stats[0].completed), failed: Number(stats[0].failed) };
}
async function list(req, res) {
  try {
    await ensureTables();
    const result = await DB.query().table('stock_dividend_batch').whereIn('status', [1, 2, 3, 4]).orderBy('created_at', 'desc').orderBy('id', 'desc').paginate(...paging(req));
    return res.send(ApiResult.success(pageData(result, await Promise.all(result.items.map(taskBatch)))));
  } catch (error) { return res.send(ApiResult.error(400, error.message)); }
}
async function prepare(req, res) {
  try {
    await ensureTables();
    const usdt = await AssetToken.getTokenItem('USDT');
    const stock = await AssetToken.getTokenItem('STOCK');
    if (!usdt || !stock) throw new Error('请先配置 USDT 和 STOCK 资产');
    const decimals = Number(usdt.decimals ?? 18);
    const stockDecimals = Number(stock.decimals ?? 18);
    const mode = String(req.body?.mode || 'total');
    if (!['total', 'per_share'].includes(mode)) throw new Error('无效的分红方式');
    const inputAmount = parseAssetAmount(String(req.body?.amount || ''), decimals);
    const rows = await holders();
    const allocation = mode === 'per_share' ? allocatePerShareDividend(inputAmount, rows, stockDecimals) : allocateStockDividend(inputAmount, rows);
    const amount = allocation.reduce((sum, row) => sum + row.amount, 0n).toString();
    if (amount.length > 64) throw new Error('分红总额超出允许范围');
    const batch = { id: randomUUID(), amount, shares: rows.reduce((sum, r) => sum + BigInt(r.shares), 0n).toString(),
      mode, per_share_amount: mode === 'per_share' ? inputAmount : null,
      holders: rows.length, snapshot_hash: hash(rows), decimals, stock_decimals: stockDecimals, status: 0, created_at: Helper.dateFormat() };
    await DB.transaction(async (config, connection) => {
      await DB.query(config, connection).table('stock_dividend_batch').insert(batch);
      for (let offset = 0; offset < allocation.length; offset += 500) {
        await DB.query(config, connection).table('stock_dividend_item').insert(allocation.slice(offset, offset + 500).map(item => ({
          batch_id: batch.id, wallet: item.wallet, shares: item.shares, amount: item.amount.toString(), status: 0
        })));
      }
    });
    return res.send(ApiResult.success(publicBatch(batch)));
  } catch (error) { return res.send(ApiResult.error(400, error.message)); }
}
async function detail(req, res) {
  try {
    await ensureTables();
    const batch = await DB.query().table('stock_dividend_batch').where('id', String(req.body?.batch_id || '')).first();
    if (!batch) throw new Error('分红批次不存在');
    const result = await DB.query().table('stock_dividend_item').where('batch_id', batch.id).orderBy('id', 'asc').paginate(...paging(req));
    return res.send(ApiResult.success({ ...pageData(result, result.items.map(row => ({ wallet: row.wallet, status: Number(row.status), error_message: row.error_message, paid_at: row.paid_at,
      shares: formatAssetAmount(String(row.shares), Number(batch.stock_decimals)), amount: formatAssetAmount(String(row.amount), Number(batch.decimals)) }))), batch: await taskBatch(batch) }));
  } catch (error) { return res.send(ApiResult.error(400, error.message)); }
}
async function pay(req, res) {
  try {
    if (String(req.body?.confirmed) !== '1') throw new Error('请先预览并明确确认分发');
    await ensureTables();
    await DB.transaction(async (config, connection) => {
      const p = Database.prefix(config) || '';
      const batches = await DB.query(config, connection).exec(`SELECT * FROM ${p}stock_dividend_batch WHERE id=? FOR UPDATE`, [String(req.body?.batch_id || '')]);
      const batch = batches?.[0];
      if (!batch) throw new Error('分红批次不存在');
      if (Number(batch.status) === 1) return;
      if ([2, 3].includes(Number(batch.status))) return;
      const count = await DB.query(config, connection).table('stock_dividend_item').where('batch_id', batch.id).count();
      if (!Number(count)) throw new Error('旧预览没有会员快照，请重新预览');
      await DB.query(config, connection).table('stock_dividend_item').where('batch_id', batch.id).where('status', 2).update({ status: 0, error_message: '' });
      await DB.query(config, connection).table('stock_dividend_batch').where('id', batch.id).update({ status: 2, submitted_at: batch.submitted_at || Helper.dateFormat() });
    });
    return res.send(ApiResult.success({}, '分红任务已提交，请在任务列表查看进度'));
  } catch (error) { return res.send(ApiResult.error(400, error.message)); }
}
export default { list, prepare, pay, detail };
