<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { formatFixedAmount } from '../lib/amount.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ wallet: '', search_team: 0, order_id: '', status: '', is_gift: '', page: 1, page_size: 20 });
const list = ref([]); const total = ref(0); const lastPage = ref(1); const loading = ref(false); const error = ref('');
const success = ref('');
const investmentVisible = ref(false);
const investmentSubmitting = ref(false);
const investmentError = ref('');
const investmentForm = reactive({ wallet: '', token: 'USDT', amount: '', deduct_wallet: true });
function openInvestment() {
  Object.assign(investmentForm, { wallet: '', token: 'USDT', amount: '', deduct_wallet: true });
  investmentError.value = '';
  investmentVisible.value = true;
}
function closeInvestment() {
  if (!investmentSubmitting.value) investmentVisible.value = false;
}
async function submitInvestment() {
  if (investmentSubmitting.value) return;
  investmentError.value = '';
  if (!/^0x[a-fA-F0-9]{40}$/u.test(investmentForm.wallet)) {
    investmentError.value = '请输入有效的用户地址'; return;
  }
  if (!/^\d+(?:\.\d{1,18})?$/u.test(investmentForm.amount) || !/[1-9]/u.test(investmentForm.amount)) {
    investmentError.value = '请输入大于零的支付数额，最多支持18位小数'; return;
  }
  investmentSubmitting.value = true;
  try {
    const data = await post('/investment-order/create', { ...investmentForm });
    investmentVisible.value = false;
    success.value = `用户投资成功，订单号：${data.order_id}`;
    query.page = 1;
    await load();
  } catch (err) { investmentError.value = err.message || '用户投资失败'; }
  finally { investmentSubmitting.value = false; }
}
const emptySummary = {
  order_count: 0,
  amount: '0',
  usdt_amount: '0',
  rusdt_amount: '0',
  usdt_order_count: 0,
  rusdt_order_count: 0,
  mixed_order_count: 0,
  distributed_amount: '0',
  total_dividend: '0'
};
const summary = reactive({ ...emptySummary });
const dividendVisible = ref(false); const dividendOrder = ref(null); const dividendList = ref([]);
const dividendQuery = reactive({ order_id: '', page: 1, page_size: 20 });
const dividendTotal = ref(0); const dividendLastPage = ref(1); const dividendLoading = ref(false); const dividendError = ref('');
const manualDividendEnabled = ['dev', 'localdev'].includes(import.meta.env.MODE);
const distributingOrderId = ref('');
const terminatingOrderId = ref('');
const statusLabels = { 0: '等待期', 1: '分红中', 2: '已出局', 3: '已终止' };
async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/investment-order/list', query);
    list.value = data.items || []; total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
    Object.assign(summary, emptySummary, data.summary || {});
  } catch (err) { error.value = err.message || '加载投资订单失败'; }
  finally { loading.value = false; }
}
function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', search_team: 0, order_id: '', status: '', is_gift: '', page: 1 }); success.value = ''; load(); }
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
async function dividendNow(row) {
  if (!window.confirm(`确认立即给订单 ${row.order_id} 分红一次吗？`)) return;
  distributingOrderId.value = row.order_id;
  error.value = '';
  try {
    await post('/investment-order/dividend-now', { order_id: row.order_id });
    await load();
  } catch (err) {
    error.value = err.message || '立即分红失败';
  } finally {
    distributingOrderId.value = '';
  }
}
async function terminateOrder(row) {
  if (terminatingOrderId.value || ![0, 1].includes(Number(row.status))) return;
  const refundText = paymentText(row).split(' + ').filter((part) => part.includes('USDT')).join(' + ') || '0 USDT';
  if (!window.confirm(`确认终止投资订单 ${row.order_id} 吗？\n\n系统只退回本金中的 USDT 部分：${refundText}\nRUSD 部分不会退回。`)) return;
  terminatingOrderId.value = row.order_id;
  error.value = '';
  success.value = '';
  try {
    const data = await post('/investment-order/terminate', { id: row.id });
    success.value = `投资订单已终止，已退回 ${formatFixedAmount(data.refunded_amount || '0')} USDT`;
    await load();
  } catch (err) {
    error.value = err.message || '终止投资订单失败';
  } finally {
    terminatingOrderId.value = '';
  }
}
function paymentText(row) {
  const parts = Array.isArray(row?.payment_parts) && row.payment_parts.length
    ? row.payment_parts
    : [{ token: row?.token || 'USDT', amount: row?.amount || '0' }];
  return parts.map((part) => `${formatFixedAmount(part.amount)} ${part.token || 'USDT'}`).join(' + ');
}
function tokenLabel(row) {
  const token = String(row?.token || 'USDT').toUpperCase();
  if (token !== 'USDT+RUSD') return token;
  return `${token} (${Number(row?.mixed_usdt_percent || 0)}% USDT)`;
}
onMounted(load);
</script>

