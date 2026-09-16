import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import CacheData from '../../Util/CacheData.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';

const TABLE_NAME = 'assets_tokens';
const COLUMNS = [
  'id', 'symbol', 'name', 'decimals', 'contract', 'icon',
  'recharge_min_amount', 'rechargeable', 'withdrawable',
  'withdraw_service_type', 'withdraw_service_fee', 'withdraw_min_amount',
  'withdraw_daily_limit', 'status', 'sort'
];

function normalize(row) {
  return {
    ...AssetToken.normalizeTokenRow(row),
    status: Number(row.status || 0),
    sort: Number(row.sort || 0)
  };
}

function decimal(value, scale, label) {
  const text = String(value ?? '0').trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text) || Number(text) < 0) throw new Error(`${label}格式不正确`);
  const [integer, fraction = ''] = text.split('.');
  return `${integer}.${fraction.padEnd(scale, '0').slice(0, scale)}`;
}

async function list(req, res) {
  try {
    await AssetToken.ensureAssetTokenColumns();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size ?? req.body?.pageSize, 20);
    const keyword = String(req.body?.keyword || '').trim();
    const status = req.body?.status;
    const query = DB.query().table(TABLE_NAME).select(COLUMNS);
    if (keyword) query.where((builder) => builder.where('symbol', 'like', `%${keyword}%`).orWhere('name', 'like', `%${keyword}%`));
    if (status !== '' && status !== null && status !== undefined) query.where('status', Number(status));
    query.orderBy('sort', 'asc').orderBy('id', 'asc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalize), total: result.total,
      page: result.currentPage, page_size: result.perPage, last_page: result.lastPage
    }, '获取资产类型成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AssetTokenService.list'));
  }
}

async function update(req, res) {
  try {
    await AssetToken.ensureAssetTokenColumns();
    const id = Helper.parseInt(req.body?.id, 0);
    const row = id ? await DB.query().table(TABLE_NAME).where('id', id).first() : null;
    if (!row) return res.send(ApiResult.error(404, '资产类型不存在'));
    const symbol = String(req.body?.symbol || '').trim().toUpperCase();
    const contract = String(req.body?.contract || '').trim();
    const decimals = Helper.parseInt(req.body?.decimals, 18);
    const serviceType = Helper.parseInt(req.body?.withdraw_service_type, 0) === 1 ? 1 : 0;
    if (!symbol) return res.send(ApiResult.error(400, '资产符号不能为空'));
    if (decimals < 0 || decimals > 36) return res.send(ApiResult.error(400, '资产精度必须为 0-36'));
    if (contract && !/^0x[a-fA-F0-9]{40}$/u.test(contract)) return res.send(ApiResult.error(400, '合约地址格式不正确'));
    const duplicate = await DB.query().table(TABLE_NAME).where('symbol', symbol).where('id', '<>', id).first();
    if (duplicate) return res.send(ApiResult.error(409, '资产符号已存在'));
    const fee = decimal(req.body?.withdraw_service_fee, 4, '提现手续费');
    if (serviceType === 1 && Number(fee) > 100) return res.send(ApiResult.error(400, '百分比手续费不能超过 100'));
    await DB.query().table(TABLE_NAME).where('id', id).update({
      symbol,
      name: String(req.body?.name || '').trim() || null,
      decimals,
      contract: contract || null,
      icon: String(req.body?.icon || '').trim() || null,
      recharge_min_amount: decimal(req.body?.recharge_min_amount, 8, '最少充值金额'),
      rechargeable: Helper.parseInt(req.body?.rechargeable, 1) === 1 ? 1 : 0,
      withdrawable: Helper.parseInt(req.body?.withdrawable, 0) === 1 ? 1 : 0,
      withdraw_service_type: serviceType,
      withdraw_service_fee: fee,
      withdraw_min_amount: decimal(req.body?.withdraw_min_amount, 2, '最小提现金额'),
      withdraw_daily_limit: decimal(req.body?.withdraw_daily_limit, 8, '每日提现限额'),
      status: Helper.parseInt(req.body?.status, 1) === 1 ? 1 : 0,
      sort: Math.max(0, Helper.parseInt(req.body?.sort, 0))
    });
    await CacheData.removeAssetsTokens();
    const saved = await DB.query().table(TABLE_NAME).select(COLUMNS).where('id', id).first();
    return res.send(ApiResult.success(normalize(saved), '资产类型更新成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AssetTokenService.update'));
  }
}

export default { list, update };
