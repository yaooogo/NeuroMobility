import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensureInvestmentOrderTable() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}investment_order (
      id BIGINT NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(80) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      token VARCHAR(40) NOT NULL DEFAULT 'USDT',
      amount DECIMAL(65,0) NOT NULL,
      distributed_amount DECIMAL(65,0) NOT NULL DEFAULT 0,
      total_dividend DECIMAL(65,0) NOT NULL DEFAULT 0,
      waiting_days INT NOT NULL DEFAULT 0,
      cycle_days INT NOT NULL DEFAULT 30,
      min_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      max_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      guaranteed_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      whole_vehicle TINYINT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 0,
      waiting_until DATETIME DEFAULT NULL,
      next_dividend_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_investment_order_order_id (order_id),
      KEY idx_investment_order_wallet_id (wallet, id),
      KEY idx_investment_order_status_time (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投资订单'`
  );
  ready = true;
}
