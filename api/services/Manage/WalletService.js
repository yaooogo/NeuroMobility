import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { formatAssetAmount, parseAssetAmount } from '../../Util/AssetAmount.js';

const WALLET_TABLE = 'wallet';
const WALLET_ASSET_TABLE = 'wallet_assets';

function normalizeWallet(row) {
  return {
    id: Number(row.id || 0),
    wallet: row.wallet || '',
    prices: String(row.prices ?? '0'),
    community_prices: String(row.community_prices ?? '0'),
    sub_prices: String(row.sub_prices ?? '0'),
    inviter: row.inviter || '',
    ref_code: row.ref_code || '',
    lv: Number(row.lv || 0),
    level: Number(row.level || 0),
    manual_level: Number(row.manual_level || 0),
    is_manual_level: Number(row.is_manual_level || 0),
    level_isupdate: Number(row.level_isupdate || 0),
    status: Number(row.status || 0),
    withdraw_enabled: Number(row.withdraw_enabled || 0),
    usdt_withdraw_enabled: Number(row.usdt_withdraw_enabled || 0),
    remark_system: row.remark_system || '',
    remark_name: row.remark_name || '',
    remark_community: row.remark_community || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || ''
  };
}

function parseWalletSettings(body) {
  const manualLevel = Helper.parseInt(body?.manual_level, 0);
  if (manualLevel < 0 || manualLevel > 3) throw new Error('手动等级必须在 0 到 3 之间');
  const isManualLevel = Number(body?.is_manual_level) === 1 ? 1 : 0;
  return {
    status: Number(body?.status) === 1 ? 1 : 0,
    withdraw_enabled: Number(body?.withdraw_enabled) === 1 ? 1 : 0,
    usdt_withdraw_enabled: Number(body?.usdt_withdraw_enabled) === 1 ? 1 : 0,
    is_manual_level: isManualLevel,
    manual_level: isManualLevel ? manualLevel : 0,
    remark_system: Helper.safeString(body?.remark_system, 255).trim(),
    remark_name: Helper.safeString(body?.remark_name, 255).trim(),
    remark_community: Helper.safeString(body?.remark_community, 255).trim()
  };
}

async function generateRefCode(config, connection) {
  for (let index = 0; index < 20; index += 1) {
    const candidate = Helper.randomStr(8).toUpperCase();
    const exists = await DB.query(config, connection).table(WALLET_TABLE).where('ref_code', candidate).first();
    if (!exists) return candidate;
  }
  return `NM${Date.now().toString(36).toUpperCase()}`;
}

async function walletCreate(req, res) {
  try {
    const wallet = String(req.body?.wallet || '').trim().toLowerCase();
    const inviterInput = String(req.body?.inviter || '').trim();
    let refCode = String(req.body?.ref_code || '').trim().toUpperCase();
    if (!/^0x[a-f0-9]{40}$/u.test(wallet)) return res.send(ApiResult.error(400, '钱包地址格式不正确'));
    if (refCode && !/^[A-Z0-9]{4,50}$/u.test(refCode)) return res.send(ApiResult.error(400, '邀请码必须为 4-50 位字母或数字'));
    const settings = parseWalletSettings(req.body);
    const tokens = await AssetToken.getTokens();
    let createdId = 0;

    await DB.transaction(async (config, connection) => {
      const db = DB.query(config, connection);
      const duplicateWallet = await db.table(WALLET_TABLE).whereRaw('LOWER(wallet)=?', [wallet]).first();
      if (duplicateWallet) throw new Error('钱包地址已存在');
      if (!refCode) refCode = await generateRefCode(config, connection);
      const duplicateRefCode = await DB.query(config, connection).table(WALLET_TABLE).where('ref_code', refCode).first();
      if (duplicateRefCode) throw new Error('邀请码已存在');

      let inviter = null;
      if (inviterInput) {
        inviter = await DB.query(config, connection).table(WALLET_TABLE)
          .whereRaw('(LOWER(wallet)=LOWER(?) OR ref_code=?)', [inviterInput, inviterInput])
          .first();
        if (!inviter) throw new Error('邀请钱包或邀请码不存在');
        if (String(inviter.wallet || '').toLowerCase() === wallet) throw new Error('邀请人不能是当前钱包');
      }

      const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
      const result = { insertId: 0 };
      await DB.query(config, connection).table(WALLET_TABLE).insert({
        wallet,
        prices: '0',
        community_prices: '0',
        sub_prices: '0',
        inviter: inviter?.wallet || null,
        ref_code: refCode,
        lv: inviter ? Number(inviter.lv || 0) + 1 : 0,
        level: 0,
        level_isupdate: 0,
        ...settings,
        created_at: now,
        updated_at: now
      }, result);
      createdId = result.insertId;

      if (inviter) {
        const ancestors = await DB.query(config, connection).table('wallet_relation')
          .whereRaw('LOWER(wallet)=LOWER(?)', [inviter.wallet])
          .orderBy('lv', 'asc')
          .get();
        const relationRows = [{
          wallet, wallet_prices: '0', inviter: inviter.wallet, inviter_prices: String(inviter.prices ?? '0'),
          lv: 1, created_at: now, updated_at: now
        }];
        for (const ancestor of ancestors || []) {
          if (!ancestor.inviter) continue;
          relationRows.push({
            wallet, wallet_prices: '0', inviter: ancestor.inviter,
            inviter_prices: String(ancestor.inviter_prices ?? '0'),
            lv: Number(ancestor.lv || 0) + 1, created_at: now, updated_at: now
          });
        }
        await DB.query(config, connection).table('wallet_relation').insert(relationRows);
      }

      if (tokens.length) {
        await DB.query(config, connection).table(WALLET_ASSET_TABLE).insert(tokens.map(token => ({
          wallet,
          token: token.value,
          balance: '0',
          frozen_balance: '0',
          updated_at: now
        })));
      }
    });

    return res.send(ApiResult.success(normalizeWallet(
      await DB.query().table(WALLET_TABLE).where('id', createdId).first()
    ), '钱包创建成功'));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY' || /钱包地址已存在|邀请码已存在|邀请钱包|邀请人|手动等级/u.test(error.message || '')) {
      return res.send(ApiResult.error(400, error.message));
    }
    return res.send(ApiResult.exception(error, 'WalletService.walletCreate'));
  }
}

