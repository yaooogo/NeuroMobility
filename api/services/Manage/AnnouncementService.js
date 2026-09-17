import ApiResult from '../../Util/ApiResult.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import Upload from '../../Util/Upload.js';

const TABLE_NAME = 'announcement';
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const prefix = Database.prefix('default') || '';
  await DB.query().exec(
    `CREATE TABLE IF NOT EXISTS ${prefix}announcement (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      cover VARCHAR(500) DEFAULT NULL,
      content MEDIUMTEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_announcement_created_at (created_at),
      KEY idx_announcement_status_sort (status, sort)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告'`
  );
  const database = Database.dbConfig.default.database;
  const tableName = `${prefix}announcement`;
  const columns = await DB.query().exec(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
    [database, tableName]
  );
  const names = new Set((columns || []).map(item => item.COLUMN_NAME));
  const additions = [
    { name: 'cover', sql: `ALTER TABLE ${tableName} ADD COLUMN cover VARCHAR(500) DEFAULT NULL AFTER title` },
    { name: 'sort', sql: `ALTER TABLE ${tableName} ADD COLUMN sort INT NOT NULL DEFAULT 0 AFTER content` },
    { name: 'status', sql: `ALTER TABLE ${tableName} ADD COLUMN status TINYINT(1) NOT NULL DEFAULT 1 AFTER sort` }
  ];
  for (const addition of additions) {
    if (!names.has(addition.name)) await DB.query().exec(addition.sql);
  }
  tableReady = true;
}

function normalize(row) {
  return {
    id: Number(row.id || 0),
    title: row.title || '',
    cover: row.cover || '',
    content: row.content || '',
    sort: Number(row.sort || 0),
    status: Number(row.status ?? 1),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function list(req, res) {
  try {
    await ensureTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const keyword = Helper.safeString(req.body?.keyword, 255).trim();
    const status = req.body?.status;
    const query = DB.query().table(TABLE_NAME);
    if (keyword) {
      query.where(builder => builder
        .where('title', 'like', `%${keyword}%`)
        .orWhere('content', 'like', `%${keyword}%`));
    }
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    query.orderBy('sort', 'asc').orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取公告列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AnnouncementService.list'));
  }
}

async function create(req, res) {
  try {
    await ensureTable();
    const title = Helper.safeString(req.body?.title, 255).trim();
    const cover = Helper.safeString(req.body?.cover, 500).trim();
    const content = String(req.body?.content || '').trim();
    const sort = Math.max(0, Helper.parseInt(req.body?.sort, 0));
    const status = Number(req.body?.status) === 1 ? 1 : 0;
    if (!title) return res.send(ApiResult.error(400, '公告标题不能为空'));
    if (!content) return res.send(ApiResult.error(400, '公告内容不能为空'));
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const result = { insertId: 0 };
    await DB.query().table(TABLE_NAME).insert({ title, cover: cover || null, content, sort, status, created_at: now, updated_at: now }, result);
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', result.insertId).first()
    ), '公告创建成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AnnouncementService.create'));
  }
}

async function update(req, res) {
  try {
    await ensureTable();
    const id = Helper.parseInt(req.body?.id, 0);
    const title = Helper.safeString(req.body?.title, 255).trim();
    const cover = Helper.safeString(req.body?.cover, 500).trim();
    const content = String(req.body?.content || '').trim();
    const sort = Math.max(0, Helper.parseInt(req.body?.sort, 0));
    const status = Number(req.body?.status) === 1 ? 1 : 0;
    if (!id) return res.send(ApiResult.error(400, '公告ID不能为空'));
    if (!title) return res.send(ApiResult.error(400, '公告标题不能为空'));
    if (!content) return res.send(ApiResult.error(400, '公告内容不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '公告不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).update({
      title,
      cover: cover || null,
      content,
      sort,
      status,
      updated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date())
    });
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', id).first()
    ), '公告更新成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AnnouncementService.update'));
  }
}

async function remove(req, res) {
  try {
    await ensureTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '公告ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '公告不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '公告删除成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AnnouncementService.remove'));
  }
}

async function uploadCover(req, res) {
  try {
    const uploaded = await Upload.saveImage(req.file);
    return res.send(ApiResult.success(uploaded, '公告封面上传成功'));
  } catch (error) {
    return res.send(ApiResult.error(400, error.message || '公告封面上传失败'));
  }
}

export default { list, create, update, remove, uploadCover };
