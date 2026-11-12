import { parseAssetAmount } from './AssetAmount.js';

const DAY = 86400000;
const OFFSET = 8 * 3600000;
export const DEDUCTION_FIELDS = ['differential_percent', 'expansion_reward_percent', 'bonus_percent', 'direct_dividend_reward_percent'];

// All assessment boundaries are midnight in Asia/Shanghai, independent of host TZ.
export function assessmentDateTime(value = new Date()) {
  return new Date(value.getTime() + OFFSET).toISOString().slice(0, 19).replace('T', ' ');
}

export function assessmentStart(value) {
  const day = value instanceof Date ? assessmentDateTime(value).slice(0, 10) : String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(day)) throw new Error('Invalid first level upgrade date');
  return new Date(new Date(`${day}T00:00:00+08:00`).getTime() + DAY);
}

export function assessmentPeriod(start, index = 0) {
  const periodStart = new Date(start.getTime() + index * 30 * DAY);
  const periodEnd = new Date(periodStart.getTime() + 30 * DAY);
  return { start: periodStart, end: periodEnd };
}

export function matchPerformanceDeduction(level, growth, rules) {
  return (rules || []).filter(rule => Number(rule.level) === Number(level)
    && growth < BigInt(parseAssetAmount(String(rule.target_amount), 18)))
    .sort((a, b) => {
      const left = BigInt(parseAssetAmount(String(a.target_amount), 18));
      const right = BigInt(parseAssetAmount(String(b.target_amount), 18));
      return left < right ? -1 : left > right ? 1 : 0;
    })[0] || null;
}

export function subtractPercent(base, deduction = 0) {
  const scaled = value => {
    const [integer, fraction = ''] = String(value ?? 0).split('.');
    return BigInt(integer) * 10000n + BigInt(fraction.slice(0, 4).padEnd(4, '0'));
  };
  const result = scaled(base) - scaled(deduction);
  return result > 0n ? result : 0n;
}

// Most recent completed assessment; old natural-month snapshots are never used.
export function performanceSnapshotJoin(prefix, walletExpression, nowExpression = '?') {
  return `LEFT JOIN ${prefix}wallet_performance_snapshot AS assessment
    ON assessment.id=(SELECT latest.id FROM ${prefix}wallet_performance_snapshot AS latest
      WHERE latest.wallet=LOWER(${walletExpression}) AND latest.period_end<=${nowExpression}
      ORDER BY latest.period_end DESC LIMIT 1)`;
}
