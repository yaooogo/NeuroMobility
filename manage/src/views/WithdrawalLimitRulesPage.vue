<script setup>
import { computed, reactive, ref, watch } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { can } from '../lib/permissions.js';
import { post } from '../lib/http.js';

const props = defineProps({ kind: { type: String, required: true } });
const user = getUser();
const isTeam = computed(() => props.kind === 'team');
const permission = computed(() => `${props.kind}-withdraw-limit-rules`);
const title = computed(() => isTeam.value ? '团队提现限额' : '等级提现限额');
const endpoint = computed(() => `/withdraw-limit/${props.kind}`);
const query = reactive({ wallet: '', enabled: '', page: 1, page_size: 20 });
const items = ref([]); const tokens = ref([]); const levels = ref([]);
const selectedToken = ref(''); const total = ref(0); const lastPage = ref(1);
const loading = ref(false); const loaded = ref(false); const saving = ref(false);
const error = ref(''); const success = ref(''); const modalError = ref(''); const modal = ref(false);
const form = reactive({ id: 0, wallet: '', rules: [] });
const visibleLevels = computed(() => levels.value.filter(row => row.token === selectedToken.value));
const canSaveTeam = computed(() => can(user, `${permission.value}-${form.id ? 'update' : 'create'}`));

async function load() {
  const kind = props.kind;
  loading.value = true; loaded.value = false; error.value = '';
  try {
    const data = await post(`${endpoint.value}/list`, { ...query });
    if (kind !== props.kind) return;
    tokens.value = data.token_options || [];
    if (isTeam.value) {
      items.value = data.items || []; total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
    } else {
      if (!tokens.value.some(token => token.value === selectedToken.value)) selectedToken.value = tokens.value[0]?.value || '';
      levels.value = tokens.value.flatMap(token => Array.from({ length: 4 }, (_, level) => {
        const saved = (data.rules || []).find(row => row.token === token.value && Number(row.level) === level);
        return { level, token: token.value, limit_type: saved?.limit_type || 'fixed', daily_limit: String(saved?.daily_limit ?? '0'), enabled: Number(saved?.enabled || 0) };
      }));
    }
    loaded.value = true;
  } catch (err) { if (kind === props.kind) error.value = err.message; }
  finally { if (kind === props.kind) loading.value = false; }
}
function search() { query.page = 1; success.value = ''; load(); }
function changePage(page) { query.page = page; load(); }
function openEdit(row = null) {
  const existing = row?.rules || [];
  const rules = tokens.value.map(token => {
    const saved = existing.find(rule => rule.token === token.value);
    return { token: token.value, scope_type: saved?.scope_type || 'personal', limit_type: saved?.limit_type || 'fixed', daily_limit: String(saved?.daily_limit ?? '0') };
  });
  // Retain rules for assets disabled after the configuration was saved.
  for (const rule of existing) if (!rules.some(item => item.token === rule.token)) rules.push({ ...rule });
  Object.assign(form, { id: Number(row?.id || 0), wallet: row?.wallet || '', rules });
  modalError.value = ''; modal.value = true;
}
async function saveTeam() {
  if (saving.value || !canSaveTeam.value) return;
  saving.value = true; modalError.value = '';
  try {
    await post(`${endpoint.value}/save`, { ...form });
    modal.value = false; success.value = '团队提现限额已保存'; await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}
async function toggle(row) {
  if (saving.value) return;
  saving.value = true; error.value = '';
  try {
    await post(`${endpoint.value}/toggle`, { id: row.id, enabled: Number(row.enabled) === 1 ? 0 : 1 });
    success.value = '状态已更新'; await load();
  } catch (err) { error.value = err.message; }
  finally { saving.value = false; }
}
async function saveLevels() {
  if (saving.value || !loaded.value || !visibleLevels.value.length) return;
  saving.value = true; error.value = ''; success.value = '';
  try {
    await post(`${endpoint.value}/save`, { rules: visibleLevels.value.map(row => ({ ...row })) });
    success.value = '当前币种的等级提现限额已保存';
  } catch (err) { error.value = err.message; }
  finally { saving.value = false; }
}
watch(() => props.kind, () => { query.page = 1; modal.value = false; success.value = ''; load(); }, { immediate: true });
</script>

<template>
  <ManageLayout :title="title" description="按币种配置每日提现限额，申请金额包含手续费。">
    <section class="panel-card">
      <div class="alert-box">等级规则优先于最近的启用团队配置，再沿用资产默认限额；全网每日额度仍单独生效。固定额度 0 表示不限额，收益百分比 0 表示无可用额度。每日按数据库日期统计，退回订单不占额度。</div>
      <p class="muted-text">收益百分比以当天投资分红、直推分红奖励和级差收益为基数，填写 10 表示 10%。团队配置适用于配置钱包本人和全部下级；按个人时每人独立累计，按团队时共用配置钱包及全部下级的额度。人工指定等级同样生效。</p>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <template v-if="isTeam">
        <div class="toolbar"><div class="toolbar-group">
          <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="团队钱包地址" @keyup.enter="search" />
          <select v-model="query.enabled" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
          <button class="primary-button" :disabled="loading || saving" @click="search">查询</button>
        </div><button v-if="can(user, 'team-withdraw-limit-rules-create')" class="primary-button" :disabled="!loaded || saving" @click="openEdit()">新增配置</button></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>团队钱包</th><th>币种限额</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-if="loading || !items.length"><td colspan="5" class="empty-cell">{{ loading ? '正在加载...' : '暂无团队提现限额' }}</td></tr>
            <tr v-for="row in items" :key="row.id"><td class="mono-cell">{{ row.wallet }}</td><td><div v-for="rule in row.rules" :key="rule.token">{{ rule.token }} · {{ rule.scope_type === 'team' ? '团队共享' : '每人独立' }} · {{ rule.limit_type === 'percent' ? '收益' : '固定' }} {{ rule.daily_limit }}{{ rule.limit_type === 'percent' ? '%' : '' }}</div></td><td>{{ Number(row.enabled) === 1 ? '启用' : '禁用' }}</td><td>{{ row.updated_at }}</td><td>
              <button v-if="can(user, 'team-withdraw-limit-rules-update')" class="table-button" :disabled="saving" @click="openEdit(row)">编辑</button>
              <button v-if="can(user, 'team-withdraw-limit-rules-toggle')" class="table-button" :disabled="saving" @click="toggle(row)">{{ Number(row.enabled) === 1 ? '禁用' : '启用' }}</button>
            </td></tr>
          </tbody>
        </table></div>
        <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
      </template>
      <template v-else>
        <div class="toolbar"><div class="toolbar-group"><select v-model="selectedToken" class="text-input text-input--inline" :disabled="loading || saving"><option v-for="token in tokens" :key="token.value" :value="token.value">{{ token.value }}</option></select><button class="ghost-button" :disabled="loading || saving" @click="load">刷新</button></div></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>等级</th><th>限额方式</th><th>每日额度 / %</th><th>启用</th></tr></thead><tbody>
          <tr v-for="row in visibleLevels" :key="`${row.token}:${row.level}`"><td>等级 {{ row.level }}</td><td><select v-model="row.limit_type" class="text-input" :disabled="saving || loading || !can(user, 'level-withdraw-limit-rules-update')"><option value="fixed">按固定额度</option><option value="percent">按收益百分比</option></select></td><td><input v-model.trim="row.daily_limit" class="text-input" inputmode="decimal" :disabled="saving || loading || !can(user, 'level-withdraw-limit-rules-update')" /></td><td><input v-model.number="row.enabled" type="checkbox" :true-value="1" :false-value="0" :disabled="saving || loading || !can(user, 'level-withdraw-limit-rules-update')" /></td></tr>
        </tbody></table></div>
        <button v-if="can(user, 'level-withdraw-limit-rules-update')" class="primary-button" :disabled="!loaded || saving || !visibleLevels.length" @click="saveLevels">{{ saving ? '保存中...' : '保存当前币种配置' }}</button>
      </template>
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑团队提现限额' : '新增团队提现限额' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>团队钱包地址</span><input v-model.trim="form.wallet" class="text-input" :disabled="Boolean(form.id) || saving" placeholder="0x..." /></label>
      <div class="table-wrap"><table class="data-table" style="min-width: auto;"><thead><tr><th>币种</th><th>额度范围</th><th>限额方式</th><th>每日额度 / %</th></tr></thead><tbody>
        <tr v-for="rule in form.rules" :key="rule.token"><td>{{ rule.token }}</td><td><select v-model="rule.scope_type" class="text-input" :disabled="saving"><option value="personal">按个人</option><option value="team">按团队</option></select></td><td><select v-model="rule.limit_type" class="text-input" :disabled="saving"><option value="fixed">按固定额度</option><option value="percent">按收益百分比</option></select></td><td><input v-model.trim="rule.daily_limit" class="text-input" inputmode="decimal" :disabled="saving" /></td></tr>
      </tbody></table></div>
      <button class="submit-button" :disabled="saving || !canSaveTeam || !form.rules.length" @click="saveTeam">{{ saving ? '保存中...' : '保存' }}</button>
    </section></div>
  </ManageLayout>
</template>
