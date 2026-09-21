<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ wallet: '', token: '', page: 1, page_size: 20 });
const list = ref([]);
const tokenOptions = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({ wallet: '', token: '', asset_type: 'balance', change_type: 'in', amount: '', reason: '' });

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/wallet-asset/list', query);
    list.value = data.items || [];
    tokenOptions.value = data.token_options || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function openChange() {
  Object.assign(form, {
    wallet: '', token: tokenOptions.value[0]?.value || '', asset_type: 'balance',
    change_type: 'in', amount: '', reason: ''
  });
  modalError.value = ''; modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!/^0x[a-fA-F0-9]{40}$/u.test(form.wallet)) { modalError.value = '请输入正确的钱包地址'; return; }
  if (!form.token) { modalError.value = '请选择资产类型'; return; }
  if (!/^\d+(?:\.\d+)?$/u.test(form.amount) || Number(form.amount) <= 0) { modalError.value = '请输入大于 0 的变更数量'; return; }
  if (!form.reason.trim()) { modalError.value = '请输入变更原因'; return; }
  saving.value = true; modalError.value = '';
  try {
    await post('/wallet-asset/change', form);
    modal.value = false; success.value = '钱包资产已变更，记录已写入资产流水'; await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="钱包资产管理" description="查看钱包可用及冻结资产；人工变更会同步记录资产流水。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="钱包地址" @keyup.enter="search" />
        <select v-model="query.token" class="text-input text-input--inline"><option value="">全部资产</option><option v-for="item in tokenOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'wallet-assets-update')" class="primary-button" @click="openChange">变更资产</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 900px">
        <thead><tr><th>ID</th><th>钱包地址</th><th>资产</th><th>可用余额</th><th>冻结余额</th><th>更新时间</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="6" class="empty-cell">{{ loading ? '正在加载...' : '暂无钱包资产' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td><strong>{{ row.token || '-' }}</strong></td><td class="mono-cell">{{ row.balance }}</td><td class="mono-cell">{{ row.frozen_balance }}</td><td>{{ row.updated_at || '-' }}</td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card" style="width: min(100%, 560px)" @click.stop>
      <div class="modal-head"><h2>变更钱包资产</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>钱包地址</span><input v-model.trim="form.wallet" class="text-input" maxlength="42" placeholder="请输入 0x 钱包地址" /></label>
      <label class="field-block"><span>资产类型</span><select v-model="form.token" class="text-input"><option value="" disabled>请选择资产类型</option><option v-for="item in tokenOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
      <label class="field-block"><span>变更账户</span><select v-model="form.asset_type" class="text-input"><option value="balance">可用余额</option><option value="frozen_balance">冻结余额</option></select></label>
      <label class="field-block"><span>变更方式</span><select v-model="form.change_type" class="text-input"><option value="in">增加</option><option value="out">扣减</option></select></label>
      <label class="field-block"><span>变更数量</span><input v-model.trim="form.amount" class="text-input" type="text" inputmode="decimal" placeholder="请输入大于 0 的数量" /></label>
      <label class="field-block"><span>变更原因</span><textarea v-model.trim="form.reason" class="text-input" maxlength="255" rows="3" placeholder="必填，将写入资产变更记录"></textarea></label>
      <div class="alert-box">资产变更属于敏感操作，确认后会立即生效且写入流水。</div>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '变更中...' : '确认变更' }}</button>
    </section></div>
  </ManageLayout>
</template>
