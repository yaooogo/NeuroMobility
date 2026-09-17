<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ keyword: '', status: '', level: '', page: 1, page_size: 20 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({
  id: 0, wallet: '', inviter: '', ref_code: '', status: 1, withdraw_enabled: 1, usdt_withdraw_enabled: 1,
  is_manual_level: 0, manual_level: 0, remark_system: '', remark_name: '', remark_community: ''
});

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
function openCreate() {
  Object.assign(form, {
    id: 0, wallet: '', inviter: '', ref_code: '', status: 1,
    withdraw_enabled: 1, usdt_withdraw_enabled: 1, is_manual_level: 0, manual_level: 0,
    remark_system: '', remark_name: '', remark_community: ''
  });
  modalError.value = ''; modal.value = true;
}
function edit(row) {
  Object.assign(form, {
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

onMounted(load);
</script>

<template>
  <ManageLayout title="钱包管理" description="查看钱包关系、等级与状态，并控制提现和人工等级。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="钱包地址、邀请人或邀请码" @keyup.enter="search" />
        <select v-model="query.level" class="text-input text-input--inline"><option value="">全部等级</option><option v-for="level in [0, 1, 2, 3]" :key="level" :value="level">等级 {{ level }}</option></select>
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'wallets-create')" class="primary-button" @click="openCreate">新增钱包</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1750px">
        <thead><tr><th>ID</th><th>钱包地址</th><th>邀请人</th><th>邀请码</th><th>价格</th><th>社区价格</th><th>下级价格</th><th>层级</th><th>等级</th><th>等级模式</th><th>提现</th><th>USDT提现</th><th>状态</th><th>系统备注</th><th>名称备注</th><th>社区备注</th><th>创建时间</th><th v-if="can(user, 'wallets-update')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'wallets-update') ? 18 : 17" class="empty-cell">{{ loading ? '正在加载...' : '暂无钱包' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td class="mono-cell">{{ row.inviter || '-' }}</td><td>{{ row.ref_code || '-' }}</td><td>{{ row.prices }}</td><td>{{ row.community_prices }}</td><td>{{ row.sub_prices }}</td><td>{{ row.lv }}</td><td>{{ row.level }}</td><td>{{ row.is_manual_level === 1 ? `手动 ${row.manual_level}` : '自动' }}</td><td>{{ row.withdraw_enabled === 1 ? '允许' : '禁止' }}</td><td>{{ row.usdt_withdraw_enabled === 1 ? '允许' : '禁止' }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.remark_system || '-' }}</td><td>{{ row.remark_name || '-' }}</td><td>{{ row.remark_community || '-' }}</td><td>{{ row.created_at || '-' }}</td><td v-if="can(user, 'wallets-update')"><button class="table-button" @click="edit(row)">编辑</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑钱包' : '新增钱包' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>钱包地址</span><code v-if="form.id" class="wallet-address">{{ form.wallet }}</code><input v-else v-model.trim="form.wallet" class="text-input" maxlength="42" placeholder="0x..." /></label>
      <div class="wallet-form-grid">
        <label v-if="!form.id" class="field-block"><span>邀请钱包或邀请码（选填）</span><input v-model.trim="form.inviter" class="text-input" maxlength="100" placeholder="留空则创建根钱包" /></label>
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
@media (max-width: 640px) { .wallet-form-grid { grid-template-columns: 1fr; } .wallet-form-grid__wide { grid-column: auto; } }
</style>
