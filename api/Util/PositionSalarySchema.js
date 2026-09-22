import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensurePositionSalaryTable() {
  if (ready) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}position_salary_record (
      id BIGINT NOT NULL AUTO_INCREMENT,
      salary_id VARCHAR(100) NOT NULL,
      salary_month CHAR(7) NOT NULL,
      wallet VARCHAR(80) NOT NULL,
      level INT NOT NULL DEFAULT 0,
      token VARCHAR(40) NOT NULL DEFAULT 'USDT',
      amount DECIMAL(65,0) NOT NULL DEFAULT 0,
      paid_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_position_salary_id (salary_id),
      UNIQUE KEY uk_position_salary_month_wallet (salary_month, wallet),
      KEY idx_position_salary_wallet_id (wallet, id),
      KEY idx_position_salary_month_id (salary_month, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位工资发放记录'`
  );
  ready = true;
}