async function walletList(req, res) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const keyword = String(req.body?.keyword || '').trim();
    const status = req.body?.status;
    const level = req.body?.level;
    const query = DB.query().table(WALLET_TABLE);
    if (keyword) {
      query.where(builder => builder
        .where('wallet', 'like', `%${keyword}%`)
        .orWhere('inviter', 'like', `%${keyword}%`)
        .orWhere('ref_code', 'like', `%${keyword}%`));
    }
    if (status !== '' && status !== null && typeof status !== 'undefined') query.where('status', Number(status));
    if (level !== '' && level !== null && typeof level !== 'undefined') query.where('level', Number(level));
    query.orderBy('id', 'desc');
    const result = await query.paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalizeWallet),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取钱包列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'WalletService.walletList'));
  }
}

async function walletUpdate(req, res) {
  try {
    const id = Helper.parseInt(req.body?.id, 0);
    const row = id ? await DB.query().table(WALLET_TABLE).where('id', id).first() : null;
    if (!row) return res.send(ApiResult.error(404, '钱包不存在'));
    const settings = parseWalletSettings(req.body);
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    await DB.query().table(WALLET_TABLE).where('id', id).update({
      ...settings,
      level_isupdate: 1,
      updated_at: now
    });
    return res.send(ApiResult.success(normalizeWallet(
      await DB.query().table(WALLET_TABLE).where('id', id).first()
    ), '钱包更新成功'));
  } catch (error) {
    if (/手动等级/u.test(error.message || '')) return res.send(ApiResult.error(400, error.message));
    return res.send(ApiResult.exception(error, 'WalletService.walletUpdate'));
  }
}

async function getTokenMap() {
  const tokens = await AssetToken.getTokens();
  return new Map(tokens.map(item => [String(item.value || '').toUpperCase(), item]));
}

function normalizeWalletAsset(row, tokenMap) {
  const token = String(row.token || '').toUpperCase();
  const tokenItem = tokenMap.get(token);
  const decimals = Helper.parseInt(tokenItem?.decimals, AssetToken.DEFAULT_DECIMALS);
  return {
    id: Number(row.id || 0),
    wallet: row.wallet || '',
    token,
    token_type: row.tokne_type || '',
    decimals,
    balance: formatAssetAmount(row.balance || '0', decimals),
    frozen_balance: formatAssetAmount(row.frozen_balance || '0', decimals),
    raw_balance: String(row.balance ?? '0'),
    raw_frozen_balance: String(row.frozen_balance ?? '0'),
    updated_at: row.updated_at || ''
  };
}

