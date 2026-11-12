import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentStart, assessmentPeriod, assessmentDateTime, matchPerformanceDeduction, subtractPercent, performanceSnapshotJoin } from '../Util/PerformanceAssessment.js';
import { calculateLevelRewardRates } from '../Util/LevelReward.js';
import { calculateDifferentialRewardRates, calculateGrossRewardAmount } from '../cron/investmentDividend.js';
import { parseAssetAmount } from '../Util/AssetAmount.js';
import DB from '../Util/database/DB.js';
import CacheData from '../Util/CacheData.js';
import growthSnapshot from '../cron/performanceSnapshot.js';
import monthlyGrowth, { getGrowthSnapshotPeriod } from '../cron/growthSnapshot.js';

test('first upgrade next day starts fixed 30-day periods, including year and leap boundaries', () => {
  const start = assessmentStart('2026-11-13');
  assert.equal(assessmentDateTime(start), '2026-11-14 00:00:00');
  assert.equal(assessmentDateTime(assessmentPeriod(start).end), '2026-12-14 00:00:00');
  assert.equal(assessmentDateTime(assessmentPeriod(start, 1).end), '2027-01-13 00:00:00');
  assert.equal(assessmentDateTime(assessmentPeriod(assessmentStart('2028-02-28')).end), '2028-03-30 00:00:00');
  assert.equal(assessmentDateTime(assessmentStart(new Date('2026-11-13T20:00:00Z'))), '2026-11-15 00:00:00');
});

test('growth remains calendar-month based and is independent of the first-upgrade anchor', async () => {
  assert.equal(getGrowthSnapshotPeriod(new Date('2026-11-30T16:00:00Z')).isSnapshotDay, true);
  assert.equal(getGrowthSnapshotPeriod(new Date('2026-12-14T00:00:00+08:00')).isSnapshotDay, false);
  const snapshots = [];
  const originals = { query: DB.query, transaction: DB.transaction, investment: CacheData.getInvestmentConfig,
    growth: CacheData.getGrowthRewardRules, config: CacheData.getSysConfig };
  DB.transaction = async callback => callback('default', {});
  DB.query = () => ({
    table() { return this; },
    async insert(row) { snapshots.push(row); },
    async exec(sql) {
      if (sql.includes('information_schema.COLUMNS')) return [];
      if (/^\s*(CREATE|ALTER|UPDATE)/u.test(sql)) return [];
      if (sql.includes('INTERVAL 31 DAY')) return []; // no 30-day deduction candidates
      if (sql.includes('SELECT member.id')) return [{ id: 1 }];
      if (sql.includes('FOR UPDATE')) return [{ id: 1, wallet: '0xabc', level: 1, community_invests: parseAssetAmount('200',18) }];
      if (sql.includes('SELECT id FROM')) return snapshots.length ? [{ id: 1 }] : [];
      if (sql.includes('SELECT community_invests')) return [{ community_invests: parseAssetAmount('100',18) }];
      throw new Error('Unexpected monthly SQL: ' + sql);
    }
  });
  CacheData.getInvestmentConfig = async () => ({ whole_vehicle_tier: 10 });
  CacheData.getGrowthRewardRules = async () => [{ level: 1, whole_vehicle_count: 10, bonus_percent: 2 }];
  CacheData.getSysConfig = async () => [];
  try {
    assert.equal((await monthlyGrowth.capture(new Date('2026-12-01T00:00:00+08:00'))).processed, 1);
    assert.equal(snapshots[0].snapshot_month, '2026-12');
    assert.equal(snapshots[0].growth_percent, '2.0000');
    assert.equal(snapshots[0].growth_amount, parseAssetAmount('100',18));
    assert.equal((await monthlyGrowth.capture(new Date('2026-12-01T12:00:00+08:00'))).processed, 0);
    assert.equal((await monthlyGrowth.capture(new Date('2026-12-14T00:00:00+08:00'))).skipped, true);
    assert.equal(snapshots.length, 1);
  } finally {
    DB.query = originals.query; DB.transaction = originals.transaction;
    CacheData.getInvestmentConfig = originals.investment; CacheData.getGrowthRewardRules = originals.growth;
    CacheData.getSysConfig = originals.config;
  }
});

test('matches lowest unmet threshold of own level, equality meets threshold', () => {
  const rules = [{ level: 1, target_amount: 200 }, { level: 2, target_amount: 10 }, { level: 1, target_amount: 100 }];
  const raw = amount => BigInt(parseAssetAmount(String(amount), 18));
  assert.equal(matchPerformanceDeduction(1, raw(99), rules).target_amount, 100);
  assert.equal(matchPerformanceDeduction(1, raw(100), rules).target_amount, 200);
  assert.equal(matchPerformanceDeduction(1, raw(200), rules), null);
  assert.equal(matchPerformanceDeduction(3, raw(0), rules), null);
});

