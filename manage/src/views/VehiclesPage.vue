<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post, postForm } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const languageOptions = [
  { value: 'zh', label: '中文' }, { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' }, { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' }, { value: 'th', label: 'ไทย' },
  { value: 'hi', label: 'हिन्दी' }, { value: 'vi', label: 'Tiếng Việt' }
];
const languageLabels = Object.fromEntries(languageOptions.map(item => [item.value, item.label]));
const query = reactive({ keyword: '', language: '', status: '', page: 1, page_size: 20 });
const form = reactive({ id: 0, language: 'zh', name: '', model: '', image: '', tags: [], sort: 0, status: 1 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(0);
const imageUploading = ref(false);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');

function newTag() {
  return { label: '', background_color: '#ead7fa', text_color: '#8c3bd2' };
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map(tag => ({
    label: tag.label || '',
    background_color: tag.background_color || '#ead7fa',
    text_color: tag.text_color || '#8c3bd2'
  })) : [];
}

async function load() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/vehicle/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function openCreate() {
  Object.assign(form, { id: 0, language: query.language || 'zh', name: '', model: '', image: '', tags: [newTag()], sort: 0, status: 1 });
  modalError.value = ''; modal.value = true;
}
function edit(row) {
  Object.assign(form, { id: row.id, language: row.language || 'zh', name: row.name, model: row.model, image: row.image, tags: normalizeTags(row.tags), sort: row.sort, status: row.status });
  modalError.value = ''; modal.value = true;
}
function addTag() {
  if (form.tags.length >= 20) { modalError.value = '最多添加 20 个标签'; return; }
  form.tags.push(newTag());
}
function removeTag(index) { form.tags.splice(index, 1); }

async function save() {
  if (saving.value) return;
  if (!form.name.trim()) { modalError.value = '请输入车辆名称'; return; }
  saving.value = true; modalError.value = '';
  try {
    await post(form.id ? '/vehicle/update' : '/vehicle/create', { ...form, tags: form.tags.filter(tag => tag.label.trim()) });
    modal.value = false;
    success.value = form.id ? '车辆已更新' : '车辆已创建';
    await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确定删除车辆「${row.name}」吗？`)) return;
  deleting.value = row.id; error.value = '';
  try {
    await post('/vehicle/delete', { id: row.id });
    success.value = '车辆已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) { error.value = err.message; }
  finally { deleting.value = 0; }
}

async function uploadImage(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    modalError.value = '图片仅支持 JPG、PNG、GIF 或 WebP'; input.value = ''; return;
  }
  imageUploading.value = true; modalError.value = '';
  try {
    const data = new FormData();
    data.append('image', file);
    const result = await postForm('/vehicle/upload-image', data);
    form.image = result.url;
  } catch (err) { modalError.value = err.message || '图片上传失败'; }
  finally { imageUploading.value = false; input.value = ''; }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="车辆详情" description="管理 dapp 多语言车辆信息和自定义标签样式。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline" placeholder="搜索车辆名称或型号" @keyup.enter="search" />
        <select v-model="query.language" class="text-input text-input--inline"><option value="">全部语言</option><option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'vehicles-create')" class="primary-button" @click="openCreate">新增车辆</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 1260px">
        <thead><tr><th>ID</th><th>语言</th><th>图片</th><th>名称 / 型号</th><th>标签</th><th>排序</th><th>状态</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'vehicles-update') || can(user, 'vehicles-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'vehicles-update') || can(user, 'vehicles-delete') ? 10 : 9" class="empty-cell">{{ loading ? '正在加载...' : '暂无车辆' }}</td></tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td><td>{{ languageLabels[row.language] || row.language }}</td>
            <td><img v-if="row.image" class="vehicle-image" :src="row.image" :alt="row.name" /><span v-else>-</span></td>
            <td><strong>{{ row.name }}</strong><small class="vehicle-model">{{ row.model || '-' }}</small></td>
            <td><div class="tag-preview"><span v-for="(tag, index) in row.tags" :key="index" :style="{ backgroundColor: tag.background_color, color: tag.text_color }">{{ tag.label }}</span></div></td>
            <td>{{ row.sort }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td>
            <td>{{ row.created_at || '-' }}</td><td>{{ row.updated_at || '-' }}</td>
            <td v-if="can(user, 'vehicles-update') || can(user, 'vehicles-delete')" class="actions-cell"><button v-if="can(user, 'vehicles-update')" class="table-button" @click="edit(row)">编辑</button><button v-if="can(user, 'vehicles-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td>
          </tr>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>

    <div v-if="modal" class="modal-mask" @click="!saving && !imageUploading && (modal = false)"><section class="modal-card vehicle-modal" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑车辆' : '新增车辆' }}</h2><button class="ghost-button" :disabled="saving || imageUploading" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <div class="vehicle-form-grid">
        <label class="field-block"><span>语言</span><select v-model="form.language" class="text-input"><option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label class="field-block"><span>车辆名称</span><input v-model.trim="form.name" class="text-input" maxlength="255" placeholder="例如 Toyota Alphard" /></label>
        <label class="field-block"><span>车辆型号</span><input v-model.trim="form.model" class="text-input" maxlength="255" placeholder="例如 2.5 Executive Lounge" /></label>
      </div>
      <label class="field-block"><span>车辆图片</span><input class="text-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" :disabled="imageUploading" @change="uploadImage" /><small>{{ imageUploading ? '正在上传...' : '支持 JPG、PNG、GIF、WebP' }}</small></label>
      <div v-if="form.image" class="vehicle-image-preview"><img :src="form.image" alt="车辆图片预览" /><button class="table-button table-button--danger" type="button" @click="form.image = ''">移除图片</button></div>
      <div class="vehicle-form-grid vehicle-form-grid--two">
        <label class="field-block"><span>排序（越小越靠前）</span><input v-model.number="form.sort" class="text-input" type="number" min="0" step="1" /></label>
        <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      </div>
      <section class="tag-editor">
        <div class="tag-editor__head"><strong>车辆标签</strong><button class="table-button" type="button" @click="addTag">添加标签</button></div>
        <p v-if="!form.tags.length" class="tag-empty">暂无标签，可点击“添加标签”。</p>
        <div v-for="(tag, index) in form.tags" :key="index" class="tag-row">
          <input v-model.trim="tag.label" class="text-input" maxlength="80" placeholder="标签文字" />
          <label><span>背景色</span><input v-model="tag.background_color" type="color" /></label>
          <label><span>字体色</span><input v-model="tag.text_color" type="color" /></label>
          <span class="tag-live" :style="{ backgroundColor: tag.background_color, color: tag.text_color }">{{ tag.label || '标签预览' }}</span>
          <button class="table-button table-button--danger" type="button" @click="removeTag(index)">删除</button>
        </div>
      </section>
      <button class="submit-button" :disabled="saving || imageUploading" @click="save">{{ saving ? '保存中...' : '保存车辆' }}</button>
    </section></div>
  </ManageLayout>
</template>

<style scoped>
.vehicle-image { width: 88px; height: 64px; border-radius: 9px; object-fit: cover; }
.vehicle-model { display: block; margin-top: 5px; color: #8d8691; }
.tag-preview { max-width: 360px; display: flex; flex-wrap: wrap; gap: 6px; }
.tag-preview span, .tag-live { padding: 5px 10px; border-radius: 14px; font-size: 11px; white-space: nowrap; }
.vehicle-modal { width: min(920px, calc(100vw - 32px)); }
.vehicle-form-grid { display: grid; grid-template-columns: 180px 1fr 1fr; gap: 14px; }
.vehicle-form-grid--two { grid-template-columns: 1fr 1fr; }
.vehicle-image-preview { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.vehicle-image-preview img { width: 180px; height: 120px; border-radius: 12px; object-fit: cover; }
.tag-editor { margin: 6px 0 20px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; }
.tag-editor__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tag-row { display: grid; grid-template-columns: minmax(180px,1fr) 92px 92px auto auto; align-items: end; gap: 10px; margin-top: 10px; }
.tag-row label { display: grid; gap: 5px; color: #77707e; font-size: 12px; }
.tag-row input[type="color"] { width: 100%; height: 38px; padding: 2px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.tag-live { align-self: center; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.tag-empty { color: #8d8691; font-size: 13px; }
@media (max-width: 760px) {
  .vehicle-form-grid, .vehicle-form-grid--two { grid-template-columns: 1fr; }
  .tag-row { grid-template-columns: 1fr 1fr; }
  .tag-row > .text-input { grid-column: 1 / -1; }
}
</style>
