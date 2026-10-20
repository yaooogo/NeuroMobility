import test from 'node:test';
import assert from 'node:assert/strict';
import DB from '../Util/database/DB.js';
import ManagePermission from '../Util/ManagePermission.js';
import WithdrawalLimitService from '../services/Manage/WithdrawalLimitService.js';
import { chooseRule, effectiveLevel, limitRaw, validateLimitRules, enforceWithdrawalLimit } from '../Util/WithdrawalLimitRules.js';

const tokens = [{ value: 'USDT', decimals: 18 }];
const fixed = { token: 'USDT', daily_limit: '100', scope_type: 'personal', limit_type: 'fixed' };
const root = `0x${'a'.repeat(40)}`;
const leaf = `0x${'b'.repeat(40)}`;

test('validates levels, percentage precision, scope, duplicate tokens and unsupported limit modes', () => {
  assert.equal(validateLimitRules([fixed], tokens)[0].daily_limit, '100');
  assert.throws(() => validateLimitRules([{ ...fixed, limit_type: 'mining_rig' }], tokens));
  assert.throws(() => validateLimitRules([{ ...fixed, daily_limit: '-1' }], tokens));
  assert.throws(() => validateLimitRules([{ ...fixed, limit_type: 'percent', daily_limit: '100.000001' }], tokens));
  assert.throws(() => validateLimitRules([{ ...fixed, limit_type: 'percent', daily_limit: '1.1234567' }], tokens));
  assert.throws(() => validateLimitRules([{ ...fixed, scope_type: 'other' }], tokens));
  assert.throws(() => validateLimitRules([fixed, fixed], tokens));
  assert.throws(() => validateLimitRules([{ ...fixed, level: 4, enabled: 1 }], tokens, true));
  assert.equal(validateLimitRules([{ ...fixed, level: 3, enabled: 1 }], tokens, true)[0].level, 3);
});

test('uses the manual level and calculates fixed and percentage limits exactly', () => {
  assert.equal(effectiveLevel({ level: 1, is_manual_level: 1, manual_level: 3 }), 3);
  assert.equal(effectiveLevel({ level: 2, is_manual_level: 0, manual_level: 3 }), 2);
  assert.equal(limitRaw(fixed, 18), 100n * 10n ** 18n);
  assert.equal(limitRaw({ limit_type: 'percent', daily_limit: '12.5' }, 18, 101n), 12n);
  assert.equal(limitRaw({ limit_type: 'percent', daily_limit: '0' }, 18, 999n), 0n);
});

test('level overrides team, nearest team wins and missing token falls back to asset defaults', () => {
  const configs = [{ wallet: root, rules_json: JSON.stringify([fixed]) }, { wallet: leaf, rules_json: [{ ...fixed, daily_limit: '25' }] }];
  assert.equal(chooseRule({ ...fixed, daily_limit: '0' }, configs, [leaf, root], 'USDT', '5').source, 'level');
  assert.equal(chooseRule(null, configs, [leaf, root], 'USDT', '5').daily_limit, '25');
  assert.equal(chooseRule(null, configs, [leaf, root], 'OTHER', '5').source, 'asset');
  assert.equal(chooseRule(null, [], [leaf], 'USDT', '5').daily_limit, '5');
});

test('enforcement uses shared team scope, counts reservations and rejects exceeding amounts', async () => {
  const original = DB.query;
  const sqlCalls = [];
  let income = '200'; let used = '10'; let level = null;
  let rule = { ...fixed, scope_type: 'team', daily_limit: '20' };
  DB.query = () => {
    let table;
    const builder = {
      table(value) { table = value; return this; }, where() { return this; }, whereRaw() { return this; }, orderBy() { return this; },
      async get() { return table === 'wallet_relation' ? [{ inviter: root, lv: 1 }] : [{ wallet: root, rules_json: [rule] }]; },
      async first() { return level; },
      async exec(sql, bindings) { sqlCalls.push({ sql, bindings }); return [{ total: sql.includes('wallet_assets_logs') ? income : used }]; }
    };
    return builder;
  };
  const run = rawDebit => enforceWithdrawalLimit({ wallet: leaf, walletInfo: { level: 1 }, token: 'USDT', decimals: 0, rawDebit, defaultLimit: '5', config: 'default', connection: {} });
  try {
    await run(10n);
    await assert.rejects(run(11n), /Daily withdrawal limit/);
    assert.ok(sqlCalls[0].sql.includes('status IN (0,1,2)'));
    assert.ok(sqlCalls[0].sql.includes('CURDATE()'));
    assert.deepEqual(sqlCalls[0].bindings, ['USDT', root, root]);
    rule = { ...rule, limit_type: 'percent', daily_limit: '10' };
    await run(10n);
    income = '0';
    await assert.rejects(run(1n), /Daily withdrawal limit/);
    level = { ...fixed, daily_limit: '0' };
    await run(1000000n); // An enabled fixed zero level rule overrides the restrictive team rule.
    level = { ...fixed, daily_limit: '20' };
    sqlCalls.length = 0;
    await run(10n);
    assert.deepEqual(sqlCalls[0].bindings, ['USDT', leaf]);
  } finally { DB.query = original; }
});

test('routes require the matching permissions and create permission cannot edit existing configs', async () => {
  const original = DB.query;
  let permissions = ['team-withdraw-limit-rules'];
  DB.query = () => {
    const builder = {
      table() { return this; }, where() { return this; },
      async first() { return { id: 1, status: 1, permissions }; },
      async exec() { return []; }
    };
    return builder;
  };
  const check = async (path, expected) => {
    let allowed = false; let response;
    await ManagePermission.verifyRequestPermission({ path, auth: { id: () => 1 }, body: {} }, { send: value => { response = value; } }, () => { allowed = true; });
    assert.equal(allowed, expected);
    if (!expected) assert.equal(response.code, 403);
  };
  try {
    await check('/withdraw-limit/team/list', true);
    await check('/withdraw-limit/team/save', false);
    await check('/withdraw-limit/team/toggle', false);
    await check('/withdraw-limit/level/save', false);
    permissions = ['team-withdraw-limit-rules-toggle'];
    await check('/withdraw-limit/team/toggle', true);
    permissions = ['level-withdraw-limit-rules-update'];
    await check('/withdraw-limit/level/save', true);
    let response;
    await WithdrawalLimitService.teamSave({ body: { id: 1 }, auth: { user: { permissions: ['team-withdraw-limit-rules-create'] } } }, { send: value => { response = value; } });
    assert.equal(response.code, 403);
  } finally { DB.query = original; }
});
