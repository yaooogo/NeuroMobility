import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import ApiResult from '../../Util/ApiResult.js';

const TABLE_NAME = 'user';

function buildUserPublic(user) {
  if (!user) {
    return null;
  }
  return {
    id: Number(user.id || 0),
    tg_id: user.tg_id || '',
    ref_code: user.ref_code || '',
    parent_tg_id: user.parent_tg_id || '',
    status: Number(user.status ?? 1),
    username: user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    create_time: Number(user.create_time || 0),
    create_date: user.create_date || '',
    last_time: Number(user.last_time || 0),
    online_time: Number(user.online_time || 0),
    invite_count: Number(user.invite_count || 0),
    is_system: Number(user.is_system || 0),
    is_viewstat: Number(user.is_viewstat || 0),
    view_remark: user.view_remark || '',
    deductions: Number(user.deductions || 0),
    is_premium: Number(user.is_premium || 0)
  };
}

function clampInt(value, min, max, defaultValue) {
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, num));
}

async function list(req, res) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 10);
    const username = Helper.safeString(req.body?.username, 100).trim();
    const tgId = Helper.safeString(req.body?.tg_id, 50).trim();
    const refCode = Helper.safeString(req.body?.ref_code, 50).trim();
    const parentTgId = Helper.safeString(req.body?.parent_tg_id, 50).trim();
    const status = req.body?.status;
    const isPremium = req.body?.is_premium;
    const isViewstat = req.body?.is_viewstat;
    const isSystem = req.body?.is_system;

    const query = DB.query().table(TABLE_NAME);

    if (username) {
      query.where('username', 'like', `%${username}%`);
    }
    if (tgId) {
      query.where('tg_id', 'like', `%${tgId}%`);
    }
    if (refCode) {
      query.where('ref_code', refCode);
    }
    if (parentTgId) {
      query.where('parent_tg_id', parentTgId);
    }
    if (status !== undefined && status !== null && status !== '') {
      query.where('status', Number(status));
    }
    if (isPremium !== undefined && isPremium !== null && isPremium !== '') {
      query.where('is_premium', Number(isPremium));
    }
    if (isViewstat !== undefined && isViewstat !== null && isViewstat !== '') {
      query.where('is_viewstat', Number(isViewstat));
    }
    if (isSystem !== undefined && isSystem !== null && isSystem !== '') {
      query.where('is_system', Number(isSystem));
    }

    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    const items = (result.items || []).map((row) => buildUserPublic(row));

    return res.send(ApiResult.success({
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage,
      items
    }, '获取用户列表成功'));
  } catch (error) {
    console.error('[UserService.list] error:', error);
    return res.send(ApiResult.exception(error, 'UserService.list'));
  }
}

async function detail(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const user = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!user) {
      return res.send(ApiResult.error(404, '用户不存在'));
    }

    return res.send(ApiResult.success(buildUserPublic(user), '获取用户详情成功'));
  } catch (error) {
    console.error('[UserService.detail] error:', error);
    return res.send(ApiResult.exception(error, 'UserService.detail'));
  }
}

