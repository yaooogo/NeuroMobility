import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import DB from '../Util/database/DB.js';
import CacheData from '../Util/CacheData.js';
import AssetToken from '../Util/AssetToken.js';
import InvestmentService from '../services/Api/InvestmentService.js';
import ManageInvestmentService from '../services/Manage/InvestmentOrderService.js';
import ManagePermission from '../Util/ManagePermission.js';
import { getDefaultInvestmentConfig } from '../config/investmentConfig.js';
import { agreementEndDate, agreementDateTime, ensureInvestmentAgreementTable, validateAgreementInvestor, validateAgreementSignature } from '../Util/InvestmentAgreement.js';

const wallet = `0x${'a'.repeat(40)}`;
const otherWallet = `0x${'b'.repeat(40)}`;
const unit = 10n ** 18n;
const investor = { name: 'Test Investor', document_number: 'P12345678', phone: '+60123456789', email: 'test@example.com' };

function signaturePng() {
  function chunk(type, bytes) {
    const data = Buffer.concat([Buffer.from(type), bytes]);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let index = 0; index < 8; index++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const header = Buffer.alloc(4); header.writeUInt32BE(bytes.length);
    const tail = Buffer.alloc(4); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([header, data, tail]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(200); header.writeUInt32BE(100, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc(801 * 100);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) {
    const offset = y * 801 + 1 + x * 4;
    if (Math.abs(y - x / 2) < 3) { pixels[offset] = 125; pixels[offset + 2] = 200; pixels[offset + 3] = 255; }
  }
  return `data:image/png;base64,${Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`;
}

test('agreement dates, investor validation and signature limits', () => {
  assert.equal(agreementDateTime('2026-11-03T00:15:30.123Z'), '2026-11-03 08:15:30');
  assert.equal(agreementDateTime('2026-11-03T16:00:00.000Z'), '2026-11-04 00:00:00');
  assert.equal(agreementEndDate('2024-02-29'), '2025-02-28');
  assert.equal(agreementEndDate('2026-11-03'), '2027-11-03');
  assert.deepEqual(validateAgreementInvestor(investor), investor);
  assert.throws(() => validateAgreementInvestor({ ...investor, name: '' }));
  assert.throws(() => validateAgreementInvestor({ ...investor, email: 'invalid' }));
  assert.throws(() => validateAgreementInvestor({ ...investor, document_number: 'bad\nvalue' }));
  assert.throws(() => validateAgreementSignature('data:image/svg+xml,<svg/>'));
  assert.throws(() => validateAgreementSignature('data:image/png;base64,AAAA'));
  assert.throws(() => validateAgreementSignature(`data:image/png;base64,${'A'.repeat(180000)}`));
  assert.equal(validateAgreementSignature(signaturePng()), signaturePng());
});

test('existing varchar agreement dates are converted before altering columns to datetime', async t => {
  const statements = [];
  t.mock.method(DB, 'query', () => ({ async exec(sql) {
    statements.push(sql);
    if (sql.includes('information_schema')) return [
      { COLUMN_NAME: 'signed_at', DATA_TYPE: 'varchar' }, { COLUMN_NAME: 'created_at', DATA_TYPE: 'varchar' }
    ];
    return [];
  } }));
  await Promise.all([ensureInvestmentAgreementTable(), ensureInvestmentAgreementTable()]);
  assert.equal(statements.filter(sql => sql.startsWith('CREATE TABLE')).length, 1);
  for (const field of ['signed_at', 'created_at']) {
    const conversion = statements.findIndex(sql => sql.startsWith('UPDATE') && sql.includes(`SET ${field}=`));
    const alter = statements.findIndex(sql => sql.includes(`MODIFY COLUMN ${field} DATETIME`));
    assert(conversion >= 0 && alter > conversion);
    assert(statements[conversion].includes("'+00:00','+08:00'"));
  }
});

test('admin agreement endpoint requires investment order viewing permission', async t => {
  let permissions = ['investment-orders'];
  t.mock.method(DB, 'query', () => ({ table() { return this; }, where() { return this; }, async first() { return { id: 1, status: 1, permissions }; } }));
  async function check(expected) {
    let allowed = false;
    let response;
    await ManagePermission.verifyRequestPermission({ path: '/investment-order/agreement', body: {}, auth: { id: () => 1 } },
      { send: value => { response = value; } }, () => { allowed = true; });
    assert.equal(allowed, expected);
    if (!expected) assert.equal(response.code, 403);
  }
  await check(true);
  permissions = ['investment-orders-create'];
  await check(false);
  permissions = ['wallets'];
  await check(false);
});

test('investment agreement service binds signing, ownership, debit and order atomically', async t => {
  let state;
  let failSave = false;
  const config = { ...getDefaultInvestmentConfig(), mixed_usdt_percent: 70, mixed_minimum_investment_amount: 500, rusdt_investment_enabled: 1, mixed_investment_enabled: 1 };
  function reset() {
    state = { investment_agreement: [], investment_order: [], wallet_assets_logs: [], wallet_relation: [],
      wallet: [{ id: 1, wallet, status: 1, invests: '0' }],
      wallet_assets: [{ id: 1, wallet, token: 'USDT', balance: String(100000n * unit) }, { id: 2, wallet, token: 'RUSD', balance: String(100000n * unit) }] };
    failSave = false;
  }
  reset();
  t.mock.method(CacheData, 'getInvestmentConfig', async () => config);
  t.mock.method(CacheData, 'getWalletLevelRules', async () => []);
  t.mock.method(AssetToken, 'getTokenItem', async value => ({ value, decimals: 18 }));
  t.mock.method(DB, 'query', () => {
    let table;
    const conditions = [];
    const extraConditions = [];
    const matches = row => conditions.every(([field, value]) => String(row[field]) === String(value)) && extraConditions.every(filter => filter(row));
    const query = {
      table(value) { table = value; return this; },
      where(field, value) { conditions.push([field, value]); return this; },
      whereRaw(sql, args = []) {
        if (sql === 'LOWER(wallet)=?') conditions.push(['wallet', args[0]]);
        if (sql === 'signed_at IS NOT NULL') extraConditions.push(row => row.signed_at != null);
        return this;
      },
      whereIn(field, values) { extraConditions.push(row => values.includes(row[field])); return this; },
      select() { return this; }, orderBy() { return this; }, take() { return this; },
      async first() { return state[table].find(matches); },
      async get() { return state[table].filter(matches); },
      async paginate() { const items = state[table].filter(matches); return { items, total: items.length, currentPage: 1, perPage: 20, lastPage: 1 }; },
      async insert(row, result) { const id = state[table].length + 1; state[table].push({ id, ...row }); if (result) result.insertId = id; return id; },
      async update(values) {
        if (table === 'investment_agreement' && failSave) throw new Error('Simulated agreement persistence failure');
        for (const row of state[table].filter(matches)) Object.assign(row, values);
      },
      async exec(sql, args = []) {
        if (sql.startsWith('CREATE') || sql.startsWith('ALTER') || sql.startsWith('UPDATE')) return [];
        if (sql.includes('information_schema')) return ['token', 'tx_hash', 'is_direct', 'token_contract', 'debit_amount', 'deadline', 'is_gift', 'mixed_usdt_percent', 'dividend_multiple', 'dividend_min_percent', 'dividend_max_percent', 'exit_multiple', 'guaranteed_eligible'].map(COLUMN_NAME => ({ COLUMN_NAME }));
        if (sql.includes('investment_agreement')) return state.investment_agreement.filter(row => row.agreement_id === args[0] && row.wallet === args[1]);
        if (sql.includes('wallet_assets WHERE')) return state.wallet_assets.filter(row => row.wallet === args[0] && row.token === args[1]);
        if (sql.includes('wallet WHERE')) return state.wallet.filter(row => row.wallet === args[0]);
        if (sql.includes('wallet_relation')) return [];
        if (sql.includes('team_investment_config') || sql.includes('COUNT(*)')) return [];
        if (sql.includes('SUM(amount)')) return [{ amount: '0' }];
        throw new Error(`Unexpected query: ${sql}`);
      }
    };
    return query;
  });
  t.mock.method(DB, 'transaction', async callback => {
    const before = structuredClone(state);
    try { return await callback('default', {}); }
    catch (error) { state = before; throw error; }
  });
  async function call(method, body, caller = wallet) {
    let response;
    await InvestmentService[method]({ auth: { address: () => caller }, body }, { send(value) { response = value; return value; } });
    return response;
  }
  async function callManage(method, body) {
    let response;
    await ManageInvestmentService[method]({ body }, { send(value) { response = value; return value; } });
    return response;
  }
  const prepare = (amount = '2000', token = 'USDT') => call('prepareAgreement', { amount, token, investor, maturity: 'refund' });
  const signedBody = draft => ({ amount: draft.amount, token: draft.token, agreement_id: draft.agreement_id, agreement_signature: signaturePng(), agreement_consents: [true, true, true, true] });

  await t.test('threshold includes exactly 1000 USDT and excludes pure RUSD and mixed USDT below threshold', async () => {
    assert.equal((await prepare('1000', 'USDT')).code, 0);
    for (const [amount, token] of [['2000', 'RUSD'], ['1000', 'USDT+RUSD']]) assert.notEqual((await prepare(amount, token)).code, 0);
    const mixed = await prepare('1500', 'USDT+RUSD');
    assert.equal(mixed.code, 0);
    assert.equal(mixed.data.usdt_amount, '1050');
    assert.match(mixed.data.content, /USD 1050/u);
    assert.equal(mixed.data.term_months, 12);
    config.mixed_usdt_percent = 50;
    const exactMixed = await prepare('2000', 'USDT+RUSD');
    assert.equal(exactMixed.code, 0);
    assert.equal(exactMixed.data.usdt_amount, '1000');
    const missingMixed = await call('create', { amount: '2000', token: 'USDT+RUSD' });
    assert.equal(missingMixed.code, 409);
    assert.equal(state.investment_order.length, 0);
    assert.equal(state.wallet_assets[0].balance, String(100000n * unit));
    config.mixed_usdt_percent = 66.6667;
    const fractional = await prepare('1500', 'USDT+RUSD');
    assert.equal(fractional.code, 0);
    assert.equal(fractional.data.usdt_amount, '1000.0005');
    config.mixed_usdt_percent = 70;
  });
  await t.test('qualifying investment cannot bypass signature or any consent', async () => {
    const missing = await call('create', { amount: '2000', token: 'USDT' });
    assert.equal(missing.code, 409);
    assert.equal(missing.data.agreement_required, true);
    const { data: draft } = await prepare();
    assert.notEqual((await call('create', { ...signedBody(draft), agreement_consents: [true, false, true, true] })).code, 0);
    assert.notEqual((await call('create', { ...signedBody(draft), agreement_signature: '' })).code, 0);
    assert.equal(state.investment_order.length, 0);
  });
  await t.test('rejects another wallet, changed amount and stale date without debiting', async () => {
    const { data: draft } = await prepare();
    assert.notEqual((await call('create', signedBody(draft), otherWallet)).code, 0);
    assert.notEqual((await call('create', { ...signedBody(draft), amount: '3000' })).code, 0);
    const row = state.investment_agreement.find(row => row.agreement_id === draft.agreement_id);
    row.snapshot = JSON.stringify({ ...draft, start_date: '2020-01-01' });
    assert.notEqual((await call('create', signedBody(draft))).code, 0);
    assert.equal(state.wallet_assets[0].balance, String(100000n * unit));
  });
  await t.test('failed agreement persistence rolls back wallet debit and order', async () => {
    const { data: draft } = await prepare();
    failSave = true;
    const response = await call('create', signedBody(draft));
    assert.notEqual(response.code, 0);
    assert.equal(state.investment_order.length, 0);
    assert.equal(state.wallet_assets_logs.length, 0);
    assert.equal(state.wallet_assets[0].balance, String(100000n * unit));
    failSave = false;
  });
  await t.test('signed agreement is saved with content hash; repeated submission debits only once', async () => {
    const { data: draft } = await prepare();
    const first = await call('create', signedBody(draft));
    assert.equal(first.code, 0);
    const repeated = await call('create', { ...signedBody(draft), agreement_consents: ['true', 'true', 'true', 'true'] });
    assert.equal(repeated.code, 0);
    assert.equal(first.data.order_id, repeated.data.order_id);
    assert.equal(state.investment_order.length, 1);
    assert.equal(state.wallet_assets_logs.length, 1);
    assert.equal(state.wallet_assets[0].balance, String(98000n * unit));
    const saved = await call('agreement', { order_id: first.data.order_id });
    assert.equal(saved.code, 0);
    assert.equal(saved.data.content, draft.content);
    assert.equal(saved.data.signature, signaturePng());
    assert.equal(saved.data.content_sha256, createHash('sha256').update(draft.content).digest('hex'));
    assert.deepEqual(saved.data.consents, [true, true, true, true]);
    assert.equal(saved.data.status, 'signed');
    assert(saved.data.signed_at);
    assert.match(saved.data.signed_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u);
    assert.equal(saved.data.signed_at, JSON.parse(state.investment_agreement.find(row => row.order_id === first.data.order_id).snapshot).signed_at);
    assert.equal((await call('agreement', { order_id: first.data.order_id }, otherWallet)).code, 404);
  });
  await t.test('order list exposes agreement availability only for signed records owned by the wallet', async () => {
    state.investment_order.push({ ...state.investment_order[0], id: 2, order_id: 'LEGACY' });
    state.investment_agreement.push({ agreement_id: 'PENDING', wallet, order_id: 'LEGACY', signed_at: null });
    state.investment_agreement.push({ agreement_id: 'OTHER', wallet: otherWallet, order_id: 'LEGACY', signed_at: new Date().toISOString() });
    const response = await call('list', {});
    assert.equal(response.code, 0);
    const signedOrder = response.data.items.find(order => order.order_id !== 'LEGACY');
    const legacyOrder = response.data.items.find(order => order.order_id === 'LEGACY');
    assert.equal(signedOrder.has_agreement, true);
    assert(signedOrder.agreement_id);
    assert.equal(legacyOrder.has_agreement, false);
    assert.equal(legacyOrder.agreement_id, '');
    assert.equal(signedOrder.signature, undefined);
    assert.equal(signedOrder.investor, undefined);
  });
  await t.test('admin list and detail expose signed agreements while rejecting missing or mismatched records', async () => {
    const response = await callManage('list', {});
    assert.equal(response.code, 0);
    const signedOrder = response.data.items.find(order => order.order_id !== 'LEGACY');
    const legacyOrder = response.data.items.find(order => order.order_id === 'LEGACY');
    assert.equal(signedOrder.has_agreement, true);
    assert.equal(legacyOrder.has_agreement, false);
    const detail = await callManage('agreement', { order_id: signedOrder.order_id });
    assert.equal(detail.code, 0);
    assert.equal(detail.data.agreement_id, signedOrder.agreement_id);
    assert.deepEqual(detail.data.investor, investor);
    assert.equal(detail.data.signature, signaturePng());
    assert.equal((await callManage('agreement', { order_id: 'LEGACY' })).code, 404);
    assert.equal((await callManage('agreement', { order_id: 'MISSING' })).code, 404);
    assert.equal((await callManage('agreement', {})).code, 400);
  });
  await t.test('exactly 1000 USDT requires signing before debit, while pure RUSD does not', async () => {
    reset();
    const unsigned = await call('create', { amount: '1000', token: 'USDT' });
    assert.equal(unsigned.code, 409);
    assert.equal(state.investment_order.length, 0);
    assert.equal(state.wallet_assets[0].balance, String(100000n * unit));
    const { data: draft } = await prepare('1000', 'USDT');
    assert.equal((await call('create', signedBody(draft))).code, 0);
    assert.equal(state.wallet_assets[0].balance, String(99000n * unit));
    assert.equal((await call('create', { amount: '1000', token: 'RUSD' })).code, 0);
    assert.equal(state.investment_agreement.length, 1);
    assert.equal(state.investment_order.length, 2);
  });
});
