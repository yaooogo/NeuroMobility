<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';
import { formatFixedAmount } from '../lib/amount.js';

const query = reactive({ wallet: '', salary_month: '', level: '', page: 1, page_size: 20 });
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

function search() { query.page = 1; load(); }
function reset() { Object.assign(query, { wallet: '', salary_month: '', level: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
onMounted(load);
</script>

<template>
  <ManageLayout title="岗位工资记录" description="查询每月岗位工资的实际发放记录。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="钱包地址" @keyup.enter="search" />
        <input v-model="query.salary_month" class="text-input text-input--inline" type="month" aria-label="工资月份" />
        <select v-model="query.level" class="text-input text-input--inline"><option value="">全部等级</option><option value="1">1级</option><option value="2">2级</option><option value="3">3级</option></select>
        <button class="primary-button" type="button" @click="search">查询</button><button class="ghost-button" type="button" @click="reset">重置</button>
      </div></div>
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
