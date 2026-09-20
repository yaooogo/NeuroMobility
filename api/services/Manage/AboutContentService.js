import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { normalizeContentLanguage } from '../../Util/ContentLanguage.js';
import { ensureAboutContentTable } from '../../Util/ContentSchema.js';

const TABLE_NAME = 'about_content';

function normalize(row) {
  return {
    id: Number(row?.id || 0),
    language: normalizeContentLanguage(row?.language),
    content: row?.content || '',
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || ''
  };
}

function parseArticle(body) {
  const content = String(body?.content || '').trim();
  if (!content) throw new Error('关于我们文章内容不能为空');
  return {
    language: normalizeContentLanguage(body?.language),
    content
  };
}

async function list(req, res) {
  try {
    await ensureAboutContentTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const language = String(req.body?.language || '').trim();
    const query = DB.query().table(TABLE_NAME);
    if (language) query.where('language', normalizeContentLanguage(language));
    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取关于我们文章列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AboutContentService.list'));
  }
}

async function create(req, res) {
  try {
    await ensureAboutContentTable();
    const article = parseArticle(req.body);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const result = { insertId: 0 };
    await DB.query().table(TABLE_NAME).insert({ ...article, created_at: now, updated_at: now }, result);
    const saved = await DB.query().table(TABLE_NAME).where('id', result.insertId).first();
    return res.send(ApiResult.success(normalize(saved), '关于我们文章已创建'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'AboutContentService.create'));
  }
}

async function update(req, res) {
  try {
    await ensureAboutContentTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '文章ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '文章不存在'));
    const article = parseArticle(req.body);
    await DB.query().table(TABLE_NAME).where('id', id).update({
      ...article,
      updated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date())
    });
    const saved = await DB.query().table(TABLE_NAME).where('id', id).first();
    return res.send(ApiResult.success(normalize(saved), '关于我们文章已更新'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'AboutContentService.update'));
  }
}

async function remove(req, res) {
  try {
    await ensureAboutContentTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '文章ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '文章不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '关于我们文章已删除'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AboutContentService.remove'));
  }
}

export default { list, create, update, remove };
