import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import ApiResult from '../../Util/ApiResult.js';
import ManagePermission from '../../Util/ManagePermission.js';
import Config from '../../Util/Config.js';
import { RedisCache } from '../../Util/Cache.js';
import {
  buildGoogleAuthenticatorUri,
  generateGoogleAuthenticatorSecret,
  verifyGoogleAuthenticatorCode
} from '../../Util/GoogleAuthenticator.js';

const TABLE_NAME = 'admin';
const TYPE_TABLE_NAME = 'admin_type';
const GOOGLE_AUTH_SETUP_TTL = 600;

function googleAuthSetupKey(operatorId, adminId) {
  return `admin_google_auth_setup:${Number(operatorId || 0)}:${Number(adminId || 0)}`;
}

function normalizePermissions(value) {
  return ManagePermission.serializePermissions(value);
}

function buildAdminPublic(admin) {
  if (!admin) {
    return null;
  }
  return {
    id: Number(admin.id || 0),
    username: admin.username || '',
    is_super: Number(admin.is_super || 0),
    admin_type_id: Number(admin.admin_type_id || 0),
    permissions: admin.permissions
      ? (typeof admin.permissions === 'string'
        ? (() => { try { return JSON.parse(admin.permissions); } catch { return []; } })()
        : admin.permissions)
      : [],
    status: Number(admin.status || 0),
    google_authentication_bound: Boolean(String(admin.google_secret || '').trim()),
    google_bound_at: admin.google_bound_at || '',
    created_at: admin.created_at || '',
    updated_at: admin.updated_at || ''
  };
}

async function getGoogleAuthTarget(req, res) {
  const id = Helper.parseInt(req.body?.id, 0);
  if (!id) {
    res.send(ApiResult.error(400, '管理员ID不能为空'));
    return null;
  }

  const [target, operator] = await Promise.all([
    DB.query().table(TABLE_NAME).where('id', id).first(),
    DB.query().table(TABLE_NAME).where('id', req.auth?.id() || 0).first()
  ]);
  if (!target) {
    res.send(ApiResult.error(404, '管理员不存在'));
    return null;
  }
  const isSelf = Number(target.id) === Number(operator?.id || 0);
  if (!isSelf && Number(operator?.is_super || 0) !== 1) {
    res.send(ApiResult.error(403, '只有超级管理员可以管理其他账号的谷歌验证器'));
    return null;
  }
  return { target, operator, isSelf };
}

async function googleAuthSetup(req, res) {
  try {
    const context = await getGoogleAuthTarget(req, res);
    if (!context) return;
    if (String(context.target.google_secret || '').trim()) {
      return res.send(ApiResult.error(400, '该管理员已绑定谷歌验证器'));
    }

    const secret = generateGoogleAuthenticatorSecret();
    await RedisCache.set(
      googleAuthSetupKey(context.operator.id, context.target.id),
      secret,
      GOOGLE_AUTH_SETUP_TTL
    );
    return res.send(ApiResult.success({
      id: Number(context.target.id),
      username: context.target.username || '',
      secret,
      otpauth_uri: buildGoogleAuthenticatorUri(secret, context.target.username, Config.APP_NAME || 'NeuroMobility'),
      expires_in: GOOGLE_AUTH_SETUP_TTL
    }, '谷歌验证器绑定信息已生成'));
  } catch (error) {
    console.error('[AdminService.googleAuthSetup] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.googleAuthSetup'));
  }
}

async function googleAuthBind(req, res) {
  try {
    const context = await getGoogleAuthTarget(req, res);
    if (!context) return;
    if (String(context.target.google_secret || '').trim()) {
      return res.send(ApiResult.error(400, '该管理员已绑定谷歌验证器'));
    }
    const cacheKey = googleAuthSetupKey(context.operator.id, context.target.id);
    const secret = await RedisCache.get(cacheKey);
    if (!secret) return res.send(ApiResult.error(400, '绑定信息已失效，请重新生成'));

    const googleCode = String(req.body?.google_code || '').trim();
    if (!verifyGoogleAuthenticatorCode(secret, googleCode)) {
      return res.send(ApiResult.error(400, '谷歌验证码错误或已失效'));
    }

    await DB.query().table(TABLE_NAME).where('id', context.target.id).update({
      google_secret: secret,
      google_bound_at: Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date())
    });
    await RedisCache.delete(cacheKey);
    return res.send(ApiResult.success({ id: Number(context.target.id) }, '谷歌验证器绑定成功'));
  } catch (error) {
    console.error('[AdminService.googleAuthBind] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.googleAuthBind'));
  }
}

