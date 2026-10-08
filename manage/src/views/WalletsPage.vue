<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post, postForm } from '../lib/http.js';
import { can } from '../lib/permissions.js';
import { formatFixedAmount } from '../lib/amount.js';

const user = getUser();
const query = reactive({ keyword: '', search_team: 0, status: '', level: '', page: 1, page_size: 20 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const importModal = ref(false);
const importFileInput = ref(null);
const importFile = ref(null);
const importFileName = ref('');
const importRows = ref([]);
const importError = ref('');
const importing = ref(false);
const currentImportTask = ref(null);
let importTaskTimer = null;
const MAX_IMPORT_ROWS = 50000;
const IMPORT_HEADERS = ['钱包', '邀请人'];
const WALLET_HEADER_ALIASES = ['钱包', '钱包地址', '地址', 'wallet'];
const INVITER_HEADER_ALIASES = ['邀请人', '邀请钱包', '上级钱包', '邀请人钱包', 'inviter'];
const defaultForm = () => ({
  id: 0, wallet: '', inviter: '', ref_code: '', status: 1,
  withdraw_enabled: 1, usdt_withdraw_enabled: 1,
  is_manual_level: 0, manual_level: 0,
  remark_system: '', remark_name: '', remark_community: ''
});
const form = reactive(defaultForm());

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/wallet/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function openCreate() { Object.assign(form, defaultForm()); modalError.value = ''; modal.value = true; }
function edit(row) {
  Object.assign(form, {
    ...defaultForm(),
    id: row.id, wallet: row.wallet, inviter: row.inviter, ref_code: row.ref_code, status: row.status,
    withdraw_enabled: row.withdraw_enabled, usdt_withdraw_enabled: row.usdt_withdraw_enabled,
    is_manual_level: row.is_manual_level, manual_level: row.manual_level,
    remark_system: row.remark_system, remark_name: row.remark_name, remark_community: row.remark_community
  });
  modalError.value = ''; modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.id && !/^0x[a-fA-F0-9]{40}$/u.test(form.wallet)) { modalError.value = '请输入正确的钱包地址'; return; }
  if (!form.id && form.ref_code && !/^[a-zA-Z0-9]{4,50}$/u.test(form.ref_code)) { modalError.value = '邀请码必须为 4-50 位字母或数字'; return; }
  saving.value = true; modalError.value = '';
  try {
    await post(form.id ? '/wallet/update' : '/wallet/create', form);
    modal.value = false; success.value = form.id ? '钱包配置已更新' : '钱包已创建并初始化资产'; await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
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

async function readImportFile(file) {
  if (!file) throw new Error('请选择 CSV 文件');
  if (file.size > 20 * 1024 * 1024) throw new Error('CSV 文件不能超过 20MB');
  const buffer = await file.arrayBuffer();
  const encodings = ['utf-8', 'utf-16le', 'gb18030', 'gbk'];
  let bestText = '';
  let bestScore = -1;
  for (const encoding of encodings) {
    try {
      const text = new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/u, '');
      const header = (text.split(/\r?\n/u).find(line => line.trim()) || '').toLowerCase();
      const score = [...WALLET_HEADER_ALIASES, ...INVITER_HEADER_ALIASES]
        .reduce((total, key) => total + (header.includes(key.toLowerCase()) ? 1 : 0), 0);
      if (score > bestScore) { bestText = text; bestScore = score; }
    } catch (err) {
      // Browser TextDecoder may not support every legacy encoding.
    }
  }
  return bestText;
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
  const headers = rows[0];
  const walletIndex = findHeaderIndex(headers, WALLET_HEADER_ALIASES);
  const inviterIndex = findHeaderIndex(headers, INVITER_HEADER_ALIASES);
  if (walletIndex < 0 || inviterIndex < 0) throw new Error('CSV 表头需要包含：钱包、邀请人');
  const seen = new Set();
  return rows.slice(1).map((row, index) => {
    const lineNo = index + 2;
    const wallet = String(row[walletIndex] || '').trim().toLowerCase();
    const inviter = String(row[inviterIndex] || '').trim();
    if (!wallet && !inviter) return null;
    if (!/^0x[a-f0-9]{40}$/u.test(wallet)) throw new Error(`第 ${lineNo} 行：钱包地址格式不正确`);
    if (inviter && !/^0x[a-fA-F0-9]{40}$/u.test(inviter) && !/^[a-zA-Z0-9]{4,50}$/u.test(inviter)) {
      throw new Error(`第 ${lineNo} 行：邀请人必须是钱包地址或邀请码`);
    }
    if (inviter && inviter.toLowerCase() === wallet) throw new Error(`第 ${lineNo} 行：邀请人不能是当前钱包`);
    if (seen.has(wallet)) throw new Error(`第 ${lineNo} 行：CSV 内钱包地址重复`);
    seen.add(wallet);
    return { line_no: lineNo, wallet, inviter };
  }).filter(Boolean);
}

function openImport() {
  importModal.value = true;
  importFile.value = null;
  importFileName.value = '';
  importRows.value = [];
  importError.value = '';
  currentImportTask.value = null;
  if (importFileInput.value) importFileInput.value.value = '';
}

function closeImport() {
  if (importing.value) return;
  importModal.value = false;
}

function clearImportTaskTimer() {
  if (importTaskTimer) {
    clearInterval(importTaskTimer);
    importTaskTimer = null;
  }
}

function importProgress(task = currentImportTask.value) {
  if (!task?.total_count) return 0;
  return Math.min(100, Math.round((Number(task.processed_count || 0) / Number(task.total_count || 1)) * 100));
}

function importStatusText(status) {
  return ({ pending: '等待中', running: '导入中', success: '已完成', failed: '失败' })[status] || status || '-';
}

function downloadImportTemplate() {
  const csv = `${IMPORT_HEADERS.join(',')}\n0x0000000000000000000000000000000000000000,\n0x1111111111111111111111111111111111111111,0x0000000000000000000000000000000000000000\n`;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'wallet-import-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function handleImportFileChange(event) {
  importError.value = '';
  importRows.value = [];
  const file = event.target.files?.[0];
  try {
    importFile.value = file || null;
    importFileName.value = file?.name || '';
    currentImportTask.value = null;
    const text = await readImportFile(file);
    const rows = buildImportRows(text);
    if (!rows.length) throw new Error('CSV 没有可导入的钱包数据');
    if (rows.length > MAX_IMPORT_ROWS) throw new Error(`单次最多导入 ${MAX_IMPORT_ROWS} 个钱包`);
    importRows.value = rows;
  } catch (err) {
    importError.value = err.message || 'CSV 解析失败';
  }
}

async function submitImport() {
  if (importing.value || !importRows.value.length || !importFile.value) return;
  importing.value = true;
  importError.value = '';
  try {
    const formData = new FormData();
    formData.append('file', importFile.value);
    const task = await postForm('/wallet/import', formData);
    currentImportTask.value = task;
    success.value = `导入任务已创建：${task.task_no}`;
    pollImportTask(task.id);
  } catch (err) {
    importError.value = err.message;
  } finally {
    importing.value = false;
  }
}

function pollImportTask(id) {
  clearImportTaskTimer();
  importTaskTimer = setInterval(async () => {
    try {
      const task = await post('/wallet/import-task/detail', { id });
      currentImportTask.value = task;
      if (task.status === 'success') {
        clearImportTaskTimer();
        success.value = `成功导入 ${task.success_count} 个钱包`;
        await load();
      }
      if (task.status === 'failed') {
        clearImportTaskTimer();
        importError.value = task.error_message || '导入任务失败';
      }
    } catch (err) {
      clearImportTaskTimer();
      importError.value = err.message;
    }
  }, 2000);
}

onMounted(load);
onUnmounted(clearImportTaskTimer);
</script>

<template>
  <ManageLayout title="钱包管理" description="查看钱包关系、等级与状态，并控制提现和人工等级。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" :placeholder="query.search_team ? '上级钱包地址（搜索全部团队）' : '钱包地址、邀请人或邀请码'" @keyup.enter="search" />
        <label class="inline-check"><input v-model.number="query.search_team" type="checkbox" :true-value="1" :false-value="0" /><span>搜索团队</span></label>
        <select v-model="query.level" class="text-input text-input--inline"><option value="">全部等级</option><option v-for="level in [0, 1, 2, 3]" :key="level" :value="level">等级 {{ level }}</option></select>
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><div class="toolbar-actions">
        <button v-if="can(user, 'wallets-import') || can(user, 'wallets-create')" class="ghost-button" @click="openImport">CSV 导入</button>
        <button v-if="can(user, 'wallets-create')" class="primary-button" @click="openCreate">新增钱包</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1750px">
        <thead><tr><th>ID</th><th>钱包地址</th><th>邀请人</th><th>邀请码</th><th>投资</th><th>社区投资</th><th>社区用户数</th><th>层级</th><th>等级</th><th>等级模式</th><th>提现</th><th>USDT提现</th><th>状态</th><th>系统备注</th><th>名称备注</th><th>社区备注</th><th>创建时间</th><th v-if="can(user, 'wallets-update')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'wallets-update') ? 18 : 17" class="empty-cell">{{ loading ? '正在加载...' : '暂无钱包' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td class="mono-cell">{{ row.inviter || '-' }}</td><td>{{ row.ref_code || '-' }}</td><td>{{ formatFixedAmount(row.invests) }}</td><td>{{ formatFixedAmount(row.community_invests) }}</td><td>{{ row.community_users }}</td><td>{{ row.lv }}</td><td>{{ row.level }}</td><td>{{ row.is_manual_level === 1 ? `手动 ${row.manual_level}` : '自动' }}</td><td>{{ row.withdraw_enabled === 1 ? '允许' : '禁止' }}</td><td>{{ row.usdt_withdraw_enabled === 1 ? '允许' : '禁止' }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.remark_system || '-' }}</td><td>{{ row.remark_name || '-' }}</td><td>{{ row.remark_community || '-' }}</td><td>{{ row.created_at || '-' }}</td><td v-if="can(user, 'wallets-update')"><button class="table-button" @click="edit(row)">编辑</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="importModal" class="modal-mask" @click="closeImport"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>CSV 导入钱包</h2><button class="ghost-button" :disabled="importing" @click="closeImport">关闭</button></div>
      <div v-if="importError" class="alert-box alert-box--error">{{ importError }}</div>
      <div class="import-actions">
        <button class="ghost-button" type="button" @click="downloadImportTemplate">下载 CSV 模板</button>
        <label class="file-button">
          <input ref="importFileInput" type="file" accept=".csv,text/csv" @change="handleImportFileChange" />
          <span>选择 CSV 文件</span>
        </label>
      </div>
      <div class="import-hint">表头只需要“钱包、邀请人”。邀请人可填写钱包地址或邀请码；CSV 顺序不限，系统会自动整理邀请关系。大文件会创建后台任务分批执行。</div>
      <div v-if="importFileName" class="import-summary">
        <span>{{ importFileName }}</span>
        <strong>{{ importRows.length }} 条可导入</strong>
      </div>
      <div v-if="currentImportTask" class="import-task">
        <div class="import-task__head">
          <span>{{ currentImportTask.task_no }}</span>
          <strong>{{ importStatusText(currentImportTask.status) }}</strong>
        </div>
        <div class="import-progress"><span :style="{ width: `${importProgress(currentImportTask)}%` }"></span></div>
        <div class="import-task__meta">
          <span>阶段：{{ currentImportTask.current_step || '-' }}</span>
          <span>{{ currentImportTask.processed_count }} / {{ currentImportTask.total_count }}</span>
          <span>成功 {{ currentImportTask.success_count }}</span>
          <span>失败 {{ currentImportTask.failure_count }}</span>
        </div>
        <div v-if="currentImportTask.error_message" class="alert-box alert-box--error">{{ currentImportTask.error_message }}</div>
        <div v-if="currentImportTask.failed_rows?.length" class="import-failures">
          <div v-for="row in currentImportTask.failed_rows.slice(0, 5)" :key="`${row.line_no}-${row.message}`">第 {{ row.line_no }} 行：{{ row.message }}</div>
        </div>
      </div>
      <div v-if="importRows.length" class="table-wrap import-preview">
        <table class="data-table">
          <thead><tr><th>行号</th><th>钱包</th><th>邀请人</th></tr></thead>
          <tbody>
            <tr v-for="row in importRows.slice(0, 10)" :key="row.line_no">
              <td>{{ row.line_no }}</td>
              <td class="mono-cell">{{ row.wallet }}</td>
              <td class="mono-cell">{{ row.inviter || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="importRows.length > 10" class="muted-text">仅预览前 10 条，提交时会导入全部 {{ importRows.length }} 条。</p>
      </div>
      <button class="submit-button" :disabled="importing || !importRows.length || currentImportTask?.status === 'running' || currentImportTask?.status === 'pending'" @click="submitImport">{{ importing ? '创建中...' : '创建导入任务' }}</button>
    </section></div>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑钱包' : '新增钱包' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>钱包地址</span><code v-if="form.id" class="wallet-address">{{ form.wallet }}</code><input v-else v-model.trim="form.wallet" class="text-input" maxlength="42" placeholder="0x..." /></label>
      <div class="wallet-form-grid">
        <label class="field-block"><span>邀请钱包或邀请码（选填）</span><input v-model.trim="form.inviter" class="text-input" maxlength="100" :placeholder="form.id ? '留空则设为根钱包' : '留空则创建根钱包'" /><small v-if="form.id" class="muted-text">修改后，该钱包及其全部下级会同步迁移到新的邀请关系中。</small></label>
        <label v-if="!form.id" class="field-block"><span>邀请码（选填）</span><input v-model.trim="form.ref_code" class="text-input" maxlength="50" placeholder="留空则自动生成" /></label>
        <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
        <label class="field-block"><span>提现权限</span><select v-model.number="form.withdraw_enabled" class="text-input"><option :value="1">允许</option><option :value="0">禁止</option></select></label>
        <label class="field-block"><span>USDT 提现权限</span><select v-model.number="form.usdt_withdraw_enabled" class="text-input"><option :value="1">允许</option><option :value="0">禁止</option></select></label>
        <label class="field-block"><span>等级模式</span><select v-model.number="form.is_manual_level" class="text-input"><option :value="0">自动等级</option><option :value="1">手动等级</option></select></label>
        <label v-if="form.is_manual_level === 1" class="field-block"><span>手动等级</span><select v-model.number="form.manual_level" class="text-input"><option v-for="level in [0, 1, 2, 3]" :key="level" :value="level">等级 {{ level }}</option></select></label>
        <label class="field-block wallet-form-grid__wide"><span>系统备注</span><input v-model.trim="form.remark_system" class="text-input" maxlength="255" /></label>
        <label class="field-block wallet-form-grid__wide"><span>名称备注</span><input v-model.trim="form.remark_name" class="text-input" maxlength="255" /></label>
        <label class="field-block wallet-form-grid__wide"><span>社区备注</span><input v-model.trim="form.remark_community" class="text-input" maxlength="255" /></label>
      </div>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : (form.id ? '保存' : '创建钱包') }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.wallet-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.wallet-form-grid__wide { grid-column: 1 / -1; }
.wallet-address { word-break: break-all; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.inline-check { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.inline-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
.import-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.file-button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; padding: 0 18px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), #7d22ce); color: #fff; font-weight: 700; cursor: pointer; }
.file-button input { display: none; }
.import-hint { margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(147, 92, 246, 0.08); color: var(--muted); line-height: 1.7; }
.import-summary { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 12px; word-break: break-all; }
.import-summary strong { color: var(--primary); white-space: nowrap; }
.import-task { margin-top: 14px; padding: 14px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 12px; background: #000; }
.import-task__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 700; word-break: break-all; }
.import-task__head strong { color: var(--primary); white-space: nowrap; }
.import-progress { height: 8px; margin-top: 12px; border-radius: 99px; overflow: hidden; background: rgba(147, 92, 246, 0.12); }
.import-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(135deg, var(--primary), #7d22ce); transition: width 0.25s ease; }
.import-task__meta { margin-top: 10px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; color: var(--muted); font-size: 13px; }
.import-failures { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(239, 68, 68, 0.08); color: #b91c1c; line-height: 1.6; }
.import-preview { margin-top: 14px; max-height: 320px; overflow: auto; }
@media (max-width: 640px) { .wallet-form-grid { grid-template-columns: 1fr; } .wallet-form-grid__wide { grid-column: auto; } }
</style>
