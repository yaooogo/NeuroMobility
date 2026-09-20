import ApiResult from '../../Util/ApiResult.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import Upload from '../../Util/Upload.js';
import { normalizeContentLanguage } from '../../Util/ContentLanguage.js';
import { ensureVehicleTable } from '../../Util/ContentSchema.js';

const TABLE_NAME = 'vehicle';
const COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

function parseTags(value) {
  let tags = value;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  if (!Array.isArray(tags)) return [];
  return tags.slice(0, 20).map(item => ({
    label: Helper.safeString(item?.label, 80).trim(),
    background_color: COLOR_PATTERN.test(String(item?.background_color || '')) ? String(item.background_color) : '#ead7fa',
    text_color: COLOR_PATTERN.test(String(item?.text_color || '')) ? String(item.text_color) : '#8c3bd2'
  })).filter(item => item.label);
}

function normalize(row) {
  return {
    id: Number(row?.id || 0),
    language: normalizeContentLanguage(row?.language),
    name: row?.name || '',
    model: row?.model || '',
    image: row?.image || '',
    tags: parseTags(row?.tags),
    sort: Number(row?.sort || 0),
    status: Number(row?.status ?? 1),
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || ''
  };
}

function parseVehicle(body) {
  const name = Helper.safeString(body?.name, 255).trim();
  if (!name) throw new Error('车辆名称不能为空');
  return {
    language: normalizeContentLanguage(body?.language),
    name,
    model: Helper.safeString(body?.model, 255).trim(),
    image: Helper.safeString(body?.image, 500).trim() || null,
    tags: JSON.stringify(parseTags(body?.tags)),
    sort: Math.max(0, Helper.parseInt(body?.sort, 0)),
    status: Number(body?.status) === 1 ? 1 : 0
  };
}

async function list(req, res) {
  try {
    await ensureVehicleTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const keyword = Helper.safeString(req.body?.keyword, 255).trim();
    const language = String(req.body?.language || '').trim();
    const status = req.body?.status;
    const query = DB.query().table(TABLE_NAME);
    if (keyword) query.where(builder => builder.where('name', 'like', `%${keyword}%`).orWhere('model', 'like', `%${keyword}%`));
    if (language) query.where('language', normalizeContentLanguage(language));
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    query.orderBy('sort', 'asc').orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取车辆列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'VehicleService.list'));
  }
}

async function create(req, res) {
  try {
    await ensureVehicleTable();
    const vehicle = parseVehicle(req.body);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const result = { insertId: 0 };
    await DB.query().table(TABLE_NAME).insert({ ...vehicle, created_at: now, updated_at: now }, result);
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', result.insertId).first()
    ), '车辆已创建'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'VehicleService.create'));
  }
}

async function update(req, res) {
  try {
    await ensureVehicleTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '车辆ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '车辆不存在'));
    const vehicle = parseVehicle(req.body);
    await DB.query().table(TABLE_NAME).where('id', id).update({
      ...vehicle,
      updated_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date())
    });
    return res.send(ApiResult.success(normalize(
      await DB.query().table(TABLE_NAME).where('id', id).first()
    ), '车辆已更新'));
  } catch (error) {
    if (/不能为空/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'VehicleService.update'));
  }
}

async function remove(req, res) {
  try {
    await ensureVehicleTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '车辆ID不能为空'));
    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) return res.send(ApiResult.error(404, '车辆不存在'));
    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '车辆已删除'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'VehicleService.remove'));
  }
}

async function uploadImage(req, res) {
  try {
    return res.send(ApiResult.success(await Upload.saveImage(req.file), '车辆图片上传成功'));
  } catch (error) {
    return res.send(ApiResult.error(400, error.message || '车辆图片上传失败'));
  }
}

export default { list, create, update, remove, uploadImage };
