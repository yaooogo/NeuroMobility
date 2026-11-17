import DB from '../Util/database/DB.js';
import Database from '../Util/Database.js';
import Helper from '../Util/Helper.js';
import AssetToken from '../Util/AssetToken.js';
import { ensureTables } from '../services/Manage/StockDividendService.js';

export async function processItem(id) {
  await DB.transaction(async (config, connection) => {
    const p = Database.prefix(config) || '';
    const candidates = await DB.query(config, connection).table('stock_dividend_item').where('id', id).first();
    if (!candidates) return;
    const batches = await DB.query(config, connection).exec(`SELECT * FROM ${p}stock_dividend_batch WHERE id=? FOR UPDATE`, [candidates.batch_id]);
    if (![2, 3].includes(Number(batches[0]?.status))) return;
    const rows = await DB.query(config, connection).exec(`SELECT * FROM ${p}stock_dividend_item WHERE id=? FOR UPDATE`, [id]);
    const item = rows[0];
    if (Number(item.status) !== 0) return;
    const usdt = await AssetToken.getTokenItem('USDT');
    if (!usdt || Number(usdt.decimals ?? 18) !== Number(batches[0].decimals)) throw new Error('USDT 配置或精度已变化');
    const now = Helper.dateFormat();
    const amount = BigInt(item.amount);
    if (amount > 0n) {
      await DB.query(config, connection).exec(`INSERT IGNORE INTO ${p}wallet_assets (wallet,token,balance,frozen_balance,updated_at) VALUES (?,'USDT',0,0,?)`, [item.wallet, now]);
      const assets = await DB.query(config, connection).exec(`SELECT * FROM ${p}wallet_assets WHERE LOWER(wallet)=? AND token='USDT' FOR UPDATE`, [item.wallet]);
      const asset = assets[0];
      const before = BigInt(asset.balance); const after = before + amount;
      await DB.query(config, connection).table('wallet_assets').where('id', asset.id).update({ balance: after.toString(), updated_at: now });
      await DB.query(config, connection).table('wallet_assets_logs').insert({ biz_id: item.batch_id, wallet: item.wallet, token: 'USDT', balance: amount.toString(), before_balance: before.toString(), after_balance: after.toString(), scene: 'stock_dividend', reason: `股份分红 ${item.batch_id}`, type: 'in', created_at: now, updated_at: now });
    }
    await DB.query(config, connection).table('stock_dividend_item').where('id', id).update({ status: 1, error_message: '', paid_at: now });
  });
}
async function process() {
  await ensureTables();
  const p = Database.prefix('default') || '';
  const tasks = await DB.query().table('stock_dividend_batch').whereIn('status', [2, 3]).orderBy('created_at', 'asc').take(3).get();
  for (const task of tasks) {
    await DB.query().table('stock_dividend_batch').where('id', task.id).whereIn('status', [2, 3]).update({ status: 3 });
    const items = await DB.query().table('stock_dividend_item').where('batch_id', task.id).where('status', 0).orderBy('id', 'asc').take(100).get();
    for (const item of items) {
      try { await processItem(item.id); }
      catch (error) {
        // A failed member's transaction is rolled back; already credited members remain complete.
        await DB.query().table('stock_dividend_item').where('id', item.id).where('status', 0).update({ status: 2, error_message: String(error.message || error).slice(0, 500) });
      }
    }
    await DB.transaction(async (config, connection) => {
      await DB.query(config, connection).exec(`SELECT id FROM ${p}stock_dividend_batch WHERE id=? FOR UPDATE`, [task.id]);
      const stats = await DB.query(config, connection).exec(`SELECT COALESCE(SUM(status=0),0) AS pending, COALESCE(SUM(status=2),0) AS failed FROM ${p}stock_dividend_item WHERE batch_id=?`, [task.id]);
      if (Number(stats[0].pending)) return;
      await DB.query(config, connection).table('stock_dividend_batch').where('id', task.id).whereIn('status', [2, 3]).update({ status: Number(stats[0].failed) ? 4 : 1, paid_at: Number(stats[0].failed) ? null : Helper.dateFormat() });
    });
  }
}
export default { process };