async function create(req, res) {
  try {
    const tgId = Helper.safeString(req.body?.tg_id, 50).trim();
    const username = Helper.safeString(req.body?.username, 100).trim();
    const firstname = Helper.safeString(req.body?.firstname, 100).trim() || username;
    const lastname = Helper.safeString(req.body?.lastname, 100).trim();
    const refCode = Helper.safeString(req.body?.ref_code, 50).trim();
    const parentTgId = Helper.safeString(req.body?.parent_tg_id, 50).trim();
    const viewRemark = Helper.safeString(req.body?.view_remark, 255).trim();
    const deductions = clampInt(req.body?.deductions, 0, 100, 0);
    const status = req.body?.status !== undefined ? Number(req.body.status) : 1;
    const isPremium = req.body?.is_premium !== undefined ? Number(req.body.is_premium) : 0;
    const isViewstat = req.body?.is_viewstat !== undefined ? Number(req.body.is_viewstat) : 1;

    if (!tgId) {
      return res.send(ApiResult.error(400, '电报用户ID不能为空'));
    }
    if (!username) {
      return res.send(ApiResult.error(400, '用户名不能为空'));
    }

    const exists = await DB.query().table(TABLE_NAME).where('tg_id', tgId).first();
    if (exists) {
      return res.send(ApiResult.error(400, '电报用户ID已存在'));
    }

    const now = Helper.getUtcTime();
    const nowDate = Helper.dateFormat('YYYY-mm-dd', new Date());

    const insertResult = { insertId: 0 };
    const ok = await DB.query().table(TABLE_NAME).insert({
      tg_id: tgId,
      ref_code: refCode || null,
      parent_tg_id: parentTgId || null,
      status,
      username,
      firstname,
      lastname,
      create_time: now,
      create_date: nowDate,
      last_time: 0,
      online_time: 0,
      invite_count: 0,
      is_system: 1,
      is_viewstat: isViewstat,
      view_remark: viewRemark || null,
      deductions,
      is_premium: isPremium
    }, insertResult);

    if (!ok) {
      return res.send(ApiResult.error(500, '创建失败'));
    }

    const user = await DB.query().table(TABLE_NAME).where('id', insertResult.insertId).first();
    return res.send(ApiResult.success(buildUserPublic(user), '创建成功'));
  } catch (error) {
    console.error('[UserService.create] error:', error);
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.send(ApiResult.error(400, '电报用户ID已存在'));
    }
    return res.send(ApiResult.exception(error, 'UserService.create'));
  }
}

async function update(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const user = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!user) {
      return res.send(ApiResult.error(404, '用户不存在'));
    }

    const data = {};

    if (req.body?.username !== undefined) {
      const username = Helper.safeString(req.body.username, 100).trim();
      if (!username) {
        return res.send(ApiResult.error(400, '用户名不能为空'));
      }
      data.username = username;
    }
    if (req.body?.firstname !== undefined) {
      data.firstname = Helper.safeString(req.body.firstname, 100).trim();
    }
    if (req.body?.lastname !== undefined) {
      data.lastname = Helper.safeString(req.body.lastname, 100).trim();
    }
    if (req.body?.ref_code !== undefined) {
      data.ref_code = Helper.safeString(req.body.ref_code, 50).trim() || null;
    }
    if (req.body?.parent_tg_id !== undefined) {
      data.parent_tg_id = Helper.safeString(req.body.parent_tg_id, 50).trim() || null;
    }
    if (req.body?.view_remark !== undefined) {
      data.view_remark = Helper.safeString(req.body.view_remark, 255).trim() || null;
    }
    if (req.body?.deductions !== undefined) {
      data.deductions = clampInt(req.body.deductions, 0, 100, 0);
    }
    if (req.body?.invite_count !== undefined) {
      data.invite_count = Math.max(0, Number(req.body.invite_count) || 0);
    }
    if (req.body?.status !== undefined) {
      data.status = Number(req.body.status);
    }
    if (req.body?.is_premium !== undefined) {
      data.is_premium = Number(req.body.is_premium);
    }
    if (req.body?.is_viewstat !== undefined) {
      data.is_viewstat = Number(req.body.is_viewstat);
    }

    if (Object.keys(data).length === 0) {
      return res.send(ApiResult.success(buildUserPublic(user), '没有需要更新的字段'));
    }

    await DB.query().table(TABLE_NAME).where('id', id).update(data);
    const fresh = await DB.query().table(TABLE_NAME).where('id', id).first();
    return res.send(ApiResult.success(buildUserPublic(fresh), '更新成功'));
  } catch (error) {
    console.error('[UserService.update] error:', error);
    return res.send(ApiResult.exception(error, 'UserService.update'));
  }
}

async function remove(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const user = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!user) {
      return res.send(ApiResult.error(404, '用户不存在'));
    }

    await DB.query().table(TABLE_NAME).where('id', id).delete();
    return res.send(ApiResult.success({ id }, '删除成功'));
  } catch (error) {
    console.error('[UserService.remove] error:', error);
    return res.send(ApiResult.exception(error, 'UserService.remove'));
  }
}

export default { list, detail, create, update, remove };