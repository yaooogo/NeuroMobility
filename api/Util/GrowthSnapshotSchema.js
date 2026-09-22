import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensureGrowthSnapshotTable() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}wallet_growth_snapshot (
      id BIGINT NOT NULL AUTO_INCREMENT,
      snapshot_id VARCHAR(100) NOT NULL,
      snapshot_month CHAR(7) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      level INT NOT NULL DEFAULT 0,
      community_invests DECIMAL(65,0) NOT NULL DEFAULT 0,
      previous_community_invests DECIMAL(65,0) NOT NULL DEFAULT 0,
      growth_amount DECIMAL(65,0) NOT NULL DEFAULT 0,
      whole_vehicle_count DECIMAL(65,0) NOT NULL DEFAULT 0,
      growth_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_wallet_growth_snapshot_id (snapshot_id),
      UNIQUE KEY uk_wallet_growth_snapshot_month_wallet (snapshot_month, wallet),
      KEY idx_wallet_growth_snapshot_wallet_month (wallet, snapshot_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包月度社区投资成长快照'`
  );
  ready = true;
}
