import ApiResult from '../../Util/ApiResult.js';
import AssetToken from '../../Util/AssetToken.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import Helper from '../../Util/Helper.js';
import { ensureWalletImportTaskTable } from '../../Util/WalletImportTaskSchema.js';

const WALLET_TABLE = 'wallet';
const WALLET_ASSET_TABLE = 'wallet_assets';
const TASK_TABLE = 'wallet_import_task';
const MAX_IMPORT_ROWS = 50000;
const INSERT_CHUNK_SIZE = 500;
const RELATION_PROGRESS_STEP = 50;
const runningTasks = new Set();

function nowString() {
  return Helper.dateFormat('YYYY-mm-dd HH:MM:SS', new Date());
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function taskNo() {
  return `WIT${Date.now()}${Helper.randomStr(6).toUpperCase()}`;
}

function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { cell += '"'; index += 1; continue; }
      if (char === '"') { quoted = false; continue; }
      cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(cell.trim()); cell = ''; continue; }
    if (char === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('CSV 引号未闭合');
  row.push(cell.trim());
  if (row.some(item => item !== '')) rows.push(row);
  return rows;
}

function detectCsvDelimiter(text) {
  const firstLine = text.split(/\r?\n/u).find(line => line.trim()) || '';
  return [',', ';', '\t', '|']
    .map(delimiter => ({ delimiter, count: parseCsv(firstLine, delimiter)[0]?.length || 0 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function decodeCsvBuffer(buffer) {
  const encodings = ['utf-8', 'utf-16le', 'gb18030', 'gbk'];
  let bestText = '';
  let bestScore = -1;
  for (const encoding of encodings) {
    try {
      const text = new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/u, '');
      const header = (text.split(/\r?\n/u).find(line => line.trim()) || '').toLowerCase();
      const score = ['钱包', '钱包地址', '地址', 'wallet', '邀请人', '邀请钱包', '上级钱包', 'inviter']
        .reduce((total, key) => total + (header.includes(key.toLowerCase()) ? 1 : 0), 0);
      if (score > bestScore) { bestText = text; bestScore = score; }
    } catch (error) {
      // Some Node builds may not support every legacy encoding.
    }
  }
  return bestText || buffer.toString('utf8').replace(/^\uFEFF/u, '');
}

function findHeaderIndex(headers, aliases) {
  const normalized = headers.map(item => String(item || '').trim().toLowerCase());
  return aliases.map(item => item.toLowerCase()).reduce((found, alias) => (
    found >= 0 ? found : normalized.findIndex(header => header === alias)
  ), -1);
}

function buildImportRows(text) {
  const delimiter = detectCsvDelimiter(text);
  const rows = parseCsv(text, delimiter).filter(row => row.some(cell => cell.trim()));
  if (rows.length < 2) throw new Error('CSV 至少需要表头和一行钱包数据');
  const walletIndex = findHeaderIndex(rows[0], ['钱包', '钱包地址', '地址', 'wallet']);
  const inviterIndex = findHeaderIndex(rows[0], ['邀请人', '邀请钱包', '上级钱包', '邀请人钱包', 'inviter']);
  if (walletIndex < 0 || inviterIndex < 0) throw new Error('CSV 表头需要包含：钱包、邀请人');
  const items = [];
  const seen = new Set();
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const lineNo = index + 1;
    const wallet = normalizeWallet(row[walletIndex]);
    const inviter = String(row[inviterIndex] || '').trim();
    if (!wallet && !inviter) continue;
    if (!/^0x[a-f0-9]{40}$/u.test(wallet)) throw new Error(`第 ${lineNo} 行：钱包地址格式不正确`);
    if (seen.has(wallet)) throw new Error(`第 ${lineNo} 行：CSV 内钱包地址重复`);
    seen.add(wallet);
    if (inviter && !/^0x[a-fA-F0-9]{40}$/u.test(inviter) && !/^[a-zA-Z0-9]{4,50}$/u.test(inviter)) {
      throw new Error(`第 ${lineNo} 行：邀请人必须是钱包地址或邀请码`);
    }
    if (inviter && inviter.toLowerCase() === wallet) throw new Error(`第 ${lineNo} 行：邀请人不能是当前钱包`);
    items.push({ line_no: lineNo, wallet, inviter });
  }
  if (!items.length) throw new Error('CSV 没有可导入的钱包数据');
  if (items.length > MAX_IMPORT_ROWS) throw new Error(`单次最多导入 ${MAX_IMPORT_ROWS} 个钱包`);
  return items;
}

function normalizeTask(row) {
  const failedRows = row?.failed_rows ? (() => { try { return JSON.parse(row.failed_rows); } catch { return []; } })() : [];
  return {
    id: Number(row?.id || 0),
    task_no: row?.task_no || '',
    file_name: row?.file_name || '',
    status: row?.status || 'pending',
    current_step: row?.current_step || '',
    total_count: Number(row?.total_count || 0),
    processed_count: Number(row?.processed_count || 0),
    success_count: Number(row?.success_count || 0),
    failure_count: Number(row?.failure_count || 0),
    failed_rows: failedRows,
    error_message: row?.error_message || '',
    started_at: row?.started_at || '',
    finished_at: row?.finished_at || '',
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || ''
  };
}

async function updateTask(id, values) {
  await DB.query().table(TASK_TABLE).where('id', id).update({ ...values, updated_at: nowString() });
}

async function failTask(id, error, failedRows = []) {
  await updateTask(id, {
    status: 'failed',
    current_step: 'failed',
    error_message: error.message || '导入失败',
    failed_rows: JSON.stringify(failedRows.length ? failedRows : [{ line_no: 0, message: error.message || '导入失败' }]),
    failure_count: failedRows.length || 1,
    finished_at: nowString()
  });
}

async function findExistingWallets(wallets) {
  const prefix = Database.prefix('default') || '';
  const found = new Set();
  for (const chunk of chunkArray(wallets, INSERT_CHUNK_SIZE)) {
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await DB.query().exec(
      `SELECT LOWER(wallet) AS wallet FROM ${prefix}${WALLET_TABLE} WHERE LOWER(wallet) IN (${placeholders})`,
      chunk
    );
    for (const row of rows || []) found.add(String(row.wallet || '').toLowerCase());
  }
  return found;
}

async function findInviters(items, importedWallets) {
  const prefix = Database.prefix('default') || '';
  const walletInputs = new Set();
  const codeInputs = new Set();
  for (const item of items) {
    if (!item.inviter) continue;
    const inviterInput = item.inviter.trim();
    const inviterWallet = inviterInput.toLowerCase();
    if (importedWallets.has(inviterWallet)) continue;
    if (/^0x[a-fA-F0-9]{40}$/u.test(inviterInput)) walletInputs.add(inviterWallet);
    codeInputs.add(inviterInput.toUpperCase());
  }

  const walletMap = new Map();
  for (const chunk of chunkArray([...walletInputs], INSERT_CHUNK_SIZE)) {
    if (!chunk.length) continue;
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await DB.query().exec(
      `SELECT * FROM ${prefix}${WALLET_TABLE} WHERE LOWER(wallet) IN (${placeholders})`,
      chunk
    );
    for (const row of rows || []) walletMap.set(String(row.wallet || '').toLowerCase(), row);
  }

  const codeMap = new Map();
  for (const chunk of chunkArray([...codeInputs], INSERT_CHUNK_SIZE)) {
    if (!chunk.length) continue;
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await DB.query().exec(
      `SELECT * FROM ${prefix}${WALLET_TABLE} WHERE ref_code IN (${placeholders})`,
      chunk
    );
    for (const row of rows || []) codeMap.set(String(row.ref_code || '').toUpperCase(), row);
  }

  return { walletMap, codeMap };
}

function resolveImportOrder(items, inviterByWallet) {
  const itemMap = new Map(items.map(item => [item.wallet, item]));
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(item) {
    if (visited.has(item.wallet)) return;
    if (visiting.has(item.wallet)) throw new Error(`第 ${item.line_no} 行：CSV 内邀请关系存在循环`);
    visiting.add(item.wallet);
    const inviterWallet = inviterByWallet.get(item.wallet);
    if (inviterWallet && itemMap.has(inviterWallet)) visit(itemMap.get(inviterWallet));
    visiting.delete(item.wallet);
    visited.add(item.wallet);
    ordered.push(item);
  }

  for (const item of items) visit(item);
  return ordered;
}

async function generateRefCodes(count) {
  const codes = new Set();
  while (codes.size < count) codes.add(Helper.randomStr(10).toUpperCase());
  return [...codes];
}

async function insertRelationRows(config, connection, rows) {
  for (const chunk of chunkArray(rows, 1000)) {
    await DB.query(config, connection).table('wallet_relation').insert(chunk);
  }
}

async function insertMissingWalletAssets(config, connection, wallets, tokens, updatedAt) {
  if (!wallets.length || !tokens.length) return;
  const prefix = Database.prefix(config) || '';
  const normalizedWallets = wallets.map(wallet => String(wallet || '').toLowerCase());
  const normalizedTokens = tokens.map(token => String(token.value || '').toUpperCase());
  const existing = new Set();

  for (const walletChunk of chunkArray(normalizedWallets, 300)) {
    const walletPlaceholders = walletChunk.map(() => '?').join(',');
    const tokenPlaceholders = normalizedTokens.map(() => '?').join(',');
    const rows = await DB.query(config, connection).exec(
      `SELECT LOWER(wallet) AS wallet, UPPER(token) AS token
       FROM ${prefix}${WALLET_ASSET_TABLE}
       WHERE LOWER(wallet) IN (${walletPlaceholders}) AND UPPER(token) IN (${tokenPlaceholders})`,
      [...walletChunk, ...normalizedTokens]
    );
    for (const row of rows || []) existing.add(`${row.wallet}|${row.token}`);
  }

  const assetRows = [];
  for (const wallet of normalizedWallets) {
    for (const token of normalizedTokens) {
      if (existing.has(`${wallet}|${token}`)) continue;
      existing.add(`${wallet}|${token}`);
      assetRows.push({
        wallet,
        token,
        balance: '0',
        frozen_balance: '0',
        updated_at: updatedAt
      });
    }
  }

  for (const assetChunk of chunkArray(assetRows, 1000)) {
    await DB.query(config, connection).table(WALLET_ASSET_TABLE).insert(assetChunk);
  }
}

async function processTask(id) {
  if (runningTasks.has(id)) return;
  runningTasks.add(id);
  try {
    await ensureWalletImportTaskTable();
    const task = await DB.query().table(TASK_TABLE).where('id', id).first();
    if (!task || !['pending', 'running'].includes(task.status)) return;
    await updateTask(id, { status: 'running', current_step: 'validating', started_at: task.started_at || nowString(), error_message: null });

    const items = JSON.parse(task.items_json || '[]');
    const wallets = items.map(item => item.wallet);
    const itemMap = new Map(items.map(item => [item.wallet, item]));
    let importedWallets = new Set(wallets);

    const existingWallets = await findExistingWallets(wallets);
    const newItems = items.filter(item => !existingWallets.has(item.wallet));
    const skippedCount = items.length - newItems.length;
    importedWallets = new Set(newItems.map(item => item.wallet));
    for (const wallet of []) {
      const item = itemMap.get(wallet);
      throw new Error(`第 ${item?.line_no || 0} 行：钱包地址已存在`);
    }

    const { walletMap, codeMap } = await findInviters(items, importedWallets);
    const inviterByWallet = new Map();
    const externalInviterRows = new Map();
    for (const item of newItems) {
      if (!item.inviter) continue;
      const input = item.inviter.trim();
      const inputWallet = input.toLowerCase();
      if (importedWallets.has(inputWallet)) {
        inviterByWallet.set(item.wallet, inputWallet);
        continue;
      }
      const inviter = walletMap.get(inputWallet) || codeMap.get(input.toUpperCase());
      if (!inviter) throw new Error(`第 ${item.line_no} 行：邀请钱包或邀请码不存在`);
      inviterByWallet.set(item.wallet, String(inviter.wallet || '').toLowerCase());
      externalInviterRows.set(item.wallet, inviter);
    }

    const orderedItems = resolveImportOrder(newItems, inviterByWallet);
    const refCodes = await generateRefCodes(newItems.length);
    const refCodeMap = new Map(newItems.map((item, index) => [item.wallet, refCodes[index]]));
    const settings = {
      status: 1,
      withdraw_enabled: 1,
      usdt_withdraw_enabled: 1,
      is_manual_level: 0,
      manual_level: 0,
      remark_system: '',
      remark_name: '',
      remark_community: ''
    };
    const tokens = await AssetToken.getTokens();

    await updateTask(id, { current_step: 'creating_wallets' });
    for (const chunk of chunkArray(newItems, INSERT_CHUNK_SIZE)) {
      await DB.transaction(async (config, connection) => {
        const current = nowString();
        await DB.query(config, connection).table(WALLET_TABLE).insert(chunk.map(item => ({
          wallet: item.wallet,
          invests: '0',
          community_invests: '0',
          community_users: 0,
          inviter: null,
          ref_code: refCodeMap.get(item.wallet),
          lv: 0,
          level: 0,
          level_isupdate: 0,
          ...settings,
          created_at: current,
          updated_at: current
        })));
        await insertMissingWalletAssets(config, connection, chunk.map(item => item.wallet), tokens, current);
      });
    }

    await updateTask(id, { current_step: 'building_relations' });
    let processed = skippedCount;
    for (const item of orderedItems) {
      const inviterWallet = inviterByWallet.get(item.wallet);
      if (!inviterWallet) {
        processed += 1;
        if (processed % RELATION_PROGRESS_STEP === 0) await updateTask(id, { processed_count: processed, success_count: processed - skippedCount });
        continue;
      }

      await DB.transaction(async (config, connection) => {
        const current = nowString();
        const inviter = externalInviterRows.get(item.wallet) || await DB.query(config, connection).table(WALLET_TABLE)
          .whereRaw('LOWER(wallet)=?', [inviterWallet])
          .first();
        if (!inviter) throw new Error(`第 ${item.line_no} 行：邀请钱包不存在`);
        await DB.query(config, connection).table(WALLET_TABLE).whereRaw('LOWER(wallet)=?', [item.wallet]).update({
          inviter: inviter.wallet,
          lv: Number(inviter.lv || 0) + 1,
          updated_at: current
        });
        const ancestors = await DB.query(config, connection).table('wallet_relation')
          .whereRaw('LOWER(wallet)=LOWER(?)', [inviter.wallet])
          .orderBy('lv', 'asc')
          .get();
        const relationRows = [{
          wallet: item.wallet,
          wallet_invests: '0',
          inviter: inviter.wallet,
          inviter_invests: String(inviter.invests ?? '0'),
          lv: 1,
          created_at: current,
          updated_at: current
        }];
        for (const ancestor of ancestors || []) {
          if (!ancestor.inviter) continue;
          relationRows.push({
            wallet: item.wallet,
            wallet_invests: '0',
            inviter: ancestor.inviter,
            inviter_invests: String(ancestor.inviter_invests ?? '0'),
            lv: Number(ancestor.lv || 0) + 1,
            created_at: current,
            updated_at: current
          });
        }
        await insertRelationRows(config, connection, relationRows);
      });
      processed += 1;
      if (processed % RELATION_PROGRESS_STEP === 0) await updateTask(id, { processed_count: processed, success_count: processed - skippedCount });
    }

    await updateTask(id, {
      status: 'success',
      current_step: 'finished',
      processed_count: items.length,
      success_count: newItems.length,
      failure_count: 0,
      failed_rows: null,
      error_message: null,
      finished_at: nowString()
    });
  } catch (error) {
    await failTask(id, error);
  } finally {
    runningTasks.delete(id);
  }
}

function startTask(id) {
  setTimeout(() => { processTask(Number(id)).catch(error => console.error('[WalletImportTaskService.processTask]', error)); }, 20);
}

async function create(req, res) {
  try {
    await ensureWalletImportTaskTable();
    const file = req.file;
    if (!file?.buffer?.length) return res.send(ApiResult.error(400, '请选择 CSV 文件'));
    const text = decodeCsvBuffer(file.buffer);
    const items = buildImportRows(text);
    const current = nowString();
    const result = { insertId: 0 };
    await DB.query().table(TASK_TABLE).insert({
      task_no: taskNo(),
      file_name: Helper.safeString(file.originalname || 'wallet-import.csv', 255),
      status: 'pending',
      current_step: 'pending',
      total_count: items.length,
      processed_count: 0,
      success_count: 0,
      failure_count: 0,
      items_json: JSON.stringify(items),
      failed_rows: null,
      error_message: null,
      started_at: null,
      finished_at: null,
      created_at: current,
      updated_at: current
    }, result);
    startTask(result.insertId);
    const task = await DB.query().table(TASK_TABLE).where('id', result.insertId).first();
    return res.send(ApiResult.success(normalizeTask(task), '导入任务已创建'));
  } catch (error) {
    if (/CSV|第 \d+ 行|钱包|邀请|单次最多|请选择/u.test(error.message || '')) {
      return res.send(ApiResult.error(400, error.message));
    }
    return res.send(ApiResult.exception(error, 'WalletImportTaskService.create'));
  }
}

async function detail(req, res) {
  try {
    await ensureWalletImportTaskTable();
    const id = Helper.parseInt(req.body?.id, 0);
    if (!id) return res.send(ApiResult.error(400, '任务 ID 不能为空'));
    const task = await DB.query().table(TASK_TABLE).where('id', id).first();
    if (!task) return res.send(ApiResult.error(404, '导入任务不存在'));
    if (['pending', 'running'].includes(task.status) && !runningTasks.has(id)) startTask(id);
    return res.send(ApiResult.success(normalizeTask(task), '获取导入任务成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'WalletImportTaskService.detail'));
  }
}

async function list(req, res) {
  try {
    await ensureWalletImportTaskTable();
    const page = Helper.parseInt(req.body?.page, 1);
    const pageSize = Helper.parseInt(req.body?.page_size, 10);
    const result = await DB.query().table(TASK_TABLE).orderBy('id', 'desc').paginate(page, pageSize);
    return res.send(ApiResult.success({
      items: (result.items || []).map(normalizeTask),
      total: result.total,
      page: result.currentPage,
      page_size: result.perPage,
      last_page: result.lastPage
    }, '获取导入任务列表成功'));
  } catch (error) {
    return res.send(ApiResult.exception(error, 'WalletImportTaskService.list'));
  }
}

export default { create, detail, list };
