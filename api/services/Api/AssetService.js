import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import { formatAssetAmount, parseAssetAmount } from '../../Util/AssetAmount.js';
import { ensureAssetTransferTables } from '../../Util/AssetTransferSchema.js';
import ChainConfig from '../../Util/ChainConfig.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';

const TOKEN = 'USDT';
const WITHDRAW_TTL_SECONDS = 15 * 60;

function address(value) {
  return String(value || '').trim().toLowerCase();
}

function isWallet(value) {
  return /^0x[a-f0-9]{40}$/u.test(address(value));
}

function tokenPublic(item) {
  return {
    symbol: item.value,
    name: item.name,
    contract: item.contract,
    decimals: item.decimals,
    recharge_min_amount: String(item.recharge_min_amount || '0'),
    rechargeable: Number(item.rechargeable || 0),
    withdrawable: Number(item.withdrawable || 0),
    withdraw_service_type: Number(item.withdraw_service_type || 0),
    withdraw_service_fee: String(item.withdraw_service_fee || '0'),
    withdraw_min_amount: String(item.withdraw_min_amount || '0'),
    withdraw_daily_limit: String(item.withdraw_daily_limit || '0')
  };
}

async function getContext(req) {
  const wallet = address(req.auth?.address());
  if (!isWallet(wallet)) throw new Error('钱包地址无效');
  const token = await AssetToken.getTokenItem(TOKEN);
  if (!token || !isWallet(token.contract)) throw new Error('USDT 资产配置不完整');
  return { wallet, token, decimals: Number(token.decimals || AssetToken.DEFAULT_DECIMALS) };
}

async function ensureWalletAsset(wallet, token, config = 'default', connection = null) {
  const prefix = Database.prefix(config) || '';
  const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
  await DB.query(config, connection).exec(
    `INSERT IGNORE INTO ${prefix}wallet_assets (wallet, token, balance, frozen_balance, updated_at) VALUES (?, ?, 0, 0, ?)`,
    [wallet, token, now]
  );
  return DB.query(config, connection).table('wallet_assets').whereRaw('LOWER(wallet)=?', [wallet]).where('token', token).first();
}

