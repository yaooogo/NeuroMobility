import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import { normalizeContentLanguage } from '../../Util/ContentLanguage.js';
import { ensureAboutContentTable, ensureAnnouncementTable, ensureHelpArticleTable, ensureVehicleTable } from '../../Util/ContentSchema.js';
import CacheData from '../../Util/CacheData.js';
import Database from '../../Util/Database.js';
import { toDappApiError } from '../../Util/DappApiMessage.js';

function normalizeVehicleTags(value) {
  try {
    const tags = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

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
    }, 'Announcements retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.announcements'));
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
    }, 'Help articles retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.helpArticles'));
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
    }, 'About content retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.about'));
  }
}

async function vehicles(req, res) {
  try {
    await ensureVehicleTable();
    const language = normalizeContentLanguage(req.query?.language);
    const rows = await DB.query()
      .table('vehicle')
      .where('language', language)
      .where('status', 1)
      .orderBy('sort', 'asc')
      .orderBy('id', 'desc')
      .get();
    return res.send(ApiResult.success({
      items: (rows || []).map(row => ({
        id: Number(row.id || 0),
        language,
        name: row.name || '',
        model: row.model || '',
        image: row.image || '',
        tags: normalizeVehicleTags(row.tags)
      }))
    }, 'Vehicles retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.vehicles'));
  }
}

async function investmentConfig(req, res) {
  try {
    return res.send(ApiResult.success(await CacheData.getInvestmentConfig(), 'Investment configuration retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.investmentConfig'));
  }
}

async function platformStats(req, res) {
  try {
    const prefix = Database.prefix('default') || '';
    const [config, userRows] = await Promise.all([
      CacheData.getOtherConfig(),
      DB.query().exec(`SELECT COUNT(*) AS count FROM ${prefix}wallet`)
    ]);
    const realUsers = Number(userRows?.[0]?.count || 0);
    const virtualUsers = Number(config.virtual_users || 0);
    return res.send(ApiResult.success({
      platform_operated_vehicles: Number(config.platform_operated_vehicles || 0),
      real_users: realUsers,
      virtual_users: virtualUsers,
      cumulative_users: realUsers + virtualUsers
    }, 'Platform statistics retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'ContentService.platformStats'));
  }
}

export default { announcements, helpArticles, about, vehicles, investmentConfig, platformStats };
