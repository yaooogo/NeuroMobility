import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import ApiResult from '../../Util/ApiResult.js';
import ManageOperationLog from '../../Util/ManageOperationLog.js';

const TABLE_NAME = 'admin_operation_log';

function buildLog(row) {
  if (!row) {
    return null;
  }
  let params = row.request_params;
  if (params && typeof params === 'string') {
    try {
      params = JSON.parse(params);
    } catch {
      params = row.request_params;
    }
  }
  return {
    id: Number(row.id || 0),
    admin_id: Number(row.admin_id || 0),
    admin_username: row.admin_username || '',
    method: row.method || '',
    path: row.path || '',
    request_params: params ?? null,
    response_code: Number(row.response_code || 0),
    response_message: row.response_message || '',
    ip: row.ip || '',
    user_agent: row.user_agent || '',
    duration_ms: Number(row.duration_ms || 0),
    created_at: row.created_at || ''
  };
}

async function list(req, res) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 10);
    const adminId = Helper.parseInt(req.body?.admin_id, 0);
    const adminUsername = String(req.body?.admin_username || '').trim();
    const method = String(req.body?.method || '').trim().toUpperCase();
    const path = String(req.body?.path || '').trim();
    const code = req.body?.response_code;
    const codeNum = (code === '' || code === undefined || code === null) ? null : Number(code);
    const startDate = String(req.body?.start_date || '').trim();
    const endDate = String(req.body?.end_date || '').trim();

    const query = DB.query().table(TABLE_NAME);

    if (adminId > 0) {
      query.where('admin_id', adminId);
    }
    if (adminUsername) {
      query.where('admin_username', 'like', `%${adminUsername}%`);
    }
    if (method) {
      query.where('method', method);
    }
    if (path) {
      query.where('path', 'like', `%${path}%`);
    }
    if (codeNum !== null && !isNaN(codeNum)) {
      query.where('response_code', codeNum);
    }
    if (startDate) {
      query.whereRaw('created_at >= ?', [startDate]);
    }
    if (endDate) {
      query.whereRaw('created_at <= ?', [`${endDate} 23:59:59`]);
    }

    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    const items = (result.items || []).map((row) => buildLog(row));

    return res.send(ApiResult.success({
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage,
      items
    }, '获取操作日志列表成功'));
  } catch (error) {
    console.error('[OperationLogService.list] error:', error);
    return res.send(ApiResult.exception(error, 'OperationLogService.list'));
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
      return res.send(ApiResult.error(404, '日志不存在'));
    }

    return res.send(ApiResult.success(buildLog(row), '获取操作日志详情成功'));
  } catch (error) {
    console.error('[OperationLogService.detail] error:', error);
    return res.send(ApiResult.exception(error, 'OperationLogService.detail'));
  }
}

async function pathOptions(req, res) {
  try {
    const rows = await DB.query()
      .table(TABLE_NAME)
      .select(['path'])
      .groupBy('path')
      .orderBy('path', 'asc')
      .get();

    const items = (rows || []).map((row) => row.path).filter(Boolean);
    return res.send(ApiResult.success({ items }, '获取操作日志路径选项成功'));
  } catch (error) {
    console.error('[OperationLogService.pathOptions] error:', error);
    return res.send(ApiResult.exception(error, 'OperationLogService.pathOptions'));
  }
}

export default { list, detail, pathOptions };
