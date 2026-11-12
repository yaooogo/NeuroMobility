import CacheData from '../Util/CacheData.js';
import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import { investmentPerformanceSql } from '../Util/InvestmentPerformance.js';
import { ensureInvestmentOrderTable } from '../Util/InvestmentSchema.js';
import { ensurePerformanceSnapshotTable } from '../Util/PerformanceSnapshotSchema.js';
import { assessmentDateTime, assessmentStart, assessmentPeriod, matchPerformanceDeduction, DEDUCTION_FIELDS } from '../Util/PerformanceAssessment.js';
import { validatePerformanceDeductions } from '../config/performanceDeduction.js';

// Reconstruct boundary values from orders, rather than using a delayed stats cache.
// Membership uses the current referral tree; historical tree edits cannot be reconstructed.
async function communityAt(config, connection, prefix, wallet, boundary) {
  const rows = await DB.query(config, connection).exec(
    `SELECT COALESCE(SUM(${investmentPerformanceSql()}),0) AS total
     FROM ${prefix}investment_order AS investment
     WHERE investment.created_at<?
       AND (investment.status IN (0,1) OR investment.performance_ended_at>=?)
       AND EXISTS (SELECT 1 FROM ${prefix}wallet_relation AS relation
         WHERE LOWER(relation.inviter)=? AND LOWER(relation.wallet)=LOWER(investment.wallet))`,
    [boundary, boundary, wallet]);
  return BigInt(String(rows?.[0]?.total || '0'));
}

async function captureWallet(candidate, runDate, deductionRules) {
  let processed = 0;
  await DB.transaction(async (config, connection) => {
    const prefix = Database.prefix(config) || '';
    const rows = await DB.query(config, connection).exec(
      `SELECT * FROM ${prefix}wallet WHERE id=? LIMIT 1 FOR UPDATE`, [candidate.id]);
    const member = rows?.[0];
    if (!member?.first_level_upgrade_at) return;
    const wallet = String(member.wallet).trim().toLowerCase();
    const anchor = member.first_level_upgrade_date || member.first_level_upgrade_at;
    const start = assessmentStart(anchor);
    const latest = await DB.query(config, connection).exec(
      `SELECT * FROM ${prefix}wallet_performance_snapshot WHERE wallet=? ORDER BY period_end DESC LIMIT 1`, [wallet]);
    let index = 0;
    // The stored period start is a DATETIME; calculate the next index from the fixed anchor.
    if (latest.length) {
      const end = latest[0].period_end instanceof Date ? latest[0].period_end : new Date(String(latest[0].period_end).replace(' ', 'T') + '+08:00');
      index = Math.round((end.getTime() - start.getTime()) / (30 * 86400000));
    }
    let previous = latest.length ? BigInt(String(latest[0].community_invests)) : null;
    for (;;) {
      const period = assessmentPeriod(start, index);
      if (period.end > runDate) break;
      const periodStart = assessmentDateTime(period.start);
      const periodEnd = assessmentDateTime(period.end);
      if (previous === null) previous = await communityAt(config, connection, prefix, wallet, periodStart);
      const current = await communityAt(config, connection, prefix, wallet, periodEnd);
      const growth = current > previous ? current - previous : 0n;
      const level = Number(member.is_manual_level) === 1 ? Number(member.manual_level || 0) : Number(member.level || 0);
      const matched = matchPerformanceDeduction(level, growth, deductionRules);
      const snapshot = {
        wallet, anchor_date: assessmentDateTime(new Date(start.getTime() - 86400000)).slice(0,10),
        period_start: periodStart, period_end: periodEnd, level,
        previous_community_invests: previous.toString(), community_invests: current.toString(),
        growth_amount: growth.toString(),
        target_amount: String(matched?.target_amount || 0), created_at: assessmentDateTime(runDate)
      };
      for (const field of DEDUCTION_FIELDS) snapshot['deduction_' + field] = Number(matched?.[field] || 0).toFixed(4);
      await DB.query(config, connection).table('wallet_performance_snapshot').insert(snapshot);
      previous = current;
      index += 1;
      processed += 1;
    }
  });
  return processed;
}

async function capture(runDate = new Date()) {
  await ensureInvestmentOrderTable();
  await ensurePerformanceSnapshotTable();
  const rawDeductions = await CacheData.getSysConfig('performance_deduction_rules', 'json', []);
  const deductionRules = validatePerformanceDeductions(rawDeductions);
  const prefix = Database.prefix('default') || '';
  const candidates = await DB.query().exec(
    `SELECT member.id FROM ${prefix}wallet AS member
     WHERE member.first_level_upgrade_at IS NOT NULL
       AND DATE_ADD(DATE(COALESCE(member.first_level_upgrade_date,member.first_level_upgrade_at)), INTERVAL 31 DAY)<=?
       AND NOT EXISTS (SELECT 1 FROM ${prefix}wallet_performance_snapshot AS snapshot
         WHERE snapshot.wallet=LOWER(member.wallet) AND DATE_ADD(snapshot.period_end, INTERVAL 30 DAY)>?)
     ORDER BY member.id`, [assessmentDateTime(runDate), assessmentDateTime(runDate)]);
  let processed = 0, failed = 0;
  for (const candidate of candidates || []) {
    try { processed += await captureWallet(candidate,runDate,deductionRules); }
    catch (error) { failed += 1; console.error('[PerformanceSnapshot] walletId=' + candidate.id, error?.stack || error); }
  }
  // Reward callers must not silently use stale deductions after a snapshot failure.
  if (failed) throw new Error('Performance snapshot capture failed for ' + failed + ' wallets');
  return { matched: candidates.length, processed, failed };
}
export default { capture };
