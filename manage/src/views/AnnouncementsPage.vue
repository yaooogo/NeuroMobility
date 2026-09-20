<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post, postForm } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'th', label: 'ไทย' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'vi', label: 'Tiếng Việt' }
];
const languageLabels = Object.fromEntries(languageOptions.map(item => [item.value, item.label]));
const query = reactive({ keyword: '', language: '', status: '', page: 1, page_size: 20 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(0);
const coverUploading = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({ id: 0, language: 'zh', title: '', cover: '', content: '', sort: 0, status: 1 });

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
  Object.assign(form, { id: 0, language: 'zh', title: '', cover: '', content: '', sort: 0, status: 1 });
  modalError.value = ''; modal.value = true;
}
function edit(row) {
  Object.assign(form, { id: row.id, language: row.language || 'zh', title: row.title, cover: row.cover, content: row.content, sort: row.sort, status: row.status });
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

async function uploadCover(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    modalError.value = '封面仅支持 JPG、PNG、GIF 或 WebP 图片';
    input.value = '';
    return;
  }
  coverUploading.value = true; modalError.value = '';
  try {
    const data = new FormData();
    data.append('cover', file);
    const result = await postForm('/announcement/upload-cover', data);
    form.cover = result.url;
  } catch (err) { modalError.value = err.message || '封面上传失败'; }
  finally { coverUploading.value = false; input.value = ''; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="公告管理" description="管理公告封面、标题、内容、排序和状态。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="搜索标题或内容" @keyup.enter="search" />
        <select v-model="query.language" class="text-input text-input--inline"><option value="">全部语言</option><option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'announcements-create')" class="primary-button" @click="openCreate">新增公告</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1230px">
        <thead><tr><th>ID</th><th>语言</th><th>封面</th><th>标题</th><th>内容</th><th>排序</th><th>状态</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'announcements-update') || can(user, 'announcements-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'announcements-update') || can(user, 'announcements-delete') ? 10 : 9" class="empty-cell">{{ loading ? '正在加载...' : '暂无公告' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td>{{ languageLabels[row.language] || row.language }}</td><td><img v-if="row.cover" class="announcement-cover" :src="row.cover" alt="公告封面" /><span v-else>-</span></td><td><strong>{{ row.title }}</strong></td><td class="announcement-content">{{ row.content }}</td><td>{{ row.sort }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td><td v-if="can(user, 'announcements-update') || can(user, 'announcements-delete')" class="actions-cell"><button v-if="can(user, 'announcements-update')" class="table-button" @click="edit(row)">编辑</button><button v-if="can(user, 'announcements-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && !coverUploading && (modal = false)"><section class="modal-card operation-log-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑公告' : '新增公告' }}</h2><button class="ghost-button" :disabled="saving || coverUploading" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <div class="announcement-form-grid">
        <label class="field-block"><span>语言</span><select v-model="form.language" class="text-input"><option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label class="field-block"><span>标题</span><input v-model.trim="form.title" class="text-input" maxlength="255" placeholder="请输入公告标题" /></label>
      </div>
      <label class="field-block"><span>封面图片</span><input class="text-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" :disabled="coverUploading" @change="uploadCover" /><small>{{ coverUploading ? '正在上传...' : '支持 JPG、PNG、GIF、WebP，大小不超过系统上传限制' }}</small></label>
      <div v-if="form.cover" class="announcement-cover-preview"><img :src="form.cover" alt="封面预览" /><button class="table-button table-button--danger" type="button" :disabled="coverUploading" @click="form.cover = ''">移除封面</button></div>
      <div class="announcement-form-grid">
        <label class="field-block"><span>排序（越小越靠前）</span><input v-model.number="form.sort" class="text-input" type="number" min="0" step="1" /></label>
        <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      </div>
      <label class="field-block"><span>内容</span><textarea v-model.trim="form.content" class="text-input announcement-textarea" rows="12" placeholder="请输入公告内容"></textarea></label>
      <button class="submit-button" :disabled="saving || coverUploading" @click="save">{{ saving ? '保存中...' : (coverUploading ? '封面上传中...' : '保存公告') }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.announcement-content { max-width: 520px; white-space: pre-wrap; word-break: break-word; }
.announcement-cover { width: 96px; height: 60px; border-radius: 8px; object-fit: cover; }
.announcement-cover-preview { display: grid; place-items: center; gap: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 14px; }
.announcement-cover-preview img { max-width: 100%; max-height: 240px; border-radius: 10px; object-fit: contain; }
.announcement-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.announcement-textarea { min-height: 240px; resize: vertical; }
@media (max-width: 640px) { .announcement-form-grid { grid-template-columns: 1fr; } }
</style>