test('deductions subtract percentage points separately from gross share and growth before differential', () => {
  const ancestors = [
    { wallet: 'a', level: 1, invests: '1', growth_percent: 2, deduction_differential_percent: 3, deduction_bonus_percent: 5 },
    { wallet: 'b', level: 2, invests: '1', growth_percent: 3, deduction_differential_percent: 2, deduction_bonus_percent: 1 },
    { wallet: 'c', level: 1, invests: '1', growth_percent: 99 },
    { wallet: 'd', level: 3, invests: '0' }
  ];
  const rules = [{ level: 1, differential_percent: 10 }, { level: 2, differential_percent: 20 }, { level: 3, differential_percent: 30 }];
  const rewards = calculateDifferentialRewardRates(ancestors, rules);
  assert.deepEqual(rewards.map(row => row.percent), [70000n, 130000n]);
  assert.equal(calculateGrossRewardAmount(1000n, rewards[0].percent), 70n);
  assert.equal(subtractPercent('10.1234', '2.0001'), 81233n);
  assert.equal(subtractPercent(5, 10), 0n);
});

test('expansion uses reduced configured percentages before level difference; absent snapshot means zero deduction', () => {
  const rules = [{ level: 1, expansion_reward_percent: 5 }, { level: 2, expansion_reward_percent: 8 }];
  const ancestors = [{ wallet: 'a', level: 1, deduction_expansion_reward_percent: 2 }, { wallet: 'b', level: 2 }];
  assert.deepEqual(calculateLevelRewardRates(ancestors, rules, 'expansion_reward_percent').map(row => row.percent), [30000n, 50000n]);
  assert.equal(subtractPercent(10, undefined), 100000n);
});

test('snapshot lookup selects latest completed period, without a calendar-month filter', () => {
  const sql = performanceSnapshotJoin('n_', 'relation.inviter');
  assert.match(sql, /latest.period_end<=\?/u);
  assert.match(sql, /ORDER BY latest.period_end DESC LIMIT 1/u);
  assert.doesNotMatch(sql, /snapshot_month/u);
});

test('capture catches up fixed periods, stores deductions, clamps net decline and is idempotent', async () => {
  const snapshots = [];
  const originals = { query: DB.query, transaction: DB.transaction, investment: CacheData.getInvestmentConfig,
    growth: CacheData.getGrowthRewardRules, config: CacheData.getSysConfig };
  const raw = amount => parseAssetAmount(String(amount), 18);
  const boundaryValues = { '2026-11-14 00:00:00': raw(100), '2026-12-14 00:00:00': raw(200), '2027-01-13 00:00:00': raw(150) };
  DB.transaction = async callback => callback('default', {});
  DB.query = () => ({
    table() { return this; },
    async insert(row) { snapshots.push(row); },
    async exec(sql, params = []) {
      if (sql.includes('information_schema.COLUMNS')) return [];
      if (/^\s*(CREATE|ALTER|UPDATE)/u.test(sql)) return [];
      if (sql.includes('SELECT member.id')) return [{ id: 1 }];
      if (sql.includes('FOR UPDATE')) return [{ id: 1, wallet: '0xabc', level: 1, first_level_upgrade_at: '2026-11-13 10:00:00', first_level_upgrade_date: '2026-11-13' }];
      if (sql.includes('ORDER BY period_end DESC')) return snapshots.length ? [snapshots.at(-1)] : [];
      if (sql.includes('AS total')) return [{ total: boundaryValues[params[0]] }];
      throw new Error('Unexpected SQL: ' + sql);
    }
  });
  CacheData.getInvestmentConfig = async () => ({ whole_vehicle_tier: 10 });
  CacheData.getGrowthRewardRules = async () => [{ level: 1, whole_vehicle_count: 10, bonus_percent: 2 }];
  CacheData.getSysConfig = async () => [{ level: 1, target_amount: 100, differential_percent: 3, expansion_reward_percent: 2, bonus_percent: 1, direct_dividend_reward_percent: 4 }];
  try {
    assert.equal((await growthSnapshot.capture(new Date('2026-12-13T23:59:59+08:00'))).processed, 0);
    assert.equal((await growthSnapshot.capture(new Date('2027-01-13T00:00:00+08:00'))).processed, 2);
    assert.equal(snapshots[0].growth_amount, raw(100));
    assert.equal(snapshots[0].growth_percent, undefined);
    assert.equal(snapshots[0].deduction_differential_percent, '0.0000');
    assert.equal(snapshots[1].growth_amount, '0');
    assert.equal(snapshots[1].deduction_direct_dividend_reward_percent, '4.0000');
    assert.equal(snapshots[1].deduction_expansion_reward_percent, '2.0000');
    assert.equal((await growthSnapshot.capture(new Date('2027-01-13T12:00:00+08:00'))).processed, 0);
    assert.equal(snapshots.length, 2);
  } finally {
    DB.query = originals.query; DB.transaction = originals.transaction;
    CacheData.getInvestmentConfig = originals.investment; CacheData.getGrowthRewardRules = originals.growth;
    CacheData.getSysConfig = originals.config;
  }
});
