<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post, postBlob } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ wallet: '', token: '', order_id: '', tx_hash: '', status: '', start_date: '', end_date: '', page: 1, page_size: 20 });
const list = ref([]); const tokenOptions = ref([]); const total = ref(0); const lastPage = ref(1);
const loading = ref(false); const exporting = ref(false); const cancelling = ref(0); const error = ref(''); const success = ref('');

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/withdrawal-order/list', query);
    list.value = data.items || []; tokenOptions.value = data.token_options || [];
    total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; list.value = []; }
  finally { loading.value = false; }
}

function search() {
  if (query.start_date && query.end_date && query.start_date > query.end_date) { error.value = '结束日期不能早于开始日期'; return; }
  query.page = 1; success.value = ''; load();
}
function reset() { Object.assign(query, { wallet: '', token: '', order_id: '', tx_hash: '', status: '', start_date: '', end_date: '', page: 1 }); success.value = ''; load(); }
function changePage(page) { query.page = page; load(); }
function statusLabel(value) { return ({ 0: '待提交', 1: '已提交', 2: '已完成', 3: '已退回' })[Number(value)] || `未知(${value})`; }
function statusClass(value) { return Number(value) === 2 ? 'status-badge--on' : Number(value) === 3 ? 'status-badge--off' : ''; }
function remainingLabel(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(value / 60); const rest = value % 60;
  return minutes ? `${minutes}分${rest}秒后可取消` : `${rest}秒后可取消`;
}

async function exportCsv() {
  if (exporting.value) return;
  exporting.value = true; error.value = ''; success.value = '';
  try {
    const { blob, filename } = await postBlob('/withdrawal-order/export', query);
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename || `withdrawal-orders-${Date.now()}.csv`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  } catch (err) { error.value = err.message; }
  finally { exporting.value = false; }
}

async function cancelOrder(row) {
  if (cancelling.value || !row.can_cancel) return;
  if (!globalThis.confirm(`确认取消提现订单 ${row.order_id || row.id} 并退回冻结资产吗？\n\n系统会再次验证订单签名已过期且链上尚未提取。`)) return;
  cancelling.value = row.id; error.value = ''; success.value = '';
  try {
    await post('/withdrawal-order/cancel', { id: row.id });
    success.value = '提现订单已取消，冻结资产已退回用户可用余额'; await load();
  } catch (err) { error.value = err.message; }
  finally { cancelling.value = 0; }
}
onMounted(load);
</script>

<template>
  <ManageLayout title="提现订单" description="查看提现状态，并安全取消已过期且链上未提取的订单。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="钱包地址" @keyup.enter="search" />
        <input v-model.trim="query.order_id" class="text-input text-input--inline" placeholder="订单号" @keyup.enter="search" />
        <input v-model.trim="query.tx_hash" class="text-input text-input--inline" placeholder="交易哈希" @keyup.enter="search" />
        <select v-model="query.token" class="text-input text-input--inline"><option value="">全部资产</option><option v-for="item in tokenOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="0">待提交</option><option value="1">已提交</option><option value="2">已完成</option><option value="3">已退回</option></select>
        <input v-model="query.start_date" class="text-input text-input--inline" type="date" aria-label="开始日期" />
        <input v-model="query.end_date" class="text-input text-input--inline" type="date" aria-label="结束日期" />
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div><button v-if="can(user, 'withdrawal-orders-export')" class="ghost-button" :disabled="exporting" @click="exportCsv">{{ exporting ? '导出中...' : '导出 CSV' }}</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1800px">
        <thead><tr><th>ID</th><th>订单号</th><th>钱包地址</th><th>资产</th><th>申请数量</th><th>到账数量</th><th>手续费</th><th>状态</th><th>交易哈希</th><th>签名截止时间</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'withdrawal-orders-cancel')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'withdrawal-orders-cancel') ? 13 : 12" class="empty-cell">{{ loading ? '正在加载...' : '暂无提现订单' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.order_id || '-' }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td>{{ row.token || '-' }}</td><td>{{ row.debit_amount }}</td><td>{{ row.amount }}</td><td>{{ row.service_amount }}</td><td><span class="status-badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td><td class="mono-cell">{{ row.tx_hash || '-' }}</td><td>{{ row.deadline_at || '-' }}</td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td><td v-if="can(user, 'withdrawal-orders-cancel')"><button v-if="row.can_cancel" class="table-button table-button--danger" :disabled="Boolean(cancelling)" @click="cancelOrder(row)">{{ cancelling === row.id ? '取消中...' : '取消并退回' }}</button><span v-else-if="row.status === 0 && row.cancel_remaining_seconds" class="muted-text">{{ remainingLabel(row.cancel_remaining_seconds) }}</span><span v-else>-</span></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
  </ManageLayout>
</template>
