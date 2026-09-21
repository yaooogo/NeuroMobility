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

export async function ensureAssetTransferTables() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';

  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}receiver_order (
      id BIGINT NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(80) NOT NULL,
      contract VARCHAR(80) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      token VARCHAR(40) DEFAULT NULL,
      amount VARCHAR(100) NOT NULL,
      tx_hash VARCHAR(100) DEFAULT NULL,
      block_number BIGINT NOT NULL DEFAULT 0,
      \`index\` INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receiver_order_order_id (order_id),
      KEY idx_receiver_order_wallet_id (wallet, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值订单'`
  );

  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}withdrawal_order (
      id BIGINT NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(80) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      token VARCHAR(40) NOT NULL,
      token_contract VARCHAR(80) NOT NULL,
      amount VARCHAR(100) NOT NULL,
      service_amount VARCHAR(100) NOT NULL DEFAULT '0',
      debit_amount VARCHAR(100) NOT NULL,
      deadline BIGINT NOT NULL,
      status TINYINT NOT NULL DEFAULT 0,
      tx_hash VARCHAR(100) DEFAULT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_withdrawal_order_order_id (order_id),
      KEY idx_withdrawal_order_wallet_id (wallet, id),
      KEY idx_withdrawal_order_wallet_status (wallet, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现订单'`
  );

  const receiverTable = `${prefix}receiver_order`;
  const receiverColumns = await getColumnNames(receiverTable);
  const receiverAdditions = [
    { name: 'token', sql: `ALTER TABLE ${receiverTable} ADD COLUMN token VARCHAR(40) DEFAULT NULL AFTER wallet` },
    { name: 'tx_hash', sql: `ALTER TABLE ${receiverTable} ADD COLUMN tx_hash VARCHAR(100) DEFAULT NULL AFTER amount` }
  ];
  for (const addition of receiverAdditions) {
    if (!receiverColumns.has(addition.name)) await DB.query().exec(addition.sql);
  }

  const withdrawalTable = `${prefix}withdrawal_order`;
  const withdrawalColumns = await getColumnNames(withdrawalTable);
  const withdrawalAdditions = [
    { name: 'token_contract', sql: `ALTER TABLE ${withdrawalTable} ADD COLUMN token_contract VARCHAR(80) DEFAULT NULL AFTER token` },
    { name: 'debit_amount', sql: `ALTER TABLE ${withdrawalTable} ADD COLUMN debit_amount VARCHAR(100) DEFAULT NULL AFTER service_amount` },
    { name: 'deadline', sql: `ALTER TABLE ${withdrawalTable} ADD COLUMN deadline BIGINT NOT NULL DEFAULT 0 AFTER debit_amount` },
    { name: 'tx_hash', sql: `ALTER TABLE ${withdrawalTable} ADD COLUMN tx_hash VARCHAR(100) DEFAULT NULL AFTER status` }
  ];
  for (const addition of withdrawalAdditions) {
    if (!withdrawalColumns.has(addition.name)) await DB.query().exec(addition.sql);
  }

  ready = true;
}
