import test from 'node:test';
import assert from 'node:assert/strict';
import DB from '../Util/database/DB.js';
import AssetToken from '../Util/AssetToken.js';
import { processItem } from '../cron/stockDividend.js';

test('member task credits once, rolls back failures, and resumes safely', async () => {
  const original = { query: DB.query, transaction: DB.transaction, token: AssetToken.getTokenItem };
  let state = { item: { id: 1, batch_id: 'batch', wallet: 'wallet', amount: '700', status: 0 }, asset: { id: 2, balance: '100' }, logs: [] };
  let failLog = false;
  let batchStatus = 0;
  DB.transaction = async callback => {
    const snapshot = structuredClone(state);
    try { await callback('default', {}); } catch (error) { state = snapshot; throw error; }
  };
  AssetToken.getTokenItem = async () => ({ decimals: 18 });
  DB.query = () => ({
    name: '', table(name) { this.name = name; return this; }, where() { return this; },
    async first() { return { ...state.item }; },
    async exec(sql) {
      if (sql.includes('stock_dividend_batch')) return [{ status: batchStatus, decimals: 18 }];
      if (sql.includes('stock_dividend_item')) return [{ ...state.item }];
      if (sql.startsWith('INSERT')) return [];
      if (sql.includes('wallet_assets')) return [{ ...state.asset }];
      throw new Error(sql);
    },
    async update(values) { Object.assign(this.name === 'wallet_assets' ? state.asset : state.item, values); },
    async insert(values) { if (failLog) throw new Error('log failed'); state.logs.push(values); }
  });
  try {
    await processItem(1);
    assert.equal(state.asset.balance, '100'); assert.equal(state.item.status, 0); assert.equal(state.logs.length, 0);
    batchStatus = 3;
    failLog = true;
    await assert.rejects(processItem(1), /log failed/);
    assert.equal(state.asset.balance, '100'); assert.equal(state.item.status, 0); assert.equal(state.logs.length, 0);
    failLog = false;
    await processItem(1);
    assert.equal(state.asset.balance, '800'); assert.equal(state.item.status, 1); assert.equal(state.logs.length, 1);
    await processItem(1);
    assert.equal(state.asset.balance, '800'); assert.equal(state.logs.length, 1);
  } finally { DB.query = original.query; DB.transaction = original.transaction; AssetToken.getTokenItem = original.token; }
});
