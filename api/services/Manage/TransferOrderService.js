import { ethers } from 'ethers';
import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import ChainConfig from '../../Util/ChainConfig.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';

const DEPOSIT_TABLE = 'receiver_order';
const WITHDRAWAL_TABLE = 'withdrawal_order';
const WITHDRAWAL_PENDING = 0;
const WITHDRAWAL_RETURNED = 3;

function filters(req) {
  return {
    wallet: String(req.body?.wallet || '').trim(),
    token: String(req.body?.token || '').trim().toUpperCase(),
    orderId: String(req.body?.order_id || '').trim(),
    txHash: String(req.body?.tx_hash || '').trim(),
    status: String(req.body?.status ?? '').trim(),
    start: String(req.body?.start_date || '').trim(),
    end: String(req.body?.end_date || '').trim()
  };
}

function applyFilters(query, values, includeStatus = false) {
  if (values.wallet) query.where('wallet', 'like', `%${values.wallet}%`);
  if (values.token) query.where('token', values.token);
  if (values.orderId) query.where('order_id', 'like', `%${values.orderId}%`);
  if (values.txHash) query.where('tx_hash', 'like', `%${values.txHash}%`);
  if (includeStatus && values.status !== '') query.where('status', Helper.parseInt(values.status, 0));
  if (/^\d{4}-\d{2}-\d{2}$/u.test(values.start)) query.where('created_at', '>=', `${values.start} 00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(values.end)) query.where('created_at', '<=', `${values.end} 23:59:59`);
  return query;
}

async function tokenContext() {
  const tokens = await AssetToken.getTokens();
  const map = new Map(tokens.map(item => [String(item.value || '').toUpperCase(), Number(item.decimals || AssetToken.DEFAULT_DECIMALS)]));
  return {
    map,
    options: tokens.map(item => ({ label: item.label, value: item.value }))
  };
}

function decimalsFor(token, map) {
  return map.get(String(token || '').toUpperCase()) ?? AssetToken.DEFAULT_DECIMALS;
}

function normalizeDeposit(row, tokenMap) {
  const decimals = decimalsFor(row.token, tokenMap);
  return {
    id: Number(row.id || 0),
    order_id: row.order_id || '',
    contract: row.contract || '',
    wallet: row.wallet || '',
    token: row.token || '',
    amount: formatAssetAmount(row.amount || '0', decimals),
    raw_amount: String(row.amount || '0'),
    tx_hash: row.tx_hash || '',
    block_number: Number(row.block_number || 0),
    log_index: Number(row.index || 0),
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function normalizeWithdrawal(row, tokenMap, nowUnix = Math.floor(Date.now() / 1000)) {
  const decimals = decimalsFor(row.token, tokenMap);
  const deadline = Number(row.deadline || 0);
  return {
    id: Number(row.id || 0),
    order_id: row.order_id || '',
    wallet: row.wallet || '',
    token: row.token || '',
    token_contract: row.token_contract || '',
    amount: formatAssetAmount(row.amount || '0', decimals),
    service_amount: formatAssetAmount(row.service_amount || '0', decimals),
    debit_amount: formatAssetAmount(row.debit_amount || '0', decimals),
    raw_amount: String(row.amount || '0'),
    raw_service_amount: String(row.service_amount || '0'),
    raw_debit_amount: String(row.debit_amount || '0'),
    deadline,
    deadline_at: deadline > 0 ? Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date(deadline * 1000)) : '',
    status: Number(row.status || 0),
    tx_hash: row.tx_hash || '',
    can_cancel: Number(row.status || 0) === WITHDRAWAL_PENDING && deadline > 0 && deadline < nowUnix,
    cancel_remaining_seconds: Number(row.status || 0) === WITHDRAWAL_PENDING && deadline > nowUnix ? deadline - nowUnix : 0,
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

async function depositList(req, res) {
  try {
    await ensureAssetTransferTables();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const query = applyFilters(DB.query().table(DEPOSIT_TABLE), filters(req)).orderBy('id', 'desc');
    const [result, context] = await Promise.all([query.paginate(page, pageSize), tokenContext()]);
    return res.send(ApiResult.success({
      items: (result.items || []).map(row => normalizeDeposit(row, context.map)),
      token_options: context.options,
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: Math.max(1, result.lastPage)
    }, '获取充值订单成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'TransferOrderService.depositList'));
  }
}

async function withdrawalList(req, res) {
  try {
    await ensureAssetTransferTables();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const query = applyFilters(DB.query().table(WITHDRAWAL_TABLE), filters(req), true).orderBy('id', 'desc');
    const [result, context] = await Promise.all([query.paginate(page, pageSize), tokenContext()]);
    const nowUnix = Math.floor(Date.now() / 1000);
    return res.send(ApiResult.success({
      items: (result.items || []).map(row => normalizeWithdrawal(row, context.map, nowUnix)),
      token_options: context.options,
      status_options: [
        { label: '待提交', value: 0 },
        { label: '已提交', value: 1 },
        { label: '已完成', value: 2 },
        { label: '已退回', value: 3 }
      ],
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: Math.max(1, result.lastPage)
    }, '获取提现订单成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'TransferOrderService.withdrawalList'));
  }
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function withdrawalStatusLabel(status) {
  return ({ 0: '待提交', 1: '已提交', 2: '已完成', 3: '已退回' })[Number(status)] || `未知(${status})`;
}

async function withdrawalExport(req, res) {
  try {
    await ensureAssetTransferTables();
    const [rows, context] = await Promise.all([
      applyFilters(DB.query().table(WITHDRAWAL_TABLE), filters(req), true).orderBy('id', 'desc').get(),
      tokenContext()
    ]);
    const headers = ['ID', '订单号', '钱包地址', '资产', '申请数量', '到账数量', '手续费', '状态', '交易哈希', '签名截止时间', '创建时间', '更新时间'];
    const lines = [headers.map(csvEscape).join(',')];
    for (const raw of rows || []) {
      const row = normalizeWithdrawal(raw, context.map);
      lines.push([
        row.id, row.order_id, row.wallet, row.token, row.debit_amount, row.amount,
        row.service_amount, withdrawalStatusLabel(row.status), row.tx_hash, row.deadline_at,
        row.created_at, row.updated_at
      ].map(csvEscape).join(','));
    }
    const filename = `withdrawal-orders-${Helper.dateFormat('YYYYmmddHHMMSS', new Date())}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\ufeff${lines.join('\r\n')}\r\n`);
  } catch (error) {
    return res.send(ApiResult.exception(error, 'TransferOrderService.withdrawalExport'));
  }
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function isAddress(value) {
  return /^0x[a-f0-9]{40}$/u.test(normalizeAddress(value));
}

async function assertExpiredAndUnclaimed(order) {
  const rpc = (ChainConfig.getRpcs() || []).find(Boolean);
  const contractAddress = String(ChainConfig.getContract('TokenWithdrawal').address || '').trim();
  if (!rpc || !isAddress(contractAddress)) throw new Error('提现链配置不完整，无法安全取消订单');
  if (Number(order.deadline || 0) <= 0) throw new Error('订单缺少有效截止时间，无法安全取消');

  const provider = new ethers.JsonRpcProvider(rpc);
  const [latestBlock, claim] = await Promise.all([
    provider.getBlock('latest'),
    new ethers.Contract(contractAddress, [
      'function claimList(uint256) view returns (address claimer,address token,uint256 claimAmount,uint256 serviceAmount,uint256 claimTime)'
    ], provider).claimList(order.order_id)
  ]);
  if (!latestBlock || Number(latestBlock.timestamp || 0) <= Number(order.deadline)) {
    throw new Error('提现订单签名尚未过期，暂不能取消');
  }
  if (normalizeAddress(claim?.claimer || claim?.[0]) !== '0x0000000000000000000000000000000000000000') {
    throw new Error('提现订单已在链上提取，不能取消');
  }
}

async function withdrawalCancel(req, res) {
  try {
    await ensureAssetTransferTables();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '提现订单 ID 不能为空'));
    const order = await DB.query().table(WITHDRAWAL_TABLE).where('id', id).first();
    if (!order) return res.send(ApiResult.error(404, '提现订单不存在'));
    if (Number(order.status) !== WITHDRAWAL_PENDING) return res.send(ApiResult.error(400, '只有待提交的提现订单可以取消'));

    await assertExpiredAndUnclaimed(order);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const prefix = Database.prefix('default') || '';
    let responseData = null;

    await DB.transaction(async (config, connection) => {
      const lockedRows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}${WITHDRAWAL_TABLE} WHERE id=? LIMIT 1 FOR UPDATE`,
        [id]
      );
      const locked = lockedRows?.[0];
      if (!locked) throw new Error('提现订单不存在');
      if (Number(locked.status) !== WITHDRAWAL_PENDING) throw new Error('提现订单状态已变化，请刷新后重试');
      if (Number(locked.deadline || 0) <= 0 || Number(locked.deadline) >= Math.floor(Date.now() / 1000)) {
        throw new Error('提现订单签名尚未过期，暂不能取消');
      }

      const assetRows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=LOWER(?) AND token=? LIMIT 1 FOR UPDATE`,
        [locked.wallet, locked.token]
      );
      const asset = assetRows?.[0];
      if (!asset) throw new Error('钱包资产不存在，无法退回');
      const debit = BigInt(String(locked.debit_amount || '0'));
      const balanceBefore = BigInt(String(asset.balance || '0'));
      const frozenBefore = BigInt(String(asset.frozen_balance || '0'));
      if (debit <= 0n || frozenBefore < debit) throw new Error('冻结资产与订单不匹配，无法退回');
      const balanceAfter = balanceBefore + debit;
      const frozenAfter = frozenBefore - debit;

      await DB.query(config, connection).table('wallet_assets').where('id', asset.id).update({
        balance: balanceAfter.toString(), frozen_balance: frozenAfter.toString(), updated_at: now
      });
      await DB.query(config, connection).table('wallet_assets_logs').insert({
        biz_id: locked.order_id, wallet: locked.wallet, token: locked.token, balance: debit.toString(),
        before_balance: balanceBefore.toString(), after_balance: balanceAfter.toString(),
        scene: 'token_withdrawal_cancel', reason: '后台取消提现订单退回', type: 'in', created_at: now, updated_at: now
      });
      await DB.query(config, connection).table('wallet_frozen_assets_logs').insert({
        biz_id: locked.order_id, wallet: locked.wallet, token: locked.token, balance: debit.toString(),
        before_balance: frozenBefore.toString(), after_balance: frozenAfter.toString(),
        scene: 'token_withdrawal_cancel', reason: '后台取消提现订单退回', type: 'out', created_at: now, updated_at: now
      });
      await DB.query(config, connection).table(WITHDRAWAL_TABLE).where('id', locked.id).where('status', WITHDRAWAL_PENDING).update({
        status: WITHDRAWAL_RETURNED, updated_at: now
      });
      responseData = { id: locked.id, order_id: locked.order_id, status: WITHDRAWAL_RETURNED };
    });

    return res.send(ApiResult.success(responseData, '提现订单已取消，冻结资产已退回'));
  } catch (error) {
    if (/不存在|只有待提交|状态已变化|尚未过期|不能取消|无法|不匹配/u.test(error.message || '')) {
      return res.send(ApiResult.error(400, error.message));
    }
    return res.send(ApiResult.exception(error, 'TransferOrderService.withdrawalCancel'));
  }
}

export default { depositList, withdrawalList, withdrawalExport, withdrawalCancel };