async function walletAssetList(req, res) {
  try {
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 20);
    const wallet = String(req.body?.wallet || '').trim();
    const token = String(req.body?.token || '').trim().toUpperCase();
    const query = DB.query().table(WALLET_ASSET_TABLE);
    if (wallet) query.where('wallet', 'like', `%${wallet}%`);
    if (token) query.where('token', token);
    query.orderBy('id', 'desc');
    const [result, tokenMap] = await Promise.all([query.paginate(page, pageSize), getTokenMap()]);
    return res.send(ApiResult.success({
      items: (result.items || []).map(row => normalizeWalletAsset(row, tokenMap)),
      token_options: [...tokenMap.values()].map(item => ({ label: item.label, value: item.value })),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取钱包资产列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'WalletService.walletAssetList'));
  }
}

async function walletAssetChange(req, res) {
  try {
    const wallet = String(req.body?.wallet || '').trim().toLowerCase();
    const token = String(req.body?.token || '').trim().toUpperCase();
    const reason = Helper.safeString(req.body?.reason, 255).trim();
    const assetType = String(req.body?.asset_type || '').trim();
    const changeType = String(req.body?.change_type || '').trim();
    if (!/^0x[a-f0-9]{40}$/u.test(wallet)) return res.send(ApiResult.error(400, '钱包地址格式不正确'));
    if (!token) return res.send(ApiResult.error(400, '请选择资产类型'));
    if (!['balance', 'frozen_balance'].includes(assetType)) return res.send(ApiResult.error(400, '请选择变更的资产类型'));
    if (!['in', 'out'].includes(changeType)) return res.send(ApiResult.error(400, '请选择增加或扣减'));
    if (!reason) return res.send(ApiResult.error(400, '变更原因不能为空'));
    const tokenItem = await AssetToken.getTokenItem(token);
    if (!tokenItem) return res.send(ApiResult.error(404, '资产类型不存在'));
    const decimals = Helper.parseInt(tokenItem?.decimals, AssetToken.DEFAULT_DECIMALS);
    const changeAmount = parseAssetAmount(req.body?.amount, decimals);
    if (BigInt(changeAmount) <= 0n) return res.send(ApiResult.error(400, '变更数量必须大于 0'));
    const prefix = Database.prefix('default') || '';
    const now = Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
    const bizId = `ADMIN-${Date.now()}`;
    let savedId = 0;

    await DB.transaction(async (config, connection) => {
      const walletRows = await DB.query(config, connection).exec(
        `SELECT wallet FROM ${prefix}wallet WHERE LOWER(wallet)=? LIMIT 1 FOR UPDATE`,
        [wallet]
      );
      const walletRow = Array.isArray(walletRows) ? walletRows[0] : null;
      if (!walletRow) throw new Error('钱包不存在');

      await DB.query(config, connection).exec(
        `INSERT IGNORE INTO ${prefix}wallet_assets (wallet, token, balance, frozen_balance, updated_at) VALUES (?, ?, 0, 0, ?)`,
        [walletRow.wallet, token, now]
      );
      const rows = await DB.query(config, connection).exec(
        `SELECT * FROM ${prefix}wallet_assets WHERE LOWER(wallet)=? AND token=? LIMIT 1 FOR UPDATE`,
        [wallet, token]
      );
      const locked = Array.isArray(rows) ? rows[0] : null;
      if (!locked) throw new Error('钱包资产不存在');
      savedId = Number(locked.id || 0);
      const before = BigInt(String(locked[assetType] ?? '0'));
      const amount = BigInt(changeAmount);
      const after = changeType === 'in' ? before + amount : before - amount;
      if (after < 0n) throw new Error(assetType === 'balance' ? '可用余额不足' : '冻结余额不足');

      await DB.query(config, connection).table(WALLET_ASSET_TABLE).where('id', locked.id).update({
        [assetType]: after.toString(),
        updated_at: now
      });
      const logTable = assetType === 'balance' ? 'wallet_assets_logs' : 'wallet_frozen_assets_logs';
      await DB.query(config, connection).table(logTable).insert({
        biz_id: `${bizId}-${assetType}`,
        wallet: locked.wallet,
        token: locked.token,
        balance: amount.toString(),
        before_balance: before.toString(),
        after_balance: after.toString(),
        scene: 'admin_change',
        reason,
        type: changeType,
        created_at: now,
        updated_at: now
      });
    });

    const saved = await DB.query().table(WALLET_ASSET_TABLE).where('id', savedId).first();
    return res.send(ApiResult.success(normalizeWalletAsset(saved, await getTokenMap()), '钱包资产变更成功'));
  } catch (error) {
    if (/资产金额|钱包不存在|钱包资产不存在|余额不足/u.test(error.message || '')) {
      return res.send(ApiResult.error(400, error.message));
    }
    return res.send(ApiResult.exception(error, 'WalletService.walletAssetChange'));
  }
}

export default { walletList, walletCreate, walletUpdate, walletAssetList, walletAssetChange };
