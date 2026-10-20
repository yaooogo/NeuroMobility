import test from 'node:test';
import assert from 'node:assert/strict';
import { teamWalletExclusion, applyTeamWalletExclusion } from '../Util/TeamWalletExclusion.js';

const first = `0x${'a'.repeat(40)}`;
const second = `0x${'b'.repeat(40)}`;

test('splits multiple separators and deduplicates addresses regardless of case', () => {
  const result = teamWalletExclusion(true, ` ${first.toUpperCase()},${second}\n${first}，${second};； `);
  assert.deepEqual(result, { sql: 'LOWER(wallet) NOT IN (?,?)', bindings: [first, second] });
});

test('does not exclude wallets when team search is disabled or input is empty', () => {
  assert.deepEqual(teamWalletExclusion(false, first), { sql: '', bindings: [] });
  assert.deepEqual(teamWalletExclusion(true, ' ,\n； '), { sql: '', bindings: [] });
});

test('binds input as values and supports an array from API clients', () => {
  const input = "x') OR 1=1 --";
  const calls = [];
  const query = { whereRaw: (...args) => calls.push(args) };
  assert.equal(applyTeamWalletExclusion(query, true, [first, second, first]), query);
  assert.deepEqual(calls, [['LOWER(wallet) NOT IN (?,?)', [first, second]]]);
  assert.ok(!teamWalletExclusion(true, input).sql.includes(input));
});
