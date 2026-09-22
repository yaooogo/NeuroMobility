import AssetToken from '../Util/AssetToken.js';
import CacheData from '../Util/CacheData.js';
import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import Helper from '../Util/Helper.js';
import { parseAssetAmount } from '../Util/AssetAmount.js';
import { ensurePositionSalaryTable } from '../Util/PositionSalarySchema.js';

const TOKEN = 'USDT';
const CONFIG_DECIMALS = 18;

function scaleRaw(value, fromDecimals, toDecimals) {
  const raw = BigInt(value);
  if (fromDecimals === toDecimals) return raw;
  const factor = 10n ** BigInt(Math.abs(toDecimals - fromDecimals));
  return toDecimals > fromDecimals ? raw * factor : raw / factor;
}

export function getSalaryPeriod(date = new Date()) {
  const dateText = Helper.dateFormat('YYYY-mm-dd', date);
  return { isPayday: dateText.endsWith('-01'), month: dateText.slice(0, 7) };
}

async function payWallet(candidate, salaryMonth, levelRules, tokenDecimals, paidAt) {
  let paid = false;
  try {
    await DB.transaction(async (configName, connection) => {
      const prefix = Database.prefix(configName) || '';
      const walletRows = await DB.query(configName, connection).exec(
        `SELECT * FROM ${prefix}wallet WHERE id=? AND status=1 LIMIT 1 FOR UPDATE`,
        [candidate.id]
      );
      const wallet = walletRows?.[0];
      if (!wallet) return;
      const walletAddress = String(wallet.wallet || '').trim().toLowerCase();
      const level = Number(wallet.is_manual_level) === 1
        ? Number(wallet.manual_level || 0)
        : Number(wallet.level || 0);
      const rule = levelRules.find(item => Number(item.level || 0) === level);
      if (!rule || Number(rule.position_salary || 0) <= 0) return;

      const existingRows = await DB.query(configName, connection).exec(
        `SELECT id FROM ${prefix}position_salary_record WHERE salary_month=? AND wallet=? LIMIT 1`,
        [salaryMonth, walletAddress]
      );
      if (existingRows?.length) return;

      const configuredAmount = BigInt(parseAssetAmount(String(rule.position_salary), CONFIG_DECIMALS));
      const assetAmount = scaleRaw(configuredAmount, CONFIG_DECIMALS, tokenDecimals);
      const paidAmount = scaleRaw(assetAmount, tokenDecimals, CONFIG_DECIMALS);
      if (assetAmount <= 0n || paidAmount <= 0n) return;

      const assetRows = await DB.query(configName, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
        [walletAddress, TOKEN]
      );
      const asset = assetRows?.[0];
      if (!asset) throw new Error(`岗位工资资产账户不存在: ${walletAddress} ${TOKEN}`);

      const salaryId = `S${salaryMonth.replace('-', '')}${walletAddress.replace(/^0x/u, '')}`;
      await DB.query(configName, connection).table('position_salary_record').insert({
        salary_id: salaryId,
        salary_month: salaryMonth,
        wallet: walletAddress,
        level,
        token: TOKEN,
        amount: paidAmount.toString(),
        paid_at: paidAt,
        created_at: paidAt,
        updated_at: paidAt
      });

      const before = BigInt(String(asset.balance || '0'));
      const after = before + assetAmount;
      await DB.query(configName, connection).table('wallet_assets').where('id', asset.id).update({
        balance: after.toString(), updated_at: paidAt
      });
      await DB.query(configName, connection).table('wallet_assets_logs').insert({
        biz_id: salaryId,
        wallet: walletAddress,
        token: TOKEN,
        balance: assetAmount.toString(),
        before_balance: before.toString(),
        after_balance: after.toString(),
        scene: 'position_salary',
        reason: `Position salary ${salaryMonth} level ${level}`,
        type: 'in',
        created_at: paidAt,
        updated_at: paidAt
      });
      paid = true;
    });
  } catch (error) {
    if (error?.code !== 'ER_DUP_ENTRY') throw error;
  }
  return paid;
}

async function distribute(runDate = new Date()) {
  const period = getSalaryPeriod(runDate);
  if (!period.isPayday) return { matched: 0, processed: 0, failed: 0, skipped: true };

  await ensurePositionSalaryTable();
  const [levelRules, token] = await Promise.all([
    CacheData.getWalletLevelRules(),
    AssetToken.getTokenItem(TOKEN)
  ]);
  const activeRules = levelRules.filter(rule => Number(rule.position_salary || 0) > 0);
  if (!activeRules.length) return { matched: 0, processed: 0, failed: 0 };

  const levels = activeRules.map(rule => Number(rule.level || 0));
  const levelPlaceholders = levels.map(() => '?').join(',');
  const prefix = Database.prefix('default') || '';
  const candidates = await DB.query().exec(
    `SELECT member.id
     FROM ${prefix}wallet AS member
     WHERE member.status=1
       AND (CASE WHEN member.is_manual_level=1 THEN member.manual_level ELSE member.level END) IN (${levelPlaceholders})
       AND NOT EXISTS (
         SELECT 1
         FROM ${prefix}position_salary_record AS salary
         WHERE salary.salary_month=?
           AND salary.wallet=LOWER(member.wallet)
       )
     ORDER BY member.id ASC`,
    [...levels, period.month]
  );
  const tokenDecimals = Number(token?.decimals ?? AssetToken.DEFAULT_DECIMALS);
  const paidAt = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', runDate);
  let processed = 0;
  let failed = 0;
  for (const candidate of candidates || []) {
    try {
      if (await payWallet(candidate, period.month, activeRules, tokenDecimals, paidAt)) processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[PositionSalary] walletId=${candidate.id} failed:`, error?.stack || error);
    }
  }
  if (processed > 0 || failed > 0) {
    console.log(`[PositionSalary] month=${period.month} processed=${processed} failed=${failed}`);
  }
  return { matched: (candidates || []).length, processed, failed };
}

export default { distribute };
