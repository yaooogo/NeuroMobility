<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';
import { formatFixedAmount } from '../lib/amount.js';

const query = reactive({ wallet: '', search_team: 0, order_id: '', status: '', page: 1, page_size: 20 });
const list = ref([]); const total = ref(0); const lastPage = ref(1); const loading = ref(false); const error = ref('');
const summary = reactive({ order_count: 0, amount: '0', distributed_amount: '0', total_dividend: '0' });
const dividendVisible = ref(false); const dividendOrder = ref(null); const dividendList = ref([]);
const dividendQuery = reactive({ order_id: '', page: 1, page_size: 20 });
const dividendTotal = ref(0); const dividendLastPage = ref(1); const dividendLoading = ref(false); const dividendError = ref('');
const statusLabels = { 0: '等待期', 1: '分红中', 2: '已出局' };
async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/investment-order/list', query);
    list.value = data.items || []; total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
    Object.assign(summary, data.summary || { order_count: 0, amount: '0', distributed_amount: '0', total_dividend: '0' });
  } catch (err) { error.value = err.message || '加载投资订单失败'; }
  finally { loading.value = false; }
}
function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', search_team: 0, order_id: '', status: '', page: 1 }); load(); }
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
        <input v-model.trim="query.wallet" class="text-input text-input--inline" :placeholder="query.search_team ? '上级钱包地址（搜索全部团队）' : '钱包地址'" @keyup.enter="search" />
        <label class="inline-check"><input v-model.number="query.search_team" type="checkbox" :true-value="1" :false-value="0" /><span>搜索团队</span></label>
        <input v-model.trim="query.order_id" class="text-input text-input--inline" placeholder="订单号" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="0">等待期</option><option value="1">分红中</option><option value="2">已出局</option></select>
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="investment-summary">
        <div class="investment-summary-card"><span>筛选订单数</span><strong>{{ summary.order_count }}</strong></div>
        <div class="investment-summary-card"><span>投资总额</span><strong>{{ formatFixedAmount(summary.amount) }} U</strong></div>
        <div class="investment-summary-card"><span>已分红总额</span><strong>{{ formatFixedAmount(summary.distributed_amount) }} U</strong></div>
        <div class="investment-summary-card"><span>计划分红总额</span><strong>{{ formatFixedAmount(summary.total_dividend) }} U</strong></div>
      </div>
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
.inline-check { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.inline-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
.investment-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.investment-summary-card { min-width: 0; padding: 16px; border: 1px solid rgba(142, 168, 241, 0.14); border-radius: 14px; background: rgba(8, 15, 29, 0.58); }
.investment-summary-card span { display: block; margin-bottom: 10px; color: var(--muted); font-size: 13px; }
.investment-summary-card strong { display: block; overflow-wrap: anywhere; font-size: 22px; line-height: 1.2; }
@media (max-width: 900px) { .investment-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .investment-summary { grid-template-columns: 1fr; } }
</style>
