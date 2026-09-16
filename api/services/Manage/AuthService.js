import DB from '../../Util/database/DB.js';
import ManageAuth from '../../Util/ManageAuth.js';
import ManagePermission from '../../Util/ManagePermission.js';
import Helper from '../../Util/Helper.js';
import ApiResult from '../../Util/ApiResult.js';

const TABLE_NAME = 'admin';

function buildAdminPayload(admin) {
  return {
    id: admin.id,
    username: admin.username,
    is_super: Number(admin.is_super || 0),
    admin_type_id: Number(admin.admin_type_id || 0),
    status: Number(admin.status || 0)
  };
}

async function login(req, res) {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.send(ApiResult.error(400, '用户名或密码不能为空'));
    }

    const admin = await DB.query()
      .table(TABLE_NAME)
      .where('username', username)
      .first();

    if (!admin) {
      return res.send(ApiResult.error(401, '用户名或密码错误'));
    }

    if (Number(admin.status || 0) !== 1) {
      return res.send(ApiResult.error(403, '账号已被禁用'));
    }

    const ok = await Helper.password_verify(password, admin.password);
    if (!ok) {
      return res.send(ApiResult.error(401, '用户名或密码错误'));
    }

    const payload = buildAdminPayload(admin);
    const tokenInfo = await ManageAuth.generateToken(payload);

    return res.send(ApiResult.success({
      token: tokenInfo.token,
      tokenHead: tokenInfo.tokenHead,
      expiresIn: tokenInfo.expiresIn,
      user: payload
    }, '登录成功'));
  } catch (error) {
    console.error('[Manage AuthService.login] error:', error);
    return res.send(ApiResult.exception(error, 'AuthService.login'));
  }
}

async function info(req, res) {
  try {
    const authId = req.auth?.id() || 0;
    if (!authId) {
      return res.send(ApiResult.error(401, '未登录'));
    }

    const adminRow = await DB.query()
      .table(TABLE_NAME)
      .where('id', authId)
      .first();

    if (!adminRow) {
      return res.send(ApiResult.error(401, '账号不存在'));
    }

    if (Number(adminRow.status || 0) !== 1) {
      return res.send(ApiResult.error(403, '账号已被禁用'));
    }

    const admin = await ManagePermission.attachAdminTypeInfo(adminRow);
    const profile = ManagePermission.buildAdminPermissionProfile(admin);
    const payload = buildAdminPayload(adminRow);

    return res.send(ApiResult.success({
      ...payload,
      ...profile
    }, '获取用户信息成功'));
  } catch (error) {
    console.error('[Manage AuthService.info] error:', error);
    return res.send(ApiResult.exception(error, 'AuthService.info'));
  }
}

async function logout(req, res) {
  try {
    await ManageAuth.forgetToken(req);
    return res.send(ApiResult.success(null, '退出登录成功'));
  } catch (error) {
    console.error('[Manage AuthService.logout] error:', error);
    return res.send(ApiResult.exception(error, 'AuthService.logout'));
  }
}

export default { login, info, logout };
