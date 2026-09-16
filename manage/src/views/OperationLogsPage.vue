<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';

const query = reactive({
  admin_username: '',
  path: '',
  response_code: '',
  start_date: '',
  end_date: '',
  page: 1,
  page_size: 10
});
const logs = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const error = ref('');
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detail = ref(null);

const paramsText = computed(() => {
  const params = detail.value?.request_params;
  if (params == null) return '{}';
  return typeof params === 'string' ? params : JSON.stringify(params, null, 2);
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await post('/admin-operation-log/list', query);
    logs.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) {
    error.value = err.message || '加载操作日志失败';
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

function search() {
  if (query.start_date && query.end_date && query.start_date > query.end_date) {
    error.value = '结束日期不能早于开始日期';
    return;
  }
  query.page = 1;
  load();
}

function reset() {
  Object.assign(query, { admin_username: '', path: '', response_code: '', start_date: '', end_date: '', page: 1 });
  load();
}

function changePage(page) {
  query.page = page;
  load();
}

async function openDetail(row) {
  detail.value = row;
  detailError.value = '';
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detail.value = await post('/admin-operation-log/detail', { id: row.id });
  } catch (err) {
    detailError.value = err.message || '加载日志详情失败';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detailVisible.value = false;
  detail.value = null;
}

onMounted(load);
</script>

<template>
  <ManageLayout title="操作日志" description="查看后台管理员的修改记录、请求参数和执行结果。">
    <section class="panel-card">
      <div class="toolbar">
        <div class="toolbar-group">
          <input v-model.trim="query.admin_username" class="text-input text-input--inline" type="text" placeholder="管理员账号" @keyup.enter="search" />
          <input v-model.trim="query.path" class="text-input text-input--inline" type="text" placeholder="请求路由" @keyup.enter="search" />
          <select v-model="query.response_code" class="text-input text-input--inline">
            <option value="">全部结果</option>
            <option value="0">成功</option>
            <option value="400">失败 400</option>
            <option value="403">失败 403</option>
            <option value="-1">异常</option>
          </select>
          <input v-model="query.start_date" class="text-input text-input--inline" type="date" aria-label="开始日期" />
          <input v-model="query.end_date" class="text-input text-input--inline" type="date" aria-label="结束日期" />
          <button class="primary-button" type="button" @click="search">查询</button>
          <button class="ghost-button" type="button" @click="reset">重置</button>
        </div>
      </div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap">
        <table class="data-table" style="min-width: 1100px">
          <thead><tr><th>ID</th><th>管理员</th><th>请求</th><th>结果</th><th>IP</th><th>耗时</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-if="loading || !logs.length"><td colspan="8" class="empty-cell">{{ loading ? '正在加载...' : '暂无操作日志' }}</td></tr>
            <tr v-for="row in logs" :key="row.id">
              <td>{{ row.id }}</td>
              <td><strong>{{ row.admin_username || '-' }}</strong><div class="muted-text">ID: {{ row.admin_id || '-' }}</div></td>
              <td><strong>{{ row.method }} {{ row.path }}</strong><div v-if="row.response_message" class="muted-text">{{ row.response_message }}</div></td>
              <td><span class="status-badge" :class="row.response_code === 0 ? 'status-badge--on' : 'status-badge--off'">{{ row.response_code === 0 ? '成功' : `失败 ${row.response_code}` }}</span></td>
              <td>{{ row.ip || '-' }}</td>
              <td>{{ row.duration_ms }} ms</td>
              <td>{{ row.created_at || '-' }}</td>
              <td><button class="table-button" type="button" @click="openDetail(row)">详情</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="detailVisible" class="modal-mask" @click="closeDetail">
      <section class="modal-card operation-log-modal" @click.stop>
        <div class="modal-head"><h2>操作日志详情</h2><button class="ghost-button" type="button" @click="closeDetail">关闭</button></div>
        <div v-if="detailError" class="alert-box alert-box--error">{{ detailError }}</div>
        <div v-if="detailLoading" class="muted-text">正在加载...</div>
        <div v-if="detail" class="detail-grid">
          <div class="detail-item"><span>管理员</span><strong>{{ detail.admin_username || '-' }}（ID: {{ detail.admin_id }}）</strong></div>
          <div class="detail-item"><span>请求</span><strong>{{ detail.method }} {{ detail.path }}</strong></div>
          <div class="detail-item"><span>响应</span><strong>{{ detail.response_code === 0 ? '成功' : `失败 ${detail.response_code}` }} {{ detail.response_message }}</strong></div>
          <div class="detail-item"><span>IP / 耗时</span><strong>{{ detail.ip || '-' }} / {{ detail.duration_ms }} ms</strong></div>
          <div class="detail-item"><span>时间</span><strong>{{ detail.created_at || '-' }}</strong></div>
          <div class="detail-item"><span>User-Agent</span><strong>{{ detail.user_agent || '-' }}</strong></div>
          <div class="detail-item"><span>请求参数</span><pre class="json-preview">{{ paramsText }}</pre></div>
        </div>
      </section>
    </div>
  </ManageLayout>
</template>
