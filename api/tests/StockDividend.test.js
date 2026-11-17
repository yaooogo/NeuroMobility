import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateStockDividend, allocatePerShareDividend } from '../Util/StockDividend.js';
test('per-share 20 USDT across 50 shares pays 1000 USDT', () => {
  const unit = 10n ** 18n;
  const rows = allocatePerShareDividend(20n * unit, [{ wallet: 'a', shares: 10n * unit }, { wallet: 'b', shares: 40n * unit }], 18);
  assert.deepEqual(rows.map(row => row.amount), [200n * unit, 800n * unit]);
});
test('per-share fractional holdings truncate at token precision without redistribution', () => {
  const rows = allocatePerShareDividend(3n, [{ wallet: 'a', shares: 15n }, { wallet: 'b', shares: 25n }], 1);
  assert.deepEqual(rows.map(row => row.amount), [4n, 7n]);
  assert.throws(() => allocatePerShareDividend(0n, [{ wallet: 'a', shares: 1n }], 18));
  assert.throws(() => allocatePerShareDividend(1n, [], 18));
  assert.throws(() => allocatePerShareDividend(1n, [{ wallet: 'a', shares: 1n }], 18));
});
test('1000 USDT across 50 shares distributes 20 per share', () => {
  const unit = 10n ** 18n;
  const rows = allocateStockDividend(1000n * unit, [{ wallet: 'a', shares: 10n * unit }, { wallet: 'b', shares: 40n * unit }]);
  assert.deepEqual(rows.map(r => r.amount), [200n * unit, 800n * unit]);
});
test('fractional shares and rounding preserve the exact total deterministically', () => {
  const rows = allocateStockDividend(10n, [{ wallet: 'c', shares: 1n }, { wallet: 'b', shares: 1n }, { wallet: 'a', shares: 1n }]);
  assert.equal(rows.reduce((s, r) => s + r.amount, 0n), 10n);
  assert.equal(rows.find(r => r.wallet === 'a').amount, 4n);
  assert.deepEqual(allocateStockDividend(100n, [{ wallet: 'a', shares: 5n }, { wallet: 'b', shares: 15n }]).map(r => r.amount), [25n, 75n]);
});
test('zero total or no holders cannot be distributed', () => {
  assert.throws(() => allocateStockDividend(0n, [{ wallet: 'a', shares: 1n }]));
  assert.throws(() => allocateStockDividend(100n, []));
});