async function releaseExpiredWithdrawals(wallet) {
  const prefix = Database.prefix('default') || '';
  const nowUnix = Math.floor(Date.now() / 1000);
  const now = Helper.dateFormat();
  const candidates = await DB.query().table('withdrawal_order')
    .whereRaw('LOWER(wallet)=?', [wallet]).where('status', 0).whereRaw('deadline>0 AND deadline<?', [nowUnix]).get();
  if (!candidates?.length) return;

  // Only release after confirming on-chain that the signed order was never claimed.
  // If RPC is unavailable, keeping funds frozen is safer than a possible double credit.
  const rpc = (ChainConfig.getRpcs() || []).find(Boolean);
  const contractAddress = String(ChainConfig.getContract('TokenWithdrawal').address || '');
  if (!rpc || !isWallet(contractAddress)) return;
  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(contractAddress, [
    'function claimList(uint256) view returns (address claimer,address token,uint256 claimAmount,uint256 serviceAmount,uint256 claimTime)'
  ], provider);
  const releasableIds = [];
  try {
    for (const order of candidates) {
      const claim = await contract.claimList(order.order_id);
      if (address(claim?.claimer || claim?.[0]) === '0x0000000000000000000000000000000000000000') releasableIds.push(order.id);
    }
  } catch {
    return;
  }
  if (!releasableIds.length) return;

  await DB.transaction(async (config, connection) => {
    for (const orderId of releasableIds) {
      const lockedRows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}withdrawal_order WHERE id=? AND status=0 AND deadline<? LIMIT 1 FOR UPDATE`,
        [orderId, nowUnix]
      );
      const order = lockedRows?.[0];
      if (!order) continue;
      const debit = BigInt(String(order.debit_amount || '0'));
      if (debit <= 0n) continue;
      const assets = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
        [wallet, order.token]
      );
      const asset = assets?.[0];
      if (!asset) continue;
      const balanceBefore = BigInt(String(asset.balance || '0'));
      const frozenBefore = BigInt(String(asset.frozen_balance || '0'));
      if (frozenBefore < debit) continue;
      await DB.query(config, connection).table('wallet_assets').where('id', asset.id).update({
        balance: (balanceBefore + debit).toString(),
        frozen_balance: (frozenBefore - debit).toString(),
        updated_at: now
      });
      await DB.query(config, connection).table('wallet_assets_logs').insert({
        biz_id: order.order_id, wallet, token: order.token, balance: debit.toString(),
        before_balance: balanceBefore.toString(), after_balance: (balanceBefore + debit).toString(),
        scene: 'token_withdrawal_expired', reason: 'Expired withdrawal released', type: 'in', created_at: now, updated_at: now
      });
      await DB.query(config, connection).table('wallet_frozen_assets_logs').insert({
        biz_id: order.order_id, wallet, token: order.token, balance: debit.toString(),
        before_balance: frozenBefore.toString(), after_balance: (frozenBefore - debit).toString(),
        scene: 'token_withdrawal_expired', reason: 'Expired withdrawal released', type: 'out', created_at: now, updated_at: now
      });
      await DB.query(config, connection).table('withdrawal_order').where('id', order.id).update({ status: 3, updated_at: now });
    }
  });
}

function calculateFee(rawDebit, token, decimals) {
  const fee = new BigNumber(String(token.withdraw_service_fee || '0'));
  if (!fee.isFinite() || fee.isNegative()) return 0n;
  if (Number(token.withdraw_service_type || 0) === 1) {
    return BigInt(new BigNumber(rawDebit.toString()).times(fee).dividedBy(100).integerValue(BigNumber.ROUND_CEIL).toFixed(0));
  }
  return BigInt(parseAssetAmount(fee.toFixed(), decimals));
}

function createOrderId() {
  return (BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000))).toString();
}

async function overview(req, res) {
  try {
    await ensureAssetTransferTables();
    const { wallet, token, decimals } = await getContext(req);
    await releaseExpiredWithdrawals(wallet);
    const asset = await ensureWalletAsset(wallet, TOKEN);
    return res.send(ApiResult.success({
      wallet,
      token: tokenPublic(token),
      receiver_contract: ChainConfig.getContract('TokenReceiver').address || '',
      withdrawal_contract: ChainConfig.getContract('TokenWithdrawal').address || '',
      balance: formatAssetAmount(asset?.balance || '0', decimals),
      frozen_balance: formatAssetAmount(asset?.frozen_balance || '0', decimals),
      raw_balance: String(asset?.balance || '0')
    }, '获取资产信息成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AssetService.overview'));
  }
}

async function prepareWithdrawal(req, res) {
  try {
    await ensureAssetTransferTables();
    const { wallet, token, decimals } = await getContext(req);
    await releaseExpiredWithdrawals(wallet);
    const target = address(req.body?.address || wallet);
    if (target !== wallet) return res.send(ApiResult.error(400, '提现地址必须与当前登录钱包一致'));
    if (Number(token.withdrawable || 0) !== 1) return res.send(ApiResult.error(400, '当前资产暂不支持提现'));

    const walletInfo = await DB.query().table('wallet').whereRaw('LOWER(wallet)=?', [wallet]).first();
    if (!walletInfo || Number(walletInfo.status || 0) !== 1) return res.send(ApiResult.error(403, '当前账户不可用'));
    if (Number(walletInfo.withdraw_enabled || 0) !== 1 || Number(walletInfo.usdt_withdraw_enabled || 0) !== 1) {
      return res.send(ApiResult.error(403, '当前账户未开启 USDT 提现'));
    }

    const rawDebit = BigInt(parseAssetAmount(req.body?.amount, decimals));
    const rawMinimum = BigInt(parseAssetAmount(String(token.withdraw_min_amount || '0'), decimals));
    if (rawDebit <= 0n || rawDebit < rawMinimum) return res.send(ApiResult.error(400, `最低提现 ${token.withdraw_min_amount} USDT`));
    const rawFee = calculateFee(rawDebit, token, decimals);
    if (rawFee >= rawDebit) return res.send(ApiResult.error(400, '提现金额必须大于手续费'));
    const rawClaim = rawDebit - rawFee;
    const dailyLimit = BigInt(parseAssetAmount(String(token.withdraw_daily_limit || '0'), decimals));
    const orderId = createOrderId();
    const deadline = Math.floor(Date.now() / 1000) + WITHDRAW_TTL_SECONDS;
    const withdrawalContract = String(ChainConfig.getContract('TokenWithdrawal').address || '').trim();
    const privateKey = String(ChainConfig.getVerifyAddrPk() || '').trim();
    if (!isWallet(withdrawalContract) || !privateKey) return res.send(ApiResult.error(500, '提现合约配置不完整'));

    const signer = new ethers.Wallet(privateKey);
    const signature = ethers.Signature.from(await signer.signTypedData(
      { name: 'TokenWithdrawal', version: '1', chainId: Number(ChainConfig.getNetId()), verifyingContract: withdrawalContract },
      { Claim: [
        { name: 'orderId', type: 'uint256' }, { name: 'user', type: 'address' },
        { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' },
        { name: 'serviceAmount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }
      ] },
      { orderId, user: wallet, token: token.contract, amount: rawClaim, serviceAmount: rawFee, deadline }
    ));

    const prefix = Database.prefix('default') || '';
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    await DB.transaction(async (config, connection) => {
      const asset = await ensureWalletAsset(wallet, TOKEN, config, connection);
      const rows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE id=? LIMIT 1 FOR UPDATE`, [asset.id]
      );
      const locked = rows?.[0];
      const before = BigInt(String(locked?.balance || '0'));
      const frozenBefore = BigInt(String(locked?.frozen_balance || '0'));
      if (before < rawDebit) throw new Error('可用余额不足');

      if (dailyLimit > 0n) {
        const today = Helper.dateFormat('YYYY-mm-dd', new Date());
        const totals = await DB.query(config, connection).exec(
          `SELECT COALESCE(SUM(CAST(debit_amount AS DECIMAL(65,0))),0) AS total FROM ${prefix}withdrawal_order WHERE LOWER(wallet)=? AND token=? AND status IN (0,1,2) AND created_at>=?`,
          [wallet, TOKEN, `${today} 00:00:00`]
        );
        if (BigInt(String(totals?.[0]?.total || '0')) + rawDebit > dailyLimit) throw new Error('超过每日提现限额');
      }

      await DB.query(config, connection).table('wallet_assets').where('id', locked.id).update({
        balance: (before - rawDebit).toString(), frozen_balance: (frozenBefore + rawDebit).toString(), updated_at: now
      });
      await DB.query(config, connection).table('withdrawal_order').insert({
        order_id: orderId, wallet, token: TOKEN, token_contract: token.contract,
        amount: rawClaim.toString(), service_amount: rawFee.toString(), debit_amount: rawDebit.toString(),
        deadline, status: 0, tx_hash: null, created_at: now, updated_at: now
      });
      await DB.query(config, connection).table('wallet_assets_logs').insert({
        biz_id: orderId, wallet, token: TOKEN, balance: rawDebit.toString(), before_balance: before.toString(),
        after_balance: (before - rawDebit).toString(), scene: 'token_withdrawal', reason: 'USDT withdrawal reserved',
        type: 'out', created_at: now, updated_at: now
      });
      await DB.query(config, connection).table('wallet_frozen_assets_logs').insert({
        biz_id: orderId, wallet, token: TOKEN, balance: rawDebit.toString(), before_balance: frozenBefore.toString(),
        after_balance: (frozenBefore + rawDebit).toString(), scene: 'token_withdrawal', reason: 'USDT withdrawal reserved',
        type: 'in', created_at: now, updated_at: now
      });
    });

    return res.send(ApiResult.success({
      order_id: orderId, contract: withdrawalContract, token_contract: token.contract,
      amount: rawClaim.toString(), service_amount: rawFee.toString(), debit_amount: rawDebit.toString(),
      deadline, v: signature.v, r: signature.r, s: signature.s,
      display_amount: formatAssetAmount(rawClaim, decimals), display_fee: formatAssetAmount(rawFee, decimals)
    }, '提现订单已创建'));
  } catch (error) {
    if (/余额不足|每日提现限额|资产金额/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'AssetService.prepareWithdrawal'));
  }
}

