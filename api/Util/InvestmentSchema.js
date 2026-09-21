import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

async function getColumnNames(tableName) {
  const rows = await DB.query().exec(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [Database.dbConfig.default.database, tableName]
  );
  return new Set((rows || []).map(item => item.COLUMN_NAME));
}

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
      dividend_multiple DECIMAL(20,8) NOT NULL DEFAULT 1,
      dividend_min_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      dividend_max_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      exit_multiple DECIMAL(20,8) NOT NULL DEFAULT 1,
      guaranteed_percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      guaranteed_eligible TINYINT NOT NULL DEFAULT 0,
      whole_vehicle TINYINT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 0,
      waiting_until DATETIME DEFAULT NULL,
      next_dividend_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_investment_order_order_id (order_id),
      KEY idx_investment_order_wallet_id (wallet, id),
      KEY idx_investment_order_status_time (status, next_dividend_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投资订单'`
  );

  const orderTable = `${prefix}investment_order`;
  const columns = await getColumnNames(orderTable);
  const additions = [
    { name: 'dividend_multiple', sql: `ALTER TABLE ${orderTable} ADD COLUMN dividend_multiple DECIMAL(20,8) NOT NULL DEFAULT 1 AFTER max_percent` },
    { name: 'dividend_min_percent', sql: `ALTER TABLE ${orderTable} ADD COLUMN dividend_min_percent DECIMAL(10,4) NOT NULL DEFAULT 0 AFTER dividend_multiple` },
    { name: 'dividend_max_percent', sql: `ALTER TABLE ${orderTable} ADD COLUMN dividend_max_percent DECIMAL(10,4) NOT NULL DEFAULT 0 AFTER dividend_min_percent` },
    { name: 'exit_multiple', sql: `ALTER TABLE ${orderTable} ADD COLUMN exit_multiple DECIMAL(20,8) NOT NULL DEFAULT 1 AFTER dividend_max_percent` },
    { name: 'guaranteed_eligible', sql: `ALTER TABLE ${orderTable} ADD COLUMN guaranteed_eligible TINYINT NOT NULL DEFAULT 0 AFTER guaranteed_percent` }
  ];
  for (const addition of additions) {
    if (!columns.has(addition.name)) {
      try {
        await DB.query().exec(addition.sql);
      } catch (error) {
        if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
      }
    }
  }

  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}investment_dividend (
      id BIGINT NOT NULL AUTO_INCREMENT,
      dividend_id VARCHAR(100) NOT NULL,
      order_id VARCHAR(80) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      token VARCHAR(40) NOT NULL DEFAULT 'USDT',
      cycle_at DATETIME NOT NULL,
      percent DECIMAL(10,4) NOT NULL DEFAULT 0,
      amount DECIMAL(65,0) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_investment_dividend_order_cycle (order_id, cycle_at),
      UNIQUE KEY uk_investment_dividend_id (dividend_id),
      KEY idx_investment_dividend_wallet_id (wallet, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投资分红记录'`
  );
  ready = true;
}