<template>
  <ManageLayout title="投资订单" description="查看用户投资、等待期与分红进度。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" :placeholder="query.search_team ? '上级钱包地址（搜索全部团队）' : '钱包地址'" @keyup.enter="search" />
        <label class="inline-check"><input v-model.number="query.search_team" type="checkbox" :true-value="1" :false-value="0" /><span>搜索团队</span></label>
        <input v-model.trim="query.order_id" class="text-input text-input--inline" placeholder="订单号" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="0">等待期</option><option value="1">分红中</option><option value="2">已出局</option><option value="3">已终止</option></select>
        <select v-model="query.is_gift" class="text-input text-input--inline" aria-label="投资标识"><option value="">全部投资标识</option><option value="0">普通投资</option><option value="1">赠送</option></select>
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div><div v-if="can(user, 'investment-orders-create')" class="toolbar-actions investment-toolbar-actions"><button class="primary-button" type="button" @click="openInvestment">用户投资</button></div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="investment-summary">
        <div class="investment-summary-card"><span>筛选订单数</span><strong>{{ summary.order_count }}</strong></div>
        <div class="investment-summary-card"><span>投资总额</span><strong>{{ formatFixedAmount(summary.amount) }} U</strong><em>{{ formatFixedAmount(summary.usdt_amount) }} USDT + {{ formatFixedAmount(summary.rusdt_amount) }} RUSD</em></div>
        <div class="investment-summary-card"><span>订单类型</span><strong>{{ summary.usdt_order_count }} / {{ summary.rusdt_order_count }} / {{ summary.mixed_order_count }}</strong><em>USDT / RUSD / 混合</em></div>
        <div class="investment-summary-card"><span>分红总额</span><strong>{{ formatFixedAmount(summary.distributed_amount) }} USDT</strong><em>计划 {{ formatFixedAmount(summary.total_dividend) }} USDT</em></div>
      </div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1780px">
        <thead><tr><th>ID</th><th>订单号</th><th>钱包</th><th>参与方式</th><th>投资标识</th><th>投资金额</th><th>已分红</th><th>总分红</th><th>等待期</th><th>分红周期</th><th>整车</th><th>状态</th><th>等待截止</th><th>下次分红</th><th>投资时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="16" class="empty-cell">{{ loading ? '正在加载...' : '暂无投资订单' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.order_id }}</td><td class="mono-cell">{{ row.wallet }}</td><td>{{ tokenLabel(row) }}</td><td><span v-if="Number(row.is_gift) === 1" class="investment-gift-badge">赠送</span><span v-else>普通投资</span></td><td>{{ paymentText(row) }}</td><td>{{ formatFixedAmount(row.distributed_amount) }} USDT</td><td>{{ formatFixedAmount(row.total_dividend) }} USDT</td><td>{{ row.waiting_days }}天</td><td>{{ row.cycle_days }}天</td><td>{{ row.whole_vehicle === 1 ? '是' : '否' }}</td><td>{{ statusLabels[row.status] || '未知' }}</td><td>{{ row.waiting_until || '-' }}</td><td>{{ row.next_dividend_at || '-' }}</td><td>{{ row.created_at || '-' }}</td><td class="actions-cell"><button class="table-button" type="button" @click="openDividends(row)">分红记录</button><button v-if="manualDividendEnabled && [0, 1].includes(Number(row.status))" class="table-button" type="button" :disabled="Boolean(distributingOrderId)" @click="dividendNow(row)">{{ distributingOrderId === row.order_id ? '分红中...' : '立即分红' }}</button><button v-if="can(user, 'investment-orders-terminate') && [0, 1].includes(Number(row.status))" class="table-button table-button--danger" type="button" :disabled="Boolean(terminatingOrderId)" @click="terminateOrder(row)">{{ terminatingOrderId === row.order_id ? '终止中...' : '终止' }}</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="investmentVisible" class="modal-mask" @click="closeInvestment">
      <section class="modal-card user-investment-modal" role="dialog" aria-modal="true" aria-labelledby="user-investment-title" @click.stop>
        <div class="modal-head"><h2 id="user-investment-title">用户投资</h2><button class="ghost-button" type="button" :disabled="investmentSubmitting" @click="closeInvestment">关闭</button></div>
        <form class="user-investment-form" @submit.prevent="submitInvestment">
          <div v-if="investmentError" class="alert-box alert-box--error">{{ investmentError }}</div>
          <label>用户地址<input v-model.trim="investmentForm.wallet" class="text-input" placeholder="请输入用户地址（0x...）" :disabled="investmentSubmitting" required /></label>
          <label>支付方式<select v-model="investmentForm.token" class="text-input" :disabled="investmentSubmitting"><option value="USDT">USDT</option><option value="RUSD">RUSD</option><option value="USDT+RUSD">USDT+RUSD</option></select></label>
          <label>支付数额<input v-model.trim="investmentForm.amount" class="text-input" inputmode="decimal" placeholder="请输入支付数额" :disabled="investmentSubmitting" required /></label>
          <p v-if="investmentForm.token === 'USDT+RUSD'" class="muted-text">USDT 与 RUSD 按后台配置比例支付，支付数额为两种资产合计。</p>
          <label class="inline-check"><input v-model="investmentForm.deduct_wallet" type="checkbox" :disabled="investmentSubmitting" /><span>扣除钱包资金</span></label>
          <div class="user-investment-actions"><button class="ghost-button" type="button" :disabled="investmentSubmitting" @click="closeInvestment">取消</button><button class="primary-button" type="submit" :disabled="investmentSubmitting">{{ investmentSubmitting ? '提交中...' : '确认投资' }}</button></div>
        </form>
      </section>
    </div>
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
.investment-gift-badge { display: inline-block; padding: 4px 10px; border-radius: 8px; color: var(--primary); background: rgba(142, 168, 241, 0.14); white-space: nowrap; }
.investment-toolbar-actions { margin-left: auto; }
.user-investment-modal { width: min(520px, calc(100vw - 32px)); }
.user-investment-form { display: grid; gap: 18px; }
.user-investment-form > label:not(.inline-check) { display: grid; gap: 8px; }
.user-investment-actions { display: flex; justify-content: flex-end; gap: 12px; }
.investment-dividend-modal { width: min(1080px, calc(100vw - 32px)); }
.inline-check { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.inline-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
.investment-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.investment-summary-card { min-width: 0; padding: 16px; border: 1px solid rgba(142, 168, 241, 0.14); border-radius: 14px; background: rgba(8, 15, 29, 0.58); }
.investment-summary-card span { display: block; margin-bottom: 10px; color: var(--muted); font-size: 13px; }
.investment-summary-card strong { display: block; overflow-wrap: anywhere; font-size: 22px; line-height: 1.2; }
.investment-summary-card em { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; font-style: normal; overflow-wrap: anywhere; }
@media (max-width: 900px) { .investment-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .investment-summary { grid-template-columns: 1fr; } }
</style>
