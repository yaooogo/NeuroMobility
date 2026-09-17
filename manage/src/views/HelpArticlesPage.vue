<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ keyword: '', status: '', page: 1, page_size: 20 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(0);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({ id: 0, title: '', content: '', sort: 0, status: 1 });

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/help-article/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function openCreate() {
  Object.assign(form, { id: 0, title: '', content: '', sort: 0, status: 1 });
  modalError.value = ''; modal.value = true;
}
function edit(row) {
  Object.assign(form, { id: row.id, title: row.title, content: row.content, sort: row.sort, status: row.status });
  modalError.value = ''; modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.title.trim()) { modalError.value = '请输入帮助文章标题'; return; }
  if (!form.content.trim()) { modalError.value = '请输入帮助文章内容'; return; }
  saving.value = true; modalError.value = '';
  try {
    await post(form.id ? '/help-article/update' : '/help-article/create', form);
    modal.value = false;
    success.value = form.id ? '帮助文章已更新' : '帮助文章已创建';
    await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确定删除帮助文章「${row.title}」吗？`)) return;
  deleting.value = row.id; error.value = '';
  try {
    await post('/help-article/delete', { id: row.id });
    success.value = '帮助文章已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) { error.value = err.message; }
  finally { deleting.value = 0; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="帮助中心" description="管理帮助文章的标题、内容、排序和状态。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="搜索文章标题或内容" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'help-articles-create')" class="primary-button" @click="openCreate">新增帮助文章</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1000px">
        <thead><tr><th>ID</th><th>标题</th><th>内容</th><th>排序</th><th>状态</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'help-articles-update') || can(user, 'help-articles-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'help-articles-update') || can(user, 'help-articles-delete') ? 8 : 7" class="empty-cell">{{ loading ? '正在加载...' : '暂无帮助文章' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td><strong>{{ row.title }}</strong></td><td class="help-content">{{ row.content }}</td><td>{{ row.sort }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td><td v-if="can(user, 'help-articles-update') || can(user, 'help-articles-delete')" class="actions-cell"><button v-if="can(user, 'help-articles-update')" class="table-button" @click="edit(row)">编辑</button><button v-if="can(user, 'help-articles-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑帮助文章' : '新增帮助文章' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>标题</span><input v-model.trim="form.title" class="text-input" maxlength="255" placeholder="请输入帮助文章标题" /></label>
      <div class="help-form-grid">
        <label class="field-block"><span>排序（越小越靠前）</span><input v-model.number="form.sort" class="text-input" type="number" min="0" step="1" /></label>
        <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      </div>
      <label class="field-block"><span>内容</span><textarea v-model.trim="form.content" class="text-input help-textarea" rows="14" placeholder="请输入帮助文章内容"></textarea></label>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存文章' }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.help-content { max-width: 560px; white-space: pre-wrap; word-break: break-word; }
.help-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.help-textarea { min-height: 280px; resize: vertical; }
@media (max-width: 640px) { .help-form-grid { grid-template-columns: 1fr; } }
</style>
