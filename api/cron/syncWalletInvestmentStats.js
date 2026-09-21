import Database from '../Util/Database.js';
import DB from '../Util/database/DB.js';
import Helper from '../Util/Helper.js';
import { ensureInvestmentOrderTable } from '../Util/InvestmentSchema.js';

const BATCH_SIZE = 200;

function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

async function syncWallet(candidate) {
  let updated = false;
  await DB.transaction(async (configName, connection) => {
    const prefix = Database.prefix(configName) || '';
    const rows = await DB.query(configName, connection).exec(
      `SELECT id, wallet, level_isupdate
       FROM ${prefix}wallet
       WHERE id=?
       LIMIT 1
       FOR UPDATE`,
      [candidate.id]
    );
    const current = rows?.[0];
    if (!current || Number(current.level_isupdate || 0) !== 1) return;

    const wallet = normalizeWallet(current.wallet);
    const investmentRows = await DB.query(configName, connection).exec(
      `SELECT COALESCE(SUM(amount), 0) AS invests
       FROM ${prefix}investment_order
       WHERE LOWER(wallet)=?
         AND status IN (0, 1)`,
      [wallet]
    );
    const invests = String(investmentRows?.[0]?.invests || '0');

    const communityRows = await DB.query(configName, connection).exec(
      `SELECT COUNT(*) AS community_users,
              COALESCE(SUM((
                SELECT COALESCE(SUM(investment.amount), 0)
                FROM ${prefix}investment_order AS investment
                WHERE BINARY LOWER(investment.wallet)=BINARY team.wallet
                  AND investment.status IN (0, 1)
              )), 0) AS community_invests
       FROM (
         SELECT DISTINCT LOWER(relation.wallet) AS wallet
         FROM ${prefix}wallet_relation AS relation
         WHERE LOWER(relation.inviter)=?
       ) AS team`,
      [wallet]
    );
    const communityInvests = String(communityRows?.[0]?.community_invests || '0');
    const communityUsers = Number(communityRows?.[0]?.community_users || 0);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());

    await DB.query(configName, connection).table('wallet').where('id', current.id).update({
      invests,
      community_invests: communityInvests,
      community_users: communityUsers,
      level_isupdate: 0,
      updated_at: now
    });
    await DB.query(configName, connection).exec(
      `UPDATE ${prefix}wallet_relation
       SET wallet_invests=?, updated_at=?
       WHERE LOWER(wallet)=?`,
      [invests, now, wallet]
    );
    await DB.query(configName, connection).exec(
      `UPDATE ${prefix}wallet_relation
       SET inviter_invests=?, updated_at=?
       WHERE LOWER(inviter)=?`,
      [invests, now, wallet]
    );
    updated = true;
  });
  return updated;
}

async function sync() {
  await ensureInvestmentOrderTable();
  const rows = await DB.query().table('wallet')
    .where('level_isupdate', 1)
    .orderBy('id', 'asc')
    .take(BATCH_SIZE)
    .select(['id'])
    .get();

  let processed = 0;
  let failed = 0;
  for (const row of rows || []) {
    try {
      if (await syncWallet(row)) processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[SyncWalletInvestmentStats] walletId=${row.id} failed:`, error?.stack || error);
    }
  }
  if (processed > 0) console.log(`[SyncWalletInvestmentStats] processed=${processed}`);
  return { matched: (rows || []).length, processed, failed };
}

export default { sync };
