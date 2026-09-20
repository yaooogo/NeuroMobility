import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { normalizeContentLanguage } from '../../Util/ContentLanguage.js';
import { ensureHelpArticleTable } from '../../Util/ContentSchema.js';

const TABLE_NAME = 'help_article';

function normalize(row) {
  return {
    id: Number(row.id || 0),
    language: normalizeContentLanguage(row.language),
    title: row.title || '',
    content: row.content || '',
    sort: Number(row.sort || 0),
    status: Number(row.status ?? 1),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function parseArticle(body) {
  const title = Helper.safeString(body?.title, 255).trim();
  const content = String(body?.content || '').trim();
  if (!title) throw new Error('帮助文章标题不能为空');
  if (!content) throw new Error('帮助文章内容不能为空');
  return {
    language: normalizeContentLanguage(body?.language),
    title,
    content,
    sort: Math.max(0, Helper.parseInt(body?.sort, 0)),
    status: Number(body?.status) === 1 ? 1 : 0
  };
}

async function list(req, res) {
  try {
    await ensureHelpArticleTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const keyword = Helper.safeString(req.body?.keyword, 255).trim();
    const status = req.body?.status;
    const language = String(req.body?.language || '').trim();
    const query = DB.query().table(TABLE_NAME);
    if (keyword) {
      query.where(builder => builder
        .where('title', 'like', `%${keyword}%`)
        .orWhere('content', 'like', `%${keyword}%`));
    }
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    if (language) query.where('language', normalizeContentLanguage(language));
    query.orderBy('sort', 'asc').orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取帮助文章列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'HelpArticleService.list'));
  }
}

async function create(req, res) {
  try {
    await ensureHelpArticleTable();
    const article = parseArticle(req.body);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const result = { insertId: 0 };
    await DB.query().table(TABLE_NAME).insert({ ...article, created_at: now, updated_at: now }, result);
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', result.insertId).first()
    ), '帮助文章创建成功'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'HelpArticleService.create'));
  }
}

async function update(req, res) {
  try {
    await ensureHelpArticleTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '帮助文章ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '帮助文章不存在'));
    const article = parseArticle(req.body);
    await DB.query().table(TABLE_NAME).where('id', id).update({
      ...article,
      updated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date())
    });
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', id).first()
    ), '帮助文章更新成功'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'HelpArticleService.update'));
  }
}

async function remove(req, res) {
  try {
    await ensureHelpArticleTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '帮助文章ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '帮助文章不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '帮助文章删除成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'HelpArticleService.remove'));
  }
}

export default { list, create, update, remove };
