<script setup>
import { computed, onMounted, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const rules = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const canUpdate = computed(() => can(user, 'parameter-config-update'));

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/system-config/wallet-level');
    rules.value = (data.rules || []).map(item => ({ level: String(item.level), amount: String(item.amount) }));
  } catch (err) { error.value = err.message || '加载等级配置失败'; }
  finally { loading.value = false; }
}

function addLevel() {
  const highest = Math.max(0, ...rules.value.map(item => Number.parseInt(item.level, 10) || 0));
  rules.value.unshift({ level: String(highest + 1), amount: '0' });
}

function removeLevel(index) {
  if (rules.value.length <= 1) { error.value = '至少保留一个等级'; return; }
  rules.value.splice(index, 1);
}

function validate() {
  const normalized = rules.value.map(item => ({ level: Number(item.level), amount: Number(item.amount) }));
  if (normalized.some(item => !Number.isInteger(item.level) || item.level < 1 || item.level > 999)) return '等级必须为 1-999 的整数';
  if (normalized.some(item => !Number.isFinite(item.amount) || item.amount < 0)) return '金额必须为非负数';
  if (new Set(normalized.map(item => item.level)).size !== normalized.length) return '等级不能重复';
  normalized.sort((a, b) => b.level - a.level);
  for (let index = 0; index < normalized.length - 1; index += 1) {
    if (normalized[index].amount <= normalized[index + 1].amount) return `等级 ${normalized[index].level} 的金额必须高于等级 ${normalized[index + 1].level}`;
  }
  return '';
}

async function save() {
  const message = validate();
  if (message) { error.value = message; return; }
  saving.value = true; error.value = ''; success.value = '';
  try {
    const data = await post('/system-config/wallet-level/update', { rules: rules.value });
    rules.value = (data.rules || []).map(item => ({ level: String(item.level), amount: String(item.amount) }));
    success.value = '等级配置已保存';
  } catch (err) { error.value = err.message || '保存等级配置失败'; }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="参数配置" description="通过顶部页签切换配置模块，保存后立即写入系统配置。">
    <section class="panel-card parameter-panel">
      <div class="parameter-tabs">
        <button class="parameter-tab parameter-tab--active" type="button">等级配置</button>
      </div>
      <div class="parameter-section-head">
        <div>
          <h2>等级配置</h2>
          <p>配置各等级对应的金额阈值，达到对应金额后自动进入该等级。</p>
        </div>
        <button v-if="canUpdate" class="primary-button" type="button" @click="addLevel">增加等级</button>
      </div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap level-config-wrap">
        <table class="data-table level-config-table">
          <thead><tr><th>等级</th><th>金额</th><th v-if="canUpdate">操作</th></tr></thead>
          <tbody>
            <tr v-if="loading"><td :colspan="canUpdate ? 3 : 2" class="empty-cell">正在加载...</td></tr>
            <tr v-for="(row, index) in rules" :key="index">
              <td><input v-if="canUpdate" v-model.trim="row.level" class="text-input" type="number" min="1" max="999" step="1" /><strong v-else>{{ row.level }}</strong></td>
              <td><input v-if="canUpdate" v-model.trim="row.amount" class="text-input" type="number" min="0" step="0.01" /><span v-else>{{ row.amount }}</span></td>
              <td v-if="canUpdate"><button class="table-button table-button--danger" type="button" :disabled="rules.length <= 1" @click="removeLevel(index)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="canUpdate" class="level-config-actions"><button class="submit-button" type="button" :disabled="saving || loading" @click="save">{{ saving ? '保存中...' : '保存配置' }}</button></div>
    </section>
  </ManageLayout>
</template>

<style scoped>
.parameter-panel { display: flex; flex-direction: column; padding: 0; }
.parameter-tabs { display: flex; gap: 10px; padding: 12px 24px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.parameter-tab { min-height: 42px; padding: 0 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel-strong); color: var(--text); font: inherit; white-space: nowrap; }
.parameter-tab--active { border-color: #3d7bff66; background: #3d7bff2e; }
.parameter-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 26px 24px 20px; }
.parameter-section-head h2 { margin: 0 0 8px; font-size: 27px; }
.parameter-section-head p { margin: 0; color: var(--muted); }
.level-config-wrap { margin: 0 24px; width: auto; }
.level-config-table { min-width: 620px; }
.level-config-table th:nth-child(1), .level-config-table td:nth-child(1) { width: 28%; }
.level-config-table th:last-child, .level-config-table td:last-child { width: 120px; }
.level-config-actions { display: flex; margin-top: auto; padding-top: 26px; border-top: 1px solid var(--line); }
.level-config-actions .submit-button { width: 100%; min-height: 42px; border-radius: 0 0 24px 24px; font-size: 16px; }
@media (max-width: 640px) {
  .parameter-section-head { align-items: stretch; flex-direction: column; }
  .level-config-wrap { margin: 0 14px; }
}
</style>
