import CacheData from '../Util/CacheData.js';
import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import Helper from '../Util/Helper.js';
import { parseAssetAmount } from '../Util/AssetAmount.js';
import { ensureGrowthSnapshotTable } from '../Util/GrowthSnapshotSchema.js';

const INVESTMENT_DECIMALS = 18;

export function getGrowthSnapshotPeriod(date = new Date()) {
  const dateText = Helper.dateFormat('YYYY-mm-dd', date);
  return { isSnapshotDay: dateText.endsWith('-01'), month: dateText.slice(0, 7) };
}

export function matchGrowthPercent(level, wholeVehicleCount, rules) {
  const matched = (rules || [])
    .filter(rule => Number(rule.level || 0) === Number(level || 0)
      && wholeVehicleCount >= BigInt(String(rule.whole_vehicle_count || 0)))
    .sort((a, b) => Number(b.whole_vehicle_count || 0) - Number(a.whole_vehicle_count || 0))[0];
  return Number(matched?.bonus_percent || 0);
}

async function captureWallet(candidate, month, wholeVehicleAmount, rules, now) {
  let captured = false;
  try {
    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      const walletRows = await DB.query(configName, connection).exec(
        `SELECT * FROM ${prefix}wallet WHERE id=? LIMIT 1 FOR UPDATE`,
        [candidate.id]
      );
      const wallet = walletRows?.[0];
      if (!wallet) return;
      const walletAddress = String(wallet.wallet || '').trim().toLowerCase();
      const existingRows = await DB.query(configName, connection).exec(
        `SELECT id FROM ${prefix}wallet_growth_snapshot WHERE snapshot_month=? AND wallet=? LIMIT 1`,
        [month, walletAddress]
      );
      if (existingRows?.length) return;

      const previousRows = await DB.query(configName, connection).exec(
        `SELECT community_invests
         FROM ${prefix}wallet_growth_snapshot
         WHERE wallet=? AND snapshot_month<?
         ORDER BY snapshot_month DESC
         LIMIT 1`,
        [walletAddress, month]
      );
      const communityInvests = BigInt(String(wallet.community_invests || '0'));
      const hasPrevious = Boolean(previousRows?.length);
      const previousCommunityInvests = hasPrevious
        ? BigInt(String(previousRows[0].community_invests || '0'))
        : communityInvests;
      const growthAmount = communityInvests > previousCommunityInvests
        ? communityInvests - previousCommunityInvests
        : 0n;
      const wholeVehicleCount = hasPrevious && wholeVehicleAmount > 0n
        ? growthAmount / wholeVehicleAmount
        : 0n;
      const level = Number(wallet.is_manual_level) === 1
        ? Number(wallet.manual_level || 0)
        : Number(wallet.level || 0);
      const growthPercent = hasPrevious ? matchGrowthPercent(level, wholeVehicleCount, rules) : 0;
      const snapshotId = `G${month.replace('-', '')}${walletAddress.replace(/^0x/u, '')}`;
      await DB.query(configName, connection).table('wallet_growth_snapshot').insert({
        snapshot_id: snapshotId,
        snapshot_month: month,
        wallet: walletAddress,
        level,
        community_invests: communityInvests.toString(),
        previous_community_invests: previousCommunityInvests.toString(),
        growth_amount: growthAmount.toString(),
        whole_vehicle_count: wholeVehicleCount.toString(),
        growth_percent: growthPercent.toFixed(4),
        created_at: now,
        updated_at: now
      });
      captured = true;
    });
  } catch (error) {
    if (error?.code !== 'ER_DUP_ENTRY') throw error;
  }
  return captured;
}

async function capture(runDate = new Date()) {
  const period = getGrowthSnapshotPeriod(runDate);
  await ensureGrowthSnapshotTable();
  if (!period.isSnapshotDay) return { matched: 0, processed: 0, failed: 0, skipped: true };
  const [investmentConfig, rules] = await Promise.all([
    CacheData.getInvestmentConfig(),
    CacheData.getGrowthRewardRules()
  ]);
  const wholeVehicleAmount = BigInt(parseAssetAmount(String(investmentConfig.whole_vehicle_tier), INVESTMENT_DECIMALS));
  const prefix = Database.prefix('default') || '';
  const candidates = await DB.query().exec(
    `SELECT member.id
     FROM ${prefix}wallet AS member
     WHERE NOT EXISTS (
       SELECT 1
       FROM ${prefix}wallet_growth_snapshot AS snapshot
       WHERE snapshot.snapshot_month=?
         AND snapshot.wallet=LOWER(member.wallet)
     )
     ORDER BY member.id ASC`,
    [period.month]
  );
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', runDate);
  let processed = 0;
  let failed = 0;
  for (const candidate of candidates || []) {
    try {
      if (await captureWallet(candidate, period.month, wholeVehicleAmount, rules, now)) processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[GrowthSnapshot] walletId=${candidate.id} failed:`, error?.stack || error);
    }
  }
  if (processed > 0 || failed > 0) {
    console.log(`[GrowthSnapshot] month=${period.month} processed=${processed} failed=${failed}`);
  }
  return { matched: (candidates || []).length, processed, failed };
}

export default { capture };
