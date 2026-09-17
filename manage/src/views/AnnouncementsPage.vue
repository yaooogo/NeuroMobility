<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ keyword: '', page: 1, page_size: 20 });
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
const form = reactive({ id: 0, title: '', content: '' });

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/announcement/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function openCreate() {
  Object.assign(form, { id: 0, title: '', content: '' });
  modalError.value = ''; modal.value = true;
}
function edit(row) {
  Object.assign(form, { id: row.id, title: row.title, content: row.content });
  modalError.value = ''; modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.title.trim()) { modalError.value = '请输入公告标题'; return; }
  if (!form.content.trim()) { modalError.value = '请输入公告内容'; return; }
  saving.value = true; modalError.value = '';
  try {
    await post(form.id ? '/announcement/update' : '/announcement/create', form);
    modal.value = false;
    success.value = form.id ? '公告已更新' : '公告已创建';
    await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确定删除公告「${row.title}」吗？`)) return;
  deleting.value = row.id; error.value = '';
  try {
    await post('/announcement/delete', { id: row.id });
    success.value = '公告已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) { error.value = err.message; }
  finally { deleting.value = 0; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="公告管理" description="管理公告标题和内容。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="搜索标题或内容" @keyup.enter="search" />
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'announcements-create')" class="primary-button" @click="openCreate">新增公告</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 900px">
        <thead><tr><th>ID</th><th>标题</th><th>内容</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'announcements-update') || can(user, 'announcements-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'announcements-update') || can(user, 'announcements-delete') ? 6 : 5" class="empty-cell">{{ loading ? '正在加载...' : '暂无公告' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td><strong>{{ row.title }}</strong></td><td class="announcement-content">{{ row.content }}</td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td><td v-if="can(user, 'announcements-update') || can(user, 'announcements-delete')" class="actions-cell"><button v-if="can(user, 'announcements-update')" class="table-button" @click="edit(row)">编辑</button><button v-if="can(user, 'announcements-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑公告' : '新增公告' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>标题</span><input v-model.trim="form.title" class="text-input" maxlength="255" placeholder="请输入公告标题" /></label>
      <label class="field-block"><span>内容</span><textarea v-model.trim="form.content" class="text-input announcement-textarea" rows="12" placeholder="请输入公告内容"></textarea></label>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存公告' }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.announcement-content { max-width: 520px; white-space: pre-wrap; word-break: break-word; }
.announcement-textarea { min-height: 240px; resize: vertical; }
</style>
