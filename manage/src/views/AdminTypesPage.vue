<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ name: '', status: '', page: 1, page_size: 10 });
const list = ref([]);
const total = ref(0);
const lastPage = ref(1);
const permissions = ref([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(0);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({ id: 0, name: '', sort: 0, status: 1, permissions: [] });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await post('/admin-type/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

async function loadPermissions() {
  try {
    const data = await post('/admin-type/permission-options');
    permissions.value = (data.items || []).filter(item => can(user, item.key) && !item.superOnly);
  } catch (err) { error.value = err.message; }
}

function openCreate() {
  Object.assign(form, { id: 0, name: '', sort: 0, status: 1, permissions: [] });
  modalError.value = '';
  modal.value = true;
}

function openEdit(row) {
  Object.assign(form, { id: row.id, name: row.name, sort: row.sort, status: row.status, permissions: [...(row.permissions || [])] });
  modalError.value = '';
  modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.name.trim()) { modalError.value = '请输入类型名称'; return; }
  saving.value = true;
  modalError.value = '';
  try {
    await post('/admin-type/save', form);
    modal.value = false;
    success.value = form.id ? '类型已更新' : '类型已新增';
    await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确定删除管理员类型「${row.name}」吗？`)) return;
  deleting.value = row.id;
  error.value = '';
  try {
    await post('/admin-type/delete', { id: row.id });
    success.value = '类型已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) { error.value = err.message; }
  finally { deleting.value = 0; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function permissionText(row) {
  return (row.permissions || []).map(key => permissions.value.find(item => item.key === key)?.label || key).join('、') || '未分配';
}

onMounted(() => { load(); loadPermissions(); });
</script>

<template>
  <ManageLayout title="管理员类型" description="配置权限模板，创建管理员时可选择类型。">
    <section class="panel-card">
      <div class="toolbar">
        <div class="toolbar-group">
          <input v-model.trim="query.name" class="text-input text-input--inline" placeholder="搜索类型名称" @keyup.enter="search" />
          <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
          <button class="primary-button" type="button" @click="search">查询</button>
        </div>
        <button v-if="can(user, 'admin-types-create')" class="primary-button" type="button" @click="openCreate">新增类型</button>
      </div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 850px"><thead><tr><th>ID</th><th>名称</th><th>权限</th><th>排序</th><th>状态</th><th>创建时间</th><th v-if="can(user, 'admin-types-update') || can(user, 'admin-types-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'admin-types-update') || can(user, 'admin-types-delete') ? 7 : 6" class="empty-cell">{{ loading ? '正在加载...' : '暂无管理员类型' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td>{{ row.name }}</td><td class="permission-cell">{{ permissionText(row) }}</td><td>{{ row.sort }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.created_at || '-' }}</td><td v-if="can(user, 'admin-types-update') || can(user, 'admin-types-delete')" class="actions-cell"><button v-if="can(user, 'admin-types-update')" class="table-button" @click="openEdit(row)">编辑</button><button v-if="can(user, 'admin-types-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
        </tbody></table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card" style="width: min(100%, 600px)" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑类型' : '新增类型' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>类型名称</span><input v-model.trim="form.name" class="text-input" maxlength="64" placeholder="例如：运营管理员" /></label>
      <label class="field-block"><span>排序</span><input v-model.number="form.sort" class="text-input" type="number" min="0" /></label>
      <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      <section class="permission-panel"><div class="permission-panel__head"><span>功能权限</span><div class="permission-panel__actions"><button class="table-button" @click="form.permissions = permissions.map(item => item.key)">全选</button><button class="table-button" @click="form.permissions = []">清空</button></div></div><div class="permission-grid"><label v-for="item in permissions" :key="item.key" class="permission-option"><input v-model="form.permissions" type="checkbox" :value="item.key" /><span>{{ item.label }}</span></label></div></section>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
    </section></div>
  </ManageLayout>
</template>
