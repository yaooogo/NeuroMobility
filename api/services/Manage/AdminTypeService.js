import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import ApiResult from '../../Util/ApiResult.js';
import ManagePermission from '../../Util/ManagePermission.js';

const TABLE_NAME = 'admin_type';

function buildType(row) {
  if (!row) {
    return null;
  }
  let permissions = row.permissions;
  if (permissions && typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch {
      permissions = [];
    }
  }
  if (!Array.isArray(permissions)) {
    permissions = permissions ? [permissions] : [];
  }
  return {
    id: Number(row.id || 0),
    name: row.name || '',
    permissions,
    status: Number(row.status ?? 1),
    sort: Number(row.sort || 0),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function list(req, res) {
  try {

    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 10);
    const name = Helper.safeString(req.body?.name).trim();
    const status = req.body?.status;

    const query = DB.query().table(TABLE_NAME);

    if (name) {
      query.where('name', 'like', `%${name}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      query.where('status', Number(status));
    }

    query.orderBy('sort', 'asc').orderBy('id', 'asc');
    const result = await query.paginate(page, pageSize);
    const items = (result.items || []).map((row) => buildType(row));

    return res.send(ApiResult.success({
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage,
      items
    }, '获取管理员类型列表成功'));
  } catch (error) {
    console.error('[AdminTypeService.list] error:', error);
    return res.send(ApiResult.exception(error, 'AdminTypeService.list'));
  }
}

async function all(req, res) {
  try {

    const rows = await DB.query()
      .table(TABLE_NAME)
      .where('status', 1)
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc')
      .get();

    const items = (rows || []).map((row) => buildType(row));

    return res.send(ApiResult.success({ items }, '获取管理员类型选项成功'));
  } catch (error) {
    console.error('[AdminTypeService.all] error:', error);
    return res.send(ApiResult.exception(error, 'AdminTypeService.all'));
  }
}

async function detail(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) {
      return res.send(ApiResult.error(404, '管理员类型不存在'));
    }

    return res.send(ApiResult.success(buildType(row), '获取管理员类型详情成功'));
  } catch (error) {
    console.error('[AdminTypeService.detail] error:', error);
    return res.send(ApiResult.exception(error, 'AdminTypeService.detail'));
  }
}

async function save(req, res) {
  try {

    const id = Helper.parseInt(req.body?.id, 0);
    const name = Helper.safeString(req.body?.name, 64).trim();
    const status = Helper.parseInt(req.body?.status, 1);
    const sort = Helper.parseInt(req.body?.sort, 0);
    const permissions = ManagePermission.normalizePermissions(req.body?.permissions);

    if (!name) {
      return res.send(ApiResult.error(400, '类型名称不能为空'));
    }

    const granterRow = await DB.query()
      .table('admin')
      .where('id', req.auth?.id() || 0)
      .first();
    const granter = await ManagePermission.attachAdminTypeInfo(granterRow);
    if (!ManagePermission.canGrantPermissions(granter, permissions)) {
      return res.send(ApiResult.error(403, '不能配置自己未拥有的权限'));
    }

    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const permissionsJson = permissions.length ? JSON.stringify(permissions) : null;

    if (id > 0) {
      const exists = await DB.query()
        .table(TABLE_NAME)
        .where('id', id)
        .first();
      if (!exists) {
        return res.send(ApiResult.error(404, '管理员类型不存在'));
      }

      const dup = await DB.query()
        .table(TABLE_NAME)
        .where('name', name)
        .where('id', '<>', id)
        .first();
      if (dup) {
        return res.send(ApiResult.error(400, '类型名称已存在'));
      }

      await DB.query()
        .table(TABLE_NAME)
        .where('id', id)
        .update({
          name,
          status,
          sort,
          permissions: permissionsJson,
          updated_at: now
        });

      const fresh = await DB.query().table(TABLE_NAME).where('id', id).first();
      return res.send(ApiResult.success(buildType(fresh), '更新成功'));
    }

    const dup = await DB.query().table(TABLE_NAME).where('name', name).first();
    if (dup) {
      return res.send(ApiResult.error(400, '类型名称已存在'));
    }

    const insertResult = { insertId: 0 };
    const ok = await DB.query().table(TABLE_NAME).insert({
      name,
      status,
      sort,
      permissions: permissionsJson,
      created_at: now,
      updated_at: now
    }, insertResult);

    if (!ok) {
      return res.send(ApiResult.error(500, '创建失败'));
    }

    const fresh = await DB.query().table(TABLE_NAME).where('id', insertResult.insertId).first();
    return res.send(ApiResult.success(buildType(fresh), '创建成功'));
  } catch (error) {
    console.error('[AdminTypeService.save] error:', error);
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.send(ApiResult.error(400, '类型名称已存在'));
    }
    return res.send(ApiResult.exception(error, 'AdminTypeService.save'));
  }
}

async function remove(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) {
      return res.send(ApiResult.error(400, 'ID不能为空'));
    }

    const row = await DB.query().table(TABLE_NAME).where('id', id).first();
    if (!row) {
      return res.send(ApiResult.error(404, '管理员类型不存在'));
    }

    const usedCount = await DB.query()
      .table('admin')
      .where('admin_type_id', id)
      .count();
    if (Number(usedCount || 0) > 0) {
      return res.send(ApiResult.error(400, '该类型下存在管理员，无法删除'));
    }

    await DB.query().table(TABLE_NAME).where('id', id).delete();

    return res.send(ApiResult.success({ id }, '删除成功'));
  } catch (error) {
    console.error('[AdminTypeService.remove] error:', error);
    return res.send(ApiResult.exception(error, 'AdminTypeService.remove'));
  }
}

async function permissionOptions(req, res) {
  try {
    const items = ManagePermission.MANAGE_MENU_PERMISSIONS.map((item) => ({
      key: item.key,
      label: item.label,
      superOnly: !!item.superOnly
    }));

    return res.send(ApiResult.success({ items }, '获取权限选项成功'));
  } catch (error) {
    console.error('[AdminTypeService.permissionOptions] error:', error);
    return res.send(ApiResult.exception(error, 'AdminTypeService.permissionOptions'));
  }
}

export default { list, all, detail, save, remove, permissionOptions };
