<script setup>
import { computed, onMounted, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import { post } from '../lib/http.js';

const overview = ref(null);
const contractBalance = ref(null);
const loading = ref(false);
const balanceLoading = ref(false);
const error = ref('');
const balanceError = ref('');

const userCards = computed(() => [
  { label: '24H新增用户', value: formatInteger(overview.value?.users?.new_24h) },
  { label: '总用户数', value: formatInteger(overview.value?.users?.total) },
  { label: '总激活用户数', value: formatInteger(overview.value?.users?.active) }
]);

const fundGroups = computed(() => [
  { title: '充值U', values: overview.value?.funds?.recharge_usdt },
  { title: '提现U', values: overview.value?.funds?.withdrawal_usdt }
]);

function periodCards(values) {
  return [
    { label: '当日', value: formatAmount(values?.today) },
    { label: '当月', value: formatAmount(values?.month) },
    { label: '总计', value: formatAmount(values?.total) }
  ];
}

function formatInteger(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '0';
}

function formatAmount(value) {
  const text = String(value ?? '0').trim();
  if (!text) return '0';
  const number = Number(text);
  return Number.isFinite(number)
    ? number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })
    : text;
}

async function loadOverview() {
  loading.value = true; error.value = '';
  try { overview.value = await post('/overview'); }
  catch (err) { error.value = err.message || '加载首页总览失败'; }
  finally { loading.value = false; }
}

async function loadContractBalance() {
  balanceLoading.value = true; balanceError.value = '';
  try { contractBalance.value = await post('/overview/withdrawal-contract-balance'); }
  catch (err) { balanceError.value = err.message || '查询提现合约余额失败'; }
  finally { balanceLoading.value = false; }
}

async function refresh() {
  await Promise.all([loadOverview(), loadContractBalance()]);
}

onMounted(refresh);
</script>

<template>
  <ManageLayout title="首页总览" description="查看平台用户与资产余额概况。">
    <section class="panel-card overview-panel">
      <div class="overview-toolbar">
        <span>更新时间：{{ overview?.generated_at || '-' }}</span>
        <button class="ghost-button" :disabled="loading || balanceLoading" @click="refresh">{{ loading || balanceLoading ? '刷新中...' : '刷新' }}</button>
      </div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>


      <section class="contract-balance-panel">
        <div class="contract-balance-copy">
          <h2>提现合约余额</h2>
          <p class="mono-cell">{{ contractBalance?.withdrawal_contract || '-' }}</p>
        </div>
        <div class="contract-balance-list">
          <article v-for="item in contractBalance?.balances || []" :key="item.token" class="contract-balance-card">
            <span>{{ item.token }}</span>
            <strong>{{ formatAmount(item.balance) }}</strong>
            <p v-if="!item.configured" class="overview-note">未配置</p>
          </article>
          <p v-if="!balanceLoading && !(contractBalance?.balances || []).length" class="overview-empty">暂无已配置资产</p>
          <button class="contract-balance-button" :disabled="balanceLoading" @click="loadContractBalance">{{ balanceLoading ? '查询中...' : '查询余额' }}</button>
        </div>
      </section>
      <div v-if="balanceError" class="alert-box alert-box--error">{{ balanceError }}</div>

      
      <section class="overview-section">
        <h2>用户数据</h2>
        <div class="overview-grid overview-grid--three">
          <article v-for="item in userCards" :key="item.label" class="overview-card">
            <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
          </article>
        </div>
      </section>

      <section class="overview-section">
        <h2>资金统计</h2>
        <div class="fund-stat-list">
          <article v-for="group in fundGroups" :key="group.title" class="fund-stat-panel">
            <h3>{{ group.title }}</h3>
            <div class="overview-grid overview-grid--three">
              <div v-for="item in periodCards(group.values)" :key="item.label" class="fund-stat-card">
                <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="overview-section">
        <h2>全网等级数量</h2>
        <div class="overview-grid overview-grid--three">
          <article v-for="item in overview?.levels || []" :key="item.level" class="overview-card level-card">
            <span>L{{ item.level }}</span><strong>{{ formatInteger(item.count) }}</strong>
          </article>
        </div>
      </section>

      <section class="overview-section">
        <h2>平台剩余余额</h2>
        <div class="overview-grid overview-grid--tokens">
          <article v-for="item in overview?.platform_balances || []" :key="item.token" class="overview-card">
            <span>平台剩余 {{ item.token }} 余额</span><strong>{{ formatAmount(item.balance) }} <small>{{ item.token }}</small></strong>
          </article>
          <p v-if="!loading && !(overview?.platform_balances || []).length" class="overview-empty">暂无平台资产</p>
        </div>
      </section>
    </section>
  </ManageLayout>
