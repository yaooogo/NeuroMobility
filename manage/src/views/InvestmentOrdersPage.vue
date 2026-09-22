<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';
import { formatFixedAmount } from '../lib/amount.js';

const query = reactive({ wallet: '', order_id: '', status: '', page: 1, page_size: 20 });
const list = ref([]); const total = ref(0); const lastPage = ref(1); const loading = ref(false); const error = ref('');
const dividendVisible = ref(false); const dividendOrder = ref(null); const dividendList = ref([]);
const dividendQuery = reactive({ order_id: '', page: 1, page_size: 20 });
const dividendTotal = ref(0); const dividendLastPage = ref(1); const dividendLoading = ref(false); const dividendError = ref('');
const statusLabels = { 0: '等待期', 1: '分红中', 2: '已出局' };
async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/investment-order/list', query);
    list.value = data.items || []; total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message || '加载投资订单失败'; }
  finally { loading.value = false; }
}
function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', order_id: '', status: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
async function loadDividends() {
  dividendLoading.value = true; dividendError.value = '';
  try {
    const data = await post('/investment-order/dividend-list', dividendQuery);
    dividendList.value = data.items || [];
    dividendTotal.value = Number(data.total || 0);
    dividendLastPage.value = Number(data.last_page || 1);
  } catch (err) { dividendError.value = err.message || '加载分红记录失败'; }
  finally { dividendLoading.value = false; }
}
function openDividends(row) {
  dividendOrder.value = row;
  dividendQuery.order_id = row.order_id;
  dividendQuery.page = 1;
  dividendList.value = [];
  dividendTotal.value = 0;
  dividendLastPage.value = 1;
  dividendVisible.value = true;
  loadDividends();
}
function closeDividends() {
  if (!dividendLoading.value) dividendVisible.value = false;
}
function changeDividendPage(page) { dividendQuery.page = page; loadDividends(); }
onMounted(load);
</script>

<template>
  <ManageLayout title="投资订单" description="查看用户投资、等待期与分红进度。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="钱包地址" @keyup.enter="search" />
        <input v-model.trim="query.order_id" class="text-input text-input--inline" placeholder="订单号" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="0">等待期</option><option value="1">分红中</option><option value="2">已出局</option></select>
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1880px">
        <thead><tr><th>ID</th><th>订单号</th><th>钱包</th><th>投资金额</th><th>已分红</th><th>总分红</th><th>等待期</th><th>分红周期</th><th>分红范围</th><th>保底分红</th><th>整车</th><th>状态</th><th>等待截止</th><th>下次分红</th><th>投资时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="16" class="empty-cell">{{ loading ? '正在加载...' : '暂无投资订单' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.order_id }}</td><td class="mono-cell">{{ row.wallet }}</td><td>{{ formatFixedAmount(row.amount) }} U</td><td>{{ formatFixedAmount(row.distributed_amount) }} U</td><td>{{ formatFixedAmount(row.total_dividend) }} U</td><td>{{ row.waiting_days }}天</td><td>{{ row.cycle_days }}天</td><td>{{ row.min_percent }}% ~ {{ row.max_percent }}%</td><td>{{ row.guaranteed_percent }}%</td><td>{{ row.whole_vehicle === 1 ? '是' : '否' }}</td><td>{{ statusLabels[row.status] || '未知' }}</td><td>{{ row.waiting_until || '-' }}</td><td>{{ row.next_dividend_at || '-' }}</td><td>{{ row.created_at || '-' }}</td><td><button class="table-button" type="button" @click="openDividends(row)">分红记录</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="dividendVisible" class="modal-mask" @click="closeDividends">
      <section class="modal-card investment-dividend-modal" @click.stop>
        <div class="modal-head"><h2>分红记录</h2><button class="ghost-button" type="button" :disabled="dividendLoading" @click="closeDividends">关闭</button></div>
        <div class="muted-text">订单号：<span class="mono-cell">{{ dividendOrder?.order_id }}</span></div>
        <div v-if="dividendError" class="alert-box alert-box--error">{{ dividendError }}</div>
        <div class="table-wrap"><table class="data-table" style="min-width: 900px">
          <thead><tr><th>ID</th><th>分红流水号</th><th>分红周期</th><th>比例</th><th>金额</th><th>币种</th><th>发放时间</th></tr></thead>
          <tbody>
            <tr v-if="dividendLoading || !dividendList.length"><td colspan="7" class="empty-cell">{{ dividendLoading ? '正在加载...' : '暂无分红记录' }}</td></tr>
            <tr v-for="row in dividendList" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.dividend_id }}</td><td>{{ row.cycle_at || '-' }}</td><td>{{ row.percent }}%</td><td>{{ formatFixedAmount(row.amount) }} U</td><td>{{ row.token }}</td><td>{{ row.created_at || '-' }}</td></tr>
          </tbody>
        </table></div>
        <ManagePagination :page="dividendQuery.page" :last-page="dividendLastPage" :total="dividendTotal" @change="changeDividendPage" />
      </section>
    </div>
  </ManageLayout>
</template>

<style scoped>
.investment-dividend-modal { width: min(1080px, calc(100vw - 32px)); }
</style>
