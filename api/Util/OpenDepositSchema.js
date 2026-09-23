import Database from './Database.js';
import DB from './database/DB.js';

let ready = false;

export async function ensureOpenDepositTable() {
    if (ready) return;

    const prefix = Database.prefix('default') || '';
    await DB.query().exec(
        `CREATE TABLE IF NOT EXISTS ${prefix}open_deposit_order (
            id BIGINT NOT NULL AUTO_INCREMENT,
            unique_id VARCHAR(191) NOT NULL,
            wallet VARCHAR(80) NOT NULL,
            token VARCHAR(40) NOT NULL,
            amount VARCHAR(100) NOT NULL,
            created_at DATETIME DEFAULT NULL,
            updated_at DATETIME DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_open_deposit_order_unique_id (unique_id),
            KEY idx_open_deposit_order_wallet_id (wallet, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开放接口充值订单'`
    );

    ready = true;
}

