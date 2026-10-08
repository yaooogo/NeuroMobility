import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensureWalletImportTaskTable() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}wallet_import_task (
      id BIGINT NOT NULL AUTO_INCREMENT,
      task_no VARCHAR(80) NOT NULL,
      file_name VARCHAR(255) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      current_step VARCHAR(80) DEFAULT NULL,
      total_count INT NOT NULL DEFAULT 0,
      processed_count INT NOT NULL DEFAULT 0,
      success_count INT NOT NULL DEFAULT 0,
      failure_count INT NOT NULL DEFAULT 0,
      items_json LONGTEXT NOT NULL,
      failed_rows LONGTEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      started_at DATETIME DEFAULT NULL,
      finished_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_wallet_import_task_no (task_no),
      KEY idx_wallet_import_task_status_id (status, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='wallet csv import task'`
  );
  ready = true;
}
