import Database from './Database.js';
import DB from './database/DB.js';

const ready = {
  announcement: false,
  helpArticle: false,
  about: false,
  vehicle: false
};

async function getColumnNames(tableName) {
  const database = Database.dbConfig.default.database;
  const rows = await DB.query().exec(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [database, tableName]
  );
  return new Set((rows || []).map(item => item.COLUMN_NAME));
}

export async function ensureAnnouncementTable() {
  if (ready.announcement) return;
  const prefix = Database.prefix('default') || '';
  const tableName = `${prefix}announcement`;
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT NOT NULL AUTO_INCREMENT,
      \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh',
      title VARCHAR(255) NOT NULL,
      cover VARCHAR(500) DEFAULT NULL,
      content MEDIUMTEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_announcement_created_at (created_at),
      KEY idx_announcement_status_sort (status, sort),
      KEY idx_announcement_language_status_sort (\`language\`, status, sort)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告'`
  );

  const names = await getColumnNames(tableName);
  const additions = [
    { name: 'language', sql: `ALTER TABLE ${tableName} ADD COLUMN \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh' AFTER id` },
    { name: 'cover', sql: `ALTER TABLE ${tableName} ADD COLUMN cover VARCHAR(500) DEFAULT NULL AFTER title` },
    { name: 'sort', sql: `ALTER TABLE ${tableName} ADD COLUMN sort INT NOT NULL DEFAULT 0 AFTER content` },
    { name: 'status', sql: `ALTER TABLE ${tableName} ADD COLUMN status TINYINT(1) NOT NULL DEFAULT 1 AFTER sort` }
  ];
  for (const addition of additions) {
    if (!names.has(addition.name)) await DB.query().exec(addition.sql);
  }
  ready.announcement = true;
}

export async function ensureHelpArticleTable() {
  if (ready.helpArticle) return;
  const prefix = Database.prefix('default') || '';
  const tableName = `${prefix}help_article`;
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT NOT NULL AUTO_INCREMENT,
      \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh',
      title VARCHAR(255) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_help_article_status_sort (status, sort),
      KEY idx_help_article_language_status_sort (\`language\`, status, sort),
      KEY idx_help_article_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帮助文章'`
  );

  const names = await getColumnNames(tableName);
  if (!names.has('language')) {
    await DB.query().exec(
      `ALTER TABLE ${tableName} ADD COLUMN \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh' AFTER id`
    );
  }
  ready.helpArticle = true;
}

export async function ensureAboutContentTable() {
  if (ready.about) return;
  const prefix = Database.prefix('default') || '';
  const tableName = `${prefix}about_content`;
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT NOT NULL AUTO_INCREMENT,
      \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh',
      content MEDIUMTEXT NOT NULL,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_about_content_language_id (\`language\`, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关于我们'`
  );

  const indexes = await DB.query().exec(
    'SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [Database.dbConfig.default.database, tableName]
  );
  if ((indexes || []).some(item => item.INDEX_NAME === 'uk_about_content_language')) {
    try {
      await DB.query().exec(`ALTER TABLE ${tableName} DROP INDEX uk_about_content_language`);
    } catch (error) {
      if (Number(error?.errno) !== 1091) throw error;
    }
  }
  if (!(indexes || []).some(item => item.INDEX_NAME === 'idx_about_content_language_id')) {
    try {
      await DB.query().exec(
        `ALTER TABLE ${tableName} ADD INDEX idx_about_content_language_id (\`language\`, id)`
      );
    } catch (error) {
      if (Number(error?.errno) !== 1061) throw error;
    }
  }
  ready.about = true;
}

export async function ensureVehicleTable() {
  if (ready.vehicle) return;
  const prefix = Database.prefix('default') || '';
  const tableName = `${prefix}vehicle`;
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT NOT NULL AUTO_INCREMENT,
      \`language\` VARCHAR(10) NOT NULL DEFAULT 'zh',
      name VARCHAR(255) NOT NULL,
      model VARCHAR(255) DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      tags MEDIUMTEXT DEFAULT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_vehicle_language_status_sort (\`language\`, status, sort),
      KEY idx_vehicle_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆详情'`
  );
  ready.vehicle = true;
}
