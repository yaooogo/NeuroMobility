<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post, postBlob } from '../lib/http.js';
import { getUser } from '../lib/auth.js';
import { can } from '../lib/permissions.js';
const user = getUser();

const query = reactive({ wallet: '', search_team: 0, token: '', order_id: '', tx_hash: '', start_date: '', end_date: '', page: 1, page_size: 20 });
const list = ref([]); const tokenOptions = ref([]); const total = ref(0); const lastPage = ref(1);
const exporting = ref(false);
const loading = ref(false); const error = ref('');

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/deposit-order/list', query);
    list.value = data.items || []; tokenOptions.value = data.token_options || [];
    total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; list.value = []; }
  finally { loading.value = false; }
}

async function exportCsv() {
  if (exporting.value) return;
  exporting.value = true; error.value = '';
  try {
    const { blob, filename } = await postBlob('/deposit-order/export', { ...query });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename || `deposit-orders-${Date.now()}.csv`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  } catch (err) { error.value = err.message; }
  finally { exporting.value = false; }
}

function search() {
  if (query.start_date && query.end_date && query.start_date > query.end_date) { error.value = '结束日期不能早于开始日期'; return; }
  query.page = 1; load();
}
function reset() { Object.assign(query, { wallet: '', search_team: 0, token: '', order_id: '', tx_hash: '', start_date: '', end_date: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
onMounted(load);
</script>

<template>
  <ManageLayout title="充值订单" description="查看用户已确认的链上充值订单。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" :placeholder="query.search_team ? '上级钱包地址（搜索全部团队）' : '钱包地址'" @keyup.enter="search" />
        <label class="inline-check"><input v-model.number="query.search_team" type="checkbox" :true-value="1" :false-value="0" /><span>搜索团队</span></label>
        <input v-model.trim="query.order_id" class="text-input text-input--inline" placeholder="订单号" @keyup.enter="search" />
        <input v-model.trim="query.tx_hash" class="text-input text-input--inline" placeholder="交易哈希" @keyup.enter="search" />
        <select v-model="query.token" class="text-input text-input--inline"><option value="">全部资产</option><option v-for="item in tokenOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <input v-model="query.start_date" class="text-input text-input--inline" type="date" aria-label="开始日期" />
        <input v-model="query.end_date" class="text-input text-input--inline" type="date" aria-label="结束日期" />
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div><button v-if="can(user, 'deposit-orders-export')" class="ghost-button" :disabled="exporting" @click="exportCsv">{{ exporting ? '导出中...' : '导出 CSV' }}</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1450px">
        <thead><tr><th>ID</th><th>订单号</th><th>钱包地址</th><th>资产</th><th>充值数量</th><th>交易哈希</th><th>区块高度</th><th>日志序号</th><th>收款合约</th><th>创建时间</th><th>更新时间</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="11" class="empty-cell">{{ loading ? '正在加载...' : '暂无充值订单' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.order_id || '-' }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td>{{ row.token || '-' }}</td><td>{{ row.amount }}</td><td class="mono-cell">{{ row.tx_hash || '-' }}</td><td>{{ row.block_number || '-' }}</td><td>{{ row.log_index }}</td><td class="mono-cell">{{ row.contract || '-' }}</td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
  </ManageLayout>
</template>

<style scoped>
.inline-check { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 8px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.inline-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
</style>