</template>

<style scoped>
.overview-panel { display: flex; flex-direction: column; gap: 24px; }
.overview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.overview-toolbar { color: var(--muted); font-size: 13px; }
.overview-section { display: flex; flex-direction: column; gap: 14px; }
.overview-section h2 { margin: 0; font-size: 18px; }
.overview-grid { display: grid; gap: 14px; }
.overview-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.overview-grid--tokens { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.overview-card { display: flex; flex-direction: column; justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid rgba(142, 168, 241, 0.14); border-radius: 14px; background: rgba(255, 255, 255, 0.035); }
.overview-card span { color: var(--muted); font-size: 14px; }
.overview-card strong { color: var(--text); font-size: 28px; line-height: 1.15; overflow-wrap: anywhere; }
.overview-card small { color: #8fb3ff; font-size: 13px; font-weight: 600; }
.overview-note, .overview-empty { margin: 0; color: var(--muted); font-size: 12px; }
.overview-empty { padding: 18px; }
.fund-stat-list { display: flex; flex-direction: column; gap: 14px; }
.fund-stat-panel { display: flex; flex-direction: column; gap: 16px; padding: 20px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; background: rgba(19, 31, 53, 0.88); }
.fund-stat-panel h3 { margin: 0; font-size: 20px; }
.fund-stat-card { min-height: 95px; display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 15px; border-radius: 14px; background: rgba(6, 15, 31, 0.72); }
.fund-stat-card span { color: var(--muted); font-size: 14px; }
.fund-stat-card strong { color: var(--text); font-size: 25px; line-height: 1.1; overflow-wrap: anywhere; }
.level-card { min-height: 120px; justify-content: center; }
.contract-balance-panel { display: grid; grid-template-columns: minmax(270px, 1fr) auto; align-items: center; gap: 24px; padding: 16px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; background: rgba(19, 31, 53, 0.88); }
.contract-balance-copy { min-width: 0; }
.contract-balance-copy h2 { margin: 0 0 10px; font-size: 20px; }
.contract-balance-copy p { margin: 0; color: var(--muted); font-size: 13px; }
.contract-balance-list { display: flex; align-items: stretch; justify-content: flex-end; gap: 14px; flex-wrap: wrap; }
.contract-balance-card {  display: flex; flex-direction: column; justify-content: center; gap: 9px; padding: 12px 14px; border-radius: 12px; background: rgba(6, 15, 31, 0.72); }
.contract-balance-card span { color: var(--muted); font-size: 14px; }
.contract-balance-card strong { color: var(--text); font-size: 22px; line-height: 1; white-space: nowrap; }
.contract-balance-card .overview-note { color: #ff99bf; }
.contract-balance-button {  padding: 0 14px; border: 1px solid rgba(142, 168, 241, 0.17); border-radius: 12px; background: rgba(255, 255, 255, 0.045); color: var(--text); cursor: pointer; }
.contract-balance-button:hover:not(:disabled) { border-color: rgba(142, 168, 241, 0.34); background: rgba(255, 255, 255, 0.075); }
.contract-balance-button:disabled { opacity: 0.55; cursor: not-allowed; }
@media (max-width: 800px) { .overview-grid--three { grid-template-columns: 1fr; } }
@media (max-width: 1100px) { .contract-balance-panel { grid-template-columns: 1fr; } .contract-balance-list { justify-content: flex-start; } }
@media (max-width: 640px) { .overview-toolbar { align-items: flex-start; flex-direction: column; } .overview-toolbar .ghost-button { width: 100%; } .contract-balance-card, .contract-balance-button { width: 100%; min-width: 0; } }
</style>
