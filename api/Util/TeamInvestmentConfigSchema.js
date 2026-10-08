import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensureTeamInvestmentConfigTable() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}team_investment_config (
      id BIGINT NOT NULL AUTO_INCREMENT,
      wallet VARCHAR(80) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      min_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      max_percent DECIMAL(10,4) NOT NULL DEFAULT 100,
      dividend_multiple DECIMAL(20,8) NOT NULL DEFAULT 1,
      dividend_min_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      dividend_max_percent DECIMAL(10,4) NOT NULL DEFAULT 100,
      guaranteed_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      remark VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_team_investment_config_wallet (wallet),
      KEY idx_team_investment_config_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='team investment dividend config'`
  );
  ready = true;
}
