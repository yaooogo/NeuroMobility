<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ wallet: '', status: '', page: 1, page_size: 20 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const defaultForm = () => ({
  id: 0,
  wallet: '',
  status: 1,
  min_percent: 0,
  max_percent: 100,
  dividend_multiple: 1,
  dividend_min_percent: 0,
  dividend_max_percent: 100,
  guaranteed_percent: 0,
  remark: ''
});
const form = reactive(defaultForm());

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/team-investment-config/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', status: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
function openCreate() { Object.assign(form, defaultForm()); modalError.value = ''; modal.value = true; }
function edit(row) { Object.assign(form, { ...defaultForm(), ...row }); modalError.value = ''; modal.value = true; }

function validate() {
  if (!/^0x[a-fA-F0-9]{40}$/u.test(form.wallet)) return '请输入正确的钱包地址';
  const minPercent = Number(form.min_percent);
  const maxPercent = Number(form.max_percent);
  const dividendMultiple = Number(form.dividend_multiple);
  const dividendMinPercent = Number(form.dividend_min_percent);
  const dividendMaxPercent = Number(form.dividend_max_percent);
  const guaranteedPercent = Number(form.guaranteed_percent);
  if (!Number.isFinite(minPercent) || !Number.isFinite(maxPercent) || minPercent < 0 || minPercent > 100 || maxPercent < 0 || maxPercent > 100) return '分红百分比必须在 0% 到 100% 之间';
  if (minPercent > maxPercent) return '分红百分比起始值不能大于结束值';
  if (!Number.isFinite(dividendMultiple) || dividendMultiple <= 0) return '分红规则倍数必须大于 0';
  if (!Number.isFinite(dividendMinPercent) || !Number.isFinite(dividendMaxPercent) || dividendMinPercent < 0 || dividendMinPercent > 100 || dividendMaxPercent < 0 || dividendMaxPercent > 100) return '分红规则百分比必须在 0% 到 100% 之间';
  if (dividendMinPercent > dividendMaxPercent) return '分红规则起始值不能大于结束值';
  if (!Number.isFinite(guaranteedPercent) || guaranteedPercent < 0 || guaranteedPercent > 100) return '保底分红必须在 0% 到 100% 之间';
  return '';
}

async function save() {
  if (saving.value) return;
  const message = validate();
  if (message) { modalError.value = message; return; }
  saving.value = true; modalError.value = '';
  try {
    await post('/team-investment-config/save', form);
    modal.value = false; success.value = '团队分红配置已保存'; await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确认删除 ${row.wallet} 的团队分红配置？`)) return;
  try { await post('/team-investment-config/delete', { id: row.id }); success.value = '团队分红配置已删除'; await load(); }
  catch (err) { error.value = err.message; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="团队分红配置" description="按上级邀请人钱包配置团队投资分红规则；未配置或禁用时使用系统默认。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="上级钱包地址" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" type="button" @click="search">查询</button>
        <button class="table-button" type="button" @click="reset">重置</button>
      </div><button v-if="can(user, 'team-investment-config-update')" class="primary-button" type="button" @click="openCreate">新增配置</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1180px">
        <thead><tr><th>ID</th><th>上级钱包</th><th>状态</th><th>分红百分比</th><th>分红规则</th><th>保底分红</th><th>备注</th><th>更新时间</th><th v-if="can(user, 'team-investment-config-update')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'team-investment-config-update') ? 9 : 8" class="empty-cell">{{ loading ? '正在加载...' : '暂无配置' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.wallet }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.min_percent }}% ~ {{ row.max_percent }}%</td><td>达到 {{ row.dividend_multiple }} 倍后 {{ row.dividend_min_percent }}% ~ {{ row.dividend_max_percent }}%</td><td>{{ row.guaranteed_percent }}%</td><td>{{ row.remark || '-' }}</td><td>{{ row.updated_at || '-' }}</td><td v-if="can(user, 'team-investment-config-update')" class="actions-cell"><button class="table-button" type="button" @click="edit(row)">编辑</button><button class="table-button" type="button" @click="remove(row)">删除</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑团队分红配置' : '新增团队分红配置' }}</h2><button class="ghost-button" :disabled="saving" type="button" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <div class="team-config-form">
        <label class="team-config-field"><span>上级钱包地址</span><input v-model.trim="form.wallet" class="text-input" maxlength="42" placeholder="0x..." /></label>
        <label class="team-config-field"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
        <label class="team-config-field"><span>分红百分比</span><div class="range-inputs"><div class="input-with-unit"><input v-model.number="form.min_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><em>%</em></div><span class="range-separator">~</span><div class="input-with-unit"><input v-model.number="form.max_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><em>%</em></div></div></label>
        <div class="team-config-field team-config-field--dividend"><span>分红规则</span><div class="dividend-config"><div class="dividend-threshold"><span>当分红达到</span><div class="input-with-unit"><input v-model.number="form.dividend_multiple" class="text-input" type="number" min="0.01" step="0.01" /><em>倍</em></div></div><span class="dividend-percent-label">，分红百分比</span><div class="range-inputs"><div class="input-with-unit"><input v-model.number="form.dividend_min_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><em>%</em></div><span class="range-separator">~</span><div class="input-with-unit"><input v-model.number="form.dividend_max_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><em>%</em></div></div></div></div>
        <label class="team-config-field"><span>保底分红</span><div class="input-with-unit"><input v-model.number="form.guaranteed_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><em>%</em></div></label>
        <label class="team-config-field"><span>备注</span><input v-model.trim="form.remark" class="text-input" maxlength="255" /></label>
      </div>
      <button class="submit-button" :disabled="saving" type="button" @click="save">{{ saving ? '保存中...' : '保存配置' }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.team-config-form { display: grid; gap: 20px; }
.team-config-field { display: grid; grid-template-columns: 140px minmax(0, 1fr); align-items: center; gap: 18px; }
.team-config-field > span { font-weight: 600; }
.input-with-unit { display: flex; align-items: center; min-height: 42px; }
.input-with-unit .text-input { flex: 1; min-width: 0; }
.input-with-unit em { min-width: 42px; color: var(--muted); font-style: normal; text-align: center; }
.range-inputs { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.range-separator { color: var(--muted); }
.dividend-config { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.dividend-threshold { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.dividend-threshold .input-with-unit { flex: 1; }
.dividend-percent-label { white-space: nowrap; }
.dividend-config > .range-inputs { flex: 1 1 240px; }
@media (max-width: 640px) {
  .team-config-field { grid-template-columns: 1fr; gap: 8px; }
  .dividend-config { align-items: stretch; flex-direction: column; }
  .dividend-config > .range-inputs { flex-basis: auto; }
  .dividend-percent-label { margin-left: -4px; }
}
</style>