async function withdrawalSubmitted(req, res) {
  try {
    await ensureAssetTransferTables();
    const wallet = address(req.auth?.address());
    const orderId = String(req.body?.order_id || '').trim();
    const txHash = String(req.body?.tx_hash || '').trim();
    if (!orderId || !/^0x[0-9a-f]{64}$/iu.test(txHash)) return res.send(ApiResult.error(400, '提现交易信息无效'));
    const row = await DB.query().table('withdrawal_order').where('order_id', orderId).whereRaw('LOWER(wallet)=?', [wallet]).first();
    if (!row) return res.send(ApiResult.error(404, '提现订单不存在'));
    if (Number(row.status || 0) === 0) {
      const rpc = (ChainConfig.getRpcs() || []).find(Boolean);
      const withdrawalContract = address(ChainConfig.getContract('TokenWithdrawal').address);
      if (!rpc || !isWallet(withdrawalContract)) return res.send(ApiResult.error(500, '提现链配置不完整'));
      const receipt = await new ethers.JsonRpcProvider(rpc).getTransactionReceipt(txHash);
      if (!receipt || Number(receipt.status) !== 1 || address(receipt.to) !== withdrawalContract) {
        return res.send(ApiResult.error(400, '未找到有效的提现链上回执'));
      }
      const iface = new ethers.Interface([
        'event Claimed(address indexed token,uint256 indexed orderId,address indexed user,uint256 claimAmount,uint256 serviceAmount,address feeReceiver,uint256 claimTime)'
      ]);
      const claimed = receipt.logs.some(log => {
        try {
          const parsed = iface.parseLog(log);
          return parsed?.name === 'Claimed'
            && String(parsed.args.orderId) === orderId
            && address(parsed.args.user) === wallet;
        } catch {
          return false;
        }
      });
      if (!claimed) return res.send(ApiResult.error(400, '提现链上回执与订单不匹配'));
      await DB.query().table('withdrawal_order').where('id', row.id).update({ status: 1, tx_hash: txHash, updated_at: Helper.dateFormat() });
    }
    return res.send(ApiResult.success({ order_id: orderId, tx_hash: txHash }, '提现交易已提交'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AssetService.withdrawalSubmitted'));
  }
}

async function records(req, res) {
  try {
    await ensureAssetTransferTables();
    const { wallet, token, decimals } = await getContext(req);
    await releaseExpiredWithdrawals(wallet);
    const deposits = await DB.query().table('receiver_order').whereRaw('LOWER(wallet)=?', [wallet]).orderBy('id', 'desc').take(100).get();
    const withdrawals = await DB.query().table('withdrawal_order').whereRaw('LOWER(wallet)=?', [wallet]).orderBy('id', 'desc').take(100).get();
    const items = [
      ...(deposits || []).map(row => ({ id: `deposit-${row.id}`, type: 'deposit', amount: formatAssetAmount(row.amount || '0', decimals), token: row.token || TOKEN, status: 2, tx_hash: row.tx_hash || '', time: row.created_at || '' })),
      ...(withdrawals || []).map(row => ({ id: `withdraw-${row.id}`, type: 'withdraw', amount: formatAssetAmount(row.debit_amount || '0', decimals), token: row.token || TOKEN, status: Number(row.status || 0), tx_hash: row.tx_hash || '', time: row.created_at || '' }))
    ].sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 100);
    return res.send(ApiResult.success({ items, token: tokenPublic(token) }, '获取充提记录成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'AssetService.records'));
  }
}

export default { overview, prepareWithdrawal, withdrawalSubmitted, records };
