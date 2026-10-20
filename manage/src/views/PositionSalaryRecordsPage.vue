<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import TeamWalletExclusion from '../components/TeamWalletExclusion.vue';
import { post, postBlob } from '../lib/http.js';
import { getUser } from '../lib/auth.js';
import { can } from '../lib/permissions.js';
import { formatFixedAmount } from '../lib/amount.js';

const user = getUser();
const query = reactive({ wallet: '', search_team: 0, exclude_wallets: '', salary_month: '', level: '', page: 1, page_size: 20 });
const exporting = ref(false);
const list = ref([]); const total = ref(0); const lastPage = ref(1); const loading = ref(false); const error = ref('');

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/position-salary-record/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message || '加载岗位工资记录失败'; list.value = []; }
  finally { loading.value = false; }
}

async function exportCsv() {
  if (exporting.value) return;
  exporting.value = true; error.value = '';
  try {
    const { blob, filename } = await postBlob('/position-salary-record/export', { ...query });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename || `position-salary-records-${Date.now()}.csv`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  } catch (err) { error.value = err.message || '导出岗位工资记录失败'; }
  finally { exporting.value = false; }
}

function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', search_team: 0, exclude_wallets: '', salary_month: '', level: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
onMounted(load);
</script>

<template>
  <ManageLayout title="岗位工资记录" description="查询每月岗位工资的实际发放记录。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" :placeholder="query.search_team ? '上级钱包地址（搜索全部团队）' : '钱包地址'" @keyup.enter="search" />
        <label class="inline-check"><input v-model.number="query.search_team" type="checkbox" :true-value="1" :false-value="0" /><span>搜索团队</span></label>
        <TeamWalletExclusion v-if="query.search_team" v-model="query.exclude_wallets" />
        <input v-model="query.salary_month" class="text-input text-input--inline" type="month" aria-label="工资月份" />
        <select v-model="query.level" class="text-input text-input--inline"><option value="">全部等级</option><option value="1">1级</option><option value="2">2级</option><option value="3">3级</option></select>
        <button class="primary-button" type="button" @click="search">查询</button><button class="ghost-button" type="button" @click="reset">重置</button>
      </div><button v-if="can(user, 'position-salary-records-export')" class="ghost-button" type="button" :disabled="exporting" @click="exportCsv">{{ exporting ? '导出中...' : '导出 CSV' }}</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1150px">
        <thead><tr><th>ID</th><th>工资流水号</th><th>工资月份</th><th>钱包地址</th><th>发放等级</th><th>工资金额</th><th>币种</th><th>发放时间</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="8" class="empty-cell">{{ loading ? '正在加载...' : '暂无岗位工资记录' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.salary_id }}</td><td>{{ row.salary_month }}</td><td class="mono-cell">{{ row.wallet }}</td><td>{{ row.level }}级</td><td>{{ formatFixedAmount(row.amount) }} U</td><td>{{ row.token }}</td><td>{{ row.paid_at || '-' }}</td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
  </ManageLayout>
</template>

<style scoped>
.inline-check { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(142, 168, 241, 0.16); border-radius: 14px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.inline-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); }
</style>
