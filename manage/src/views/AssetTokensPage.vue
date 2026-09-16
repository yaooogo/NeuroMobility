<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ keyword: '', status: '', page: 1, page_size: 20 });
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
  id: 0, symbol: '', name: '', decimals: 18, contract: '', icon: '', recharge_min_amount: '0',
  rechargeable: 1, withdrawable: 0, withdraw_service_type: 0, withdraw_service_fee: '0',
  withdraw_min_amount: '0', withdraw_daily_limit: '0', status: 1, sort: 0
});

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/asset-token/list', query);
    list.value = data.items || []; total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function edit(row) {
  Object.assign(form, row);
  modalError.value = ''; modal.value = true;
}
async function save() {
  if (saving.value) return;
  saving.value = true; modalError.value = '';
  try {
    await post('/asset-token/update', form);
    modal.value = false; success.value = '资产类型已更新'; await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}
onMounted(load);
</script>

<template>
  <ManageLayout title="资产类型" description="查看和配置已有资产类型、充值及提现参数。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="资产符号或名称" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1350px">
        <thead><tr><th>ID</th><th>符号</th><th>名称</th><th>合约</th><th>精度</th><th>充值</th><th>最少充值</th><th>提现</th><th>手续费</th><th>最小提现</th><th>每日限额</th><th>排序</th><th>状态</th><th v-if="can(user, 'asset-tokens-update')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'asset-tokens-update') ? 14 : 13" class="empty-cell">{{ loading ? '正在加载...' : '暂无资产类型' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td><strong>{{ row.symbol }}</strong></td><td>{{ row.name || '-' }}</td><td class="mono-cell">{{ row.contract || '-' }}</td><td>{{ row.decimals }}</td><td>{{ row.rechargeable === 1 ? '允许' : '禁止' }}</td><td>{{ row.recharge_min_amount }}</td><td>{{ row.withdrawable === 1 ? '允许' : '禁止' }}</td><td>{{ row.withdraw_service_fee }}{{ row.withdraw_service_type === 1 ? '%' : '' }}</td><td>{{ row.withdraw_min_amount }}</td><td>{{ row.withdraw_daily_limit }}</td><td>{{ row.sort }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td v-if="can(user, 'asset-tokens-update')"><button class="table-button" @click="edit(row)">编辑</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>编辑资产类型</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <div class="asset-form-grid">
        <label class="field-block"><span>资产符号</span><input v-model.trim="form.symbol" class="text-input" maxlength="80" /></label>
        <label class="field-block"><span>名称</span><input v-model.trim="form.name" class="text-input" maxlength="80" /></label>
        <label class="field-block"><span>精度</span><input v-model.number="form.decimals" class="text-input" type="number" min="0" max="36" /></label>
        <label class="field-block"><span>排序</span><input v-model.number="form.sort" class="text-input" type="number" min="0" /></label>
        <label class="field-block asset-form-grid__wide"><span>合约地址</span><input v-model.trim="form.contract" class="text-input" placeholder="0x...；原生币可留空" /></label>
        <label class="field-block"><span>允许充值</span><select v-model.number="form.rechargeable" class="text-input"><option :value="1">允许</option><option :value="0">禁止</option></select></label>
        <label class="field-block"><span>最少充值金额</span><input v-model="form.recharge_min_amount" class="text-input" type="number" min="0" step="0.00000001" /></label>
        <label class="field-block"><span>允许提现</span><select v-model.number="form.withdrawable" class="text-input"><option :value="1">允许</option><option :value="0">禁止</option></select></label>
        <label class="field-block"><span>手续费类型</span><select v-model.number="form.withdraw_service_type" class="text-input"><option :value="0">固定金额</option><option :value="1">百分比</option></select></label>
        <label class="field-block"><span>提现手续费</span><input v-model="form.withdraw_service_fee" class="text-input" type="number" min="0" step="0.0001" /></label>
        <label class="field-block"><span>最小提现金额</span><input v-model="form.withdraw_min_amount" class="text-input" type="number" min="0" step="0.01" /></label>
        <label class="field-block"><span>每日提现限额</span><input v-model="form.withdraw_daily_limit" class="text-input" type="number" min="0" step="0.00000001" /></label>
        <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      </div>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.asset-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.asset-form-grid__wide { grid-column: 1 / -1; }
@media (max-width: 640px) { .asset-form-grid { grid-template-columns: 1fr; } .asset-form-grid__wide { grid-column: auto; } }
</style>
