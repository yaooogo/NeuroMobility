import Database from './Database.js';
import DB from './database/DB.js';

let pending;
export async function ensurePerformanceSnapshotTable() {
  if (!pending) pending = create().catch(error => { pending = null; throw error; });
  return pending;
}

async function create() {
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${prefix}wallet_performance_snapshot (
    id BIGINT NOT NULL AUTO_INCREMENT,
    wallet VARCHAR(80) NOT NULL,
    anchor_date DATE NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    level INT NOT NULL DEFAULT 0,
    previous_community_invests DECIMAL(65,0) NOT NULL DEFAULT 0,
    community_invests DECIMAL(65,0) NOT NULL DEFAULT 0,
    growth_amount DECIMAL(65,0) NOT NULL DEFAULT 0,
    whole_vehicle_count DECIMAL(65,0) NOT NULL DEFAULT 0,
    growth_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
    target_amount DECIMAL(65,18) NOT NULL DEFAULT 0,
    deduction_differential_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
    deduction_expansion_reward_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
    deduction_bonus_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
    deduction_direct_dividend_reward_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_performance_wallet_period (wallet, period_end)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户首次升级锚定30天业绩考核快照'`);
}