async function googleAuthUnbind(req, res) {
  try {
    const context = await getGoogleAuthTarget(req, res);
    if (!context) return;
    const secret = String(context.target.google_secret || '').trim();
    if (!secret) return res.send(ApiResult.error(400, '该管理员尚未绑定谷歌验证器'));

    if (context.isSelf) {
      const googleCode = String(req.body?.google_code || '').trim();
      if (!verifyGoogleAuthenticatorCode(secret, googleCode)) {
        return res.send(ApiResult.error(400, '谷歌验证码错误或已失效'));
      }
    }

    await DB.query().table(TABLE_NAME).where('id', context.target.id).update({
      google_secret: null,
      google_bound_at: null
    });
    return res.send(ApiResult.success({ id: Number(context.target.id) }, '谷歌验证器已解绑'));
  } catch (error) {
    console.error('[AdminService.googleAuthUnbind] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.googleAuthUnbind'));
  }
}

async function list(req, res) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 10);
    const username = Helper.safeString(req.body?.username).trim();
    const status = req.body?.status;
    const isSuper = req.body?.is_super;

    const query = DB.query().table(TABLE_NAME);

    if (username) {
      query.where('username', 'like', `%${username}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      query.where('status', Number(status));
    }
    if (isSuper !== undefined && isSuper !== null && isSuper !== '') {
      query.where('is_super', Number(isSuper));
    }

    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);

    const items = (result.items || []).map((admin) => buildAdminPublic(admin));

    return res.send(ApiResult.success({
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage,
      items
    }, '获取管理员列表成功'));
  } catch (error) {
    console.error('[AdminService.list] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.list'));
  }
}

async function detail(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const admin = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!admin) {
      return res.send(ApiResult.error(404, '管理员不存在'));
    }

    return res.send(ApiResult.success(buildAdminPublic(admin), '获取管理员详情成功'));
  } catch (error) {
    console.error('[AdminService.detail] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.detail'));
  }
}

async function create(req, res) {
  try {
    const username = Helper.safeString(req.body?.username, 64).trim();
    const password = String(req.body?.password || '');
    const status = Helper.parseInt(req.body?.status, 1);
    const isSuper = Helper.parseInt(req.body?.is_super, 0);
    const adminTypeId = Helper.parseInt(req.body?.admin_type_id, 0);
    const permissions = normalizePermissions(req.body?.permissions);

    if (!username) {
      return res.send(ApiResult.error(400, '用户名不能为空'));
    }
    if (!password) {
      return res.send(ApiResult.error(400, '密码不能为空'));
    }
    if (password.length < 6) {
      return res.send(ApiResult.error(400, '密码长度不能少于6位'));
    }

    const exists = await DB.query().table(TABLE_NAME).where('username', username).first();
    if (exists) {
      return res.send(ApiResult.error(400, '用户名已存在'));
    }

    const granterRow = await DB.query()
      .table(TABLE_NAME)
      .where('id', req.auth?.id() || 0)
      .first();
    const granter = await ManagePermission.attachAdminTypeInfo(granterRow);

    if (isSuper && (!granter || Number(granter.is_super || 0) !== 1)) {
      return res.send(ApiResult.error(403, '只有超级管理员可以创建超级管理员'));
    }

    if (!ManagePermission.canGrantPermissions(granter, permissions)) {
      return res.send(ApiResult.error(403, '不能授予自己未拥有的权限'));
    }

    if (adminTypeId) {
      const adminType = await ManagePermission.getAdminTypeById(adminTypeId, true);
      if (!adminType) return res.send(ApiResult.error(400, '管理员类型不存在或未启用'));
      if (!ManagePermission.canGrantPermissions(granter, adminType.permissions)) {
        return res.send(ApiResult.error(403, '不能授予自己未拥有的类型权限'));
      }
    }

    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const passwordHash = await Helper.password_hash(password);

    const insertResult = { insertId: 0 };
    const ok = await DB.query().table(TABLE_NAME).insert({
      username,
      password: passwordHash,
      status,
      is_super: isSuper,
      admin_type_id: adminTypeId,
      permissions: permissions ? JSON.stringify(ManagePermission.normalizePermissions(permissions)) : null,
      created_at: now,
      updated_at: now
    }, insertResult);

    if (!ok) {
      return res.send(ApiResult.error(500, '创建失败'));
    }

    const admin = await DB.query().table(TABLE_NAME).where('id', insertResult.insertId).first();

    return res.send(ApiResult.success(buildAdminPublic(admin), '创建成功'));
  } catch (error) {
    console.error('[AdminService.create] error:', error);
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.send(ApiResult.error(400, '用户名已存在'));
    }
    return res.send(ApiResult.exception(error, 'AdminService.create'));
  }
}

async function update(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const admin = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!admin) {
      return res.send(ApiResult.error(404, '管理员不存在'));
    }

    const granterRow = await DB.query()
      .table(TABLE_NAME)
      .where('id', req.auth?.id() || 0)
      .first();
    const granter = await ManagePermission.attachAdminTypeInfo(granterRow);

    const isSelf = Number(admin.id) === Number(req.auth?.id() || 0);
    const granterIsSuper = granter && Number(granter.is_super || 0) === 1;

    if (!granterIsSuper && !isSelf && Number(admin.is_super || 0) === 1) {
      return res.send(ApiResult.error(403, '无权修改超级管理员'));
    }

    const data = {};
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    data.updated_at = now;

    if (req.body?.username !== undefined) {
      const username = Helper.safeString(req.body.username, 64).trim();
      if (!username) {
        return res.send(ApiResult.error(400, '用户名不能为空'));
      }
      if (username !== admin.username) {
        const exists = await DB.query()
          .table(TABLE_NAME)
          .where('username', username)
          .where('id', '<>', id)
          .first();
        if (exists) {
          return res.send(ApiResult.error(400, '用户名已存在'));
        }
      }
      data.username = username;
    }

    if (req.body?.status !== undefined) {
      data.status = Helper.parseInt(req.body.status, 1);
    }
    if (req.body?.admin_type_id !== undefined) {
      data.admin_type_id = Helper.parseInt(req.body.admin_type_id, 0);
      if (data.admin_type_id) {
        const adminType = await ManagePermission.getAdminTypeById(data.admin_type_id, true);
        if (!adminType) return res.send(ApiResult.error(400, '管理员类型不存在或未启用'));
        if (!ManagePermission.canGrantPermissions(granter, adminType.permissions)) {
          return res.send(ApiResult.error(403, '不能授予自己未拥有的类型权限'));
        }
      }
    }

    if (req.body?.is_super !== undefined) {
      const isSuper = Helper.parseInt(req.body.is_super, 0);
      if (isSuper && !granterIsSuper) {
        return res.send(ApiResult.error(403, '只有超级管理员可以设置超级管理员'));
      }
      if (!isSelf && !granterIsSuper && Number(admin.is_super || 0) === 1) {
        return res.send(ApiResult.error(403, '无权修改超级管理员'));
      }
      data.is_super = isSuper;
    }

    if (req.body?.permissions !== undefined) {
      const permissions = ManagePermission.normalizePermissions(req.body.permissions);
      if (!ManagePermission.canGrantPermissions(granter, permissions)) {
        return res.send(ApiResult.error(403, '不能授予自己未拥有的权限'));
      }
      data.permissions = permissions.length ? JSON.stringify(permissions) : null;
    }

    const password = String(req.body?.password || '');
    if (password) {
      if (password.length < 6) {
        return res.send(ApiResult.error(400, '密码长度不能少于6位'));
      }
      data.password = await Helper.password_hash(password);
    }

    if (Object.keys(data).length === 1) {
      return res.send(ApiResult.success(buildAdminPublic(admin), '没有需要更新的字段'));
    }

    await DB.query().table(TABLE_NAME).where('id', id).update(data);

    const fresh = await DB.query().table(TABLE_NAME).where('id', id).first();
    return res.send(ApiResult.success(buildAdminPublic(fresh), '更新成功'));
  } catch (error) {
    console.error('[AdminService.update] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.update'));
  }
}

async function remove(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const admin = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!admin) {
      return res.send(ApiResult.error(404, '管理员不存在'));
    }

    if (Number(admin.is_super || 0) === 1) {
      return res.send(ApiResult.error(403, '超级管理员不可删除'));
    }

    if (Number(admin.id) === Number(req.auth?.id() || 0)) {
      return res.send(ApiResult.error(403, '不能删除自己'));
    }

    const granter = await DB.query()
      .table(TABLE_NAME)
      .where('id', req.auth?.id() || 0)
      .first();
    if (!granter || Number(granter.is_super || 0) !== 1) {
      return res.send(ApiResult.error(403, '只有超级管理员可以删除管理员'));
    }

    await DB.query().table(TABLE_NAME).where('id', id).delete();

    return res.send(ApiResult.success({ id }, '删除成功'));
  } catch (error) {
    console.error('[AdminService.remove] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.remove'));
  }
}

async function options(req, res) {
  try {
    const list = await DB.query()
      .table(TYPE_TABLE_NAME)
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc')
      .get();

    const items = (list || []).map((item) => ({
      id: Number(item.id || 0),
      name: item.name || '',
      status: Number(item.status || 0),
      sort: Number(item.sort || 0)
    }));

    return res.send(ApiResult.success({ items }, '获取管理员类型选项成功'));
  } catch (error) {
    console.error('[AdminService.options] error:', error);
    return res.send(ApiResult.exception(error, 'AdminService.options'));
  }
}

export default { list, detail, create, update, remove, options, googleAuthSetup, googleAuthBind, googleAuthUnbind };
