import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import { normalizeContentLanguage } from '../../Util/ContentLanguage.js';
import { ensureAboutContentTable, ensureAnnouncementTable, ensureHelpArticleTable } from '../../Util/ContentSchema.js';

function normalizeAnnouncement(row) {
  return {
    id: Number(row.id || 0),
    language: normalizeContentLanguage(row.language),
    title: row.title || '',
    cover: row.cover || '',
    content: row.content || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function normalizeHelpArticle(row) {
  return {
    id: Number(row.id || 0),
    language: normalizeContentLanguage(row.language),
    title: row.title || '',
    content: row.content || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function announcements(req, res) {
  try {
    await ensureAnnouncementTable();
    const language = normalizeContentLanguage(req.query?.language);
    const rows = await DB.query()
      .table('announcement')
      .where('status', 1)
      .where('language', language)
      .orderBy('sort', 'asc')
      .orderBy('id', 'desc')
      .get();

    return res.send(ApiResult.success({
      items: (rows || []).map(normalizeAnnouncement)
    }, '获取公告列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'ContentService.announcements'));
  }
}

async function helpArticles(req, res) {
  try {
    await ensureHelpArticleTable();
    const language = normalizeContentLanguage(req.query?.language);
    const rows = await DB.query()
      .table('help_article')
      .where('status', 1)
      .where('language', language)
      .orderBy('sort', 'asc')
      .orderBy('id', 'desc')
      .get();

    return res.send(ApiResult.success({
      items: (rows || []).map(normalizeHelpArticle)
    }, '获取帮助文章列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'ContentService.helpArticles'));
  }
}

async function about(req, res) {
  try {
    await ensureAboutContentTable();
    const language = normalizeContentLanguage(req.query?.language);
    const rows = await DB.query()
      .table('about_content')
      .where('language', language)
      .orderBy('id', 'desc')
      .get();
    return res.send(ApiResult.success({
      items: (rows || []).map(row => ({
        id: Number(row.id || 0),
        language,
        content: row.content || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || ''
      }))
    }, '获取关于我们内容成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'ContentService.about'));
  }
}

export default { announcements, helpArticles, about };
