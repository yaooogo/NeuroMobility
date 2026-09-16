<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';

const props = defineProps({ frozen: { type: Boolean, default: false } });
const query = reactive({ wallet: '', token: '', type: '', scene: '', start_date: '', end_date: '', page: 1, page_size: 10 });
const list = ref([]); const tokenOptions = ref([]); const total = ref(0); const lastPage = ref(1);
const loading = ref(false); const error = ref('');
const title = () => props.frozen ? '冻结资产变更记录' : '资产变更记录';
const endpoint = () => props.frozen ? '/user-frozen-asset-log/list' : '/user-asset-log/list';

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post(endpoint(), query);
    list.value = data.items || []; tokenOptions.value = data.token_options || [];
    total.value = Number(data.total || 0); lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; list.value = []; }
  finally { loading.value = false; }
}
function search() {
  if (query.start_date && query.end_date && query.start_date > query.end_date) { error.value = '结束日期不能早于开始日期'; return; }
  query.page = 1; load();
}
function reset() { Object.assign(query, { wallet: '', token: '', type: '', scene: '', start_date: '', end_date: '', page: 1 }); load(); }
function changePage(page) { query.page = page; load(); }
function typeLabel(type) { return type === 'in' ? '转入' : type === 'out' ? '转出' : '-'; }
watch(() => props.frozen, () => { query.page = 1; load(); });
onMounted(load);
</script>

<template>
  <ManageLayout :title="title()" :description="frozen ? '查看用户冻结资产的增减流水。' : '查看用户可用资产的增减流水。'">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.wallet" class="text-input text-input--inline" placeholder="钱包地址" @keyup.enter="search" />
        <select v-model="query.token" class="text-input text-input--inline"><option value="">全部资产</option><option v-for="item in tokenOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <select v-model="query.type" class="text-input text-input--inline"><option value="">全部类型</option><option value="in">转入</option><option value="out">转出</option></select>
        <input v-model.trim="query.scene" class="text-input text-input--inline" placeholder="业务场景" @keyup.enter="search" />
        <input v-model="query.start_date" class="text-input text-input--inline" type="date" aria-label="开始日期" />
        <input v-model="query.end_date" class="text-input text-input--inline" type="date" aria-label="结束日期" />
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1350px">
        <thead><tr><th>ID</th><th>业务单号</th><th>钱包地址</th><th>资产</th><th>变动数量</th><th>变动前</th><th>变动后</th><th>场景</th><th>原因</th><th>类型</th><th>创建时间</th><th>更新时间</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="12" class="empty-cell">{{ loading ? '正在加载...' : `暂无${title()}` }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td class="mono-cell">{{ row.biz_id || '-' }}</td><td class="mono-cell">{{ row.wallet || '-' }}</td><td>{{ row.token || '-' }}</td><td class="mono-cell">{{ row.balance }}</td><td class="mono-cell">{{ row.before_balance }}</td><td class="mono-cell">{{ row.after_balance }}</td><td>{{ row.scene || '-' }}</td><td>{{ row.reason || '-' }}</td><td><span class="status-badge" :class="row.type === 'in' ? 'status-badge--on' : 'status-badge--off'">{{ typeLabel(row.type) }}</span></td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
  </ManageLayout>
</template>
