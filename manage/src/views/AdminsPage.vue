<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const query = reactive({ username: '', status: '', page: 1, page_size: 10 });
const list = ref([]);
const types = ref([]);
const permissions = ref([]);
const total = ref(0);
const lastPage = ref(1);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(0);
const modal = ref(false);
const error = ref('');
const modalError = ref('');
const success = ref('');
const form = reactive({ id: 0, username: '', password: '', status: 1, is_super: 0, admin_type_id: 0, permissions: [] });
const visiblePermissions = computed(() => permissions.value.filter(item => can(user, item.key) && !item.superOnly));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await post('/admin/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}

async function loadOptions() {
  try {
    const [typeData, permissionData] = await Promise.all([
      post('/admin-type/options'),
      post('/admin-type/permission-options')
    ]);
    types.value = typeData.items || [];
    permissions.value = permissionData.items || [];
  } catch (err) { error.value = err.message; }
}

function openCreate() {
  Object.assign(form, { id: 0, username: '', password: '', status: 1, is_super: 0, admin_type_id: 0, permissions: [] });
  modalError.value = '';
  modal.value = true;
}

function openEdit(row) {
  Object.assign(form, { id: row.id, username: row.username, password: '', status: row.status, is_super: row.is_super, admin_type_id: row.admin_type_id, permissions: [...(row.permissions || [])] });
  modalError.value = '';
  modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.username.trim()) { modalError.value = '请输入账号'; return; }
  if (!form.id && form.password.length < 6) { modalError.value = '密码至少 6 位'; return; }
  if (form.password && form.password.length < 6) { modalError.value = '密码至少 6 位'; return; }
  saving.value = true;
  modalError.value = '';
  try {
    const payload = { ...form, permissions: form.admin_type_id || form.is_super ? [] : form.permissions };
    if (!payload.password) delete payload.password;
    await post(form.id ? '/admin/update' : '/admin/create', payload);
    modal.value = false;
    success.value = form.id ? '管理员已更新' : '管理员已新增';
    await load();
  } catch (err) { modalError.value = err.message; }
  finally { saving.value = false; }
}

async function remove(row) {
  if (!window.confirm(`确定删除管理员「${row.username}」吗？`)) return;
  deleting.value = row.id;
  error.value = '';
  try {
    await post('/admin/delete', { id: row.id });
    success.value = '管理员已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) { error.value = err.message; }
  finally { deleting.value = 0; }
}

function search() { query.page = 1; load(); }
function changePage(page) { query.page = page; load(); }
function permissionText(row) {
  if (row.is_super === 1) return '全部权限';
  const type = types.value.find(item => item.id === row.admin_type_id);
  if (type) return `继承类型：${type.name}`;
  return (row.permissions || []).map(key => permissions.value.find(item => item.key === key)?.label || key).join('、') || '未分配';
}

onMounted(() => { load(); loadOptions(); });
</script>

<template>
  <ManageLayout title="管理员" description="管理后台账号、状态和权限。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.username" class="text-input text-input--inline" placeholder="搜索管理员账号" @keyup.enter="search" />
        <select v-model="query.status" class="text-input text-input--inline"><option value="">全部状态</option><option value="1">启用</option><option value="0">禁用</option></select>
        <button class="primary-button" @click="search">查询</button>
      </div><button v-if="can(user, 'admins-create')" class="primary-button" @click="openCreate">新增管理员</button></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <div class="table-wrap"><table class="data-table" style="min-width: 900px"><thead><tr><th>ID</th><th>账号</th><th>类型 / 权限</th><th>状态</th><th>创建时间</th><th v-if="can(user, 'admins-update') || can(user, 'admins-delete')">操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td :colspan="can(user, 'admins-update') || can(user, 'admins-delete') ? 6 : 5" class="empty-cell">{{ loading ? '正在加载...' : '暂无管理员' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td>{{ row.username }} <span v-if="row.is_super === 1" class="status-badge status-badge--on">超级管理员</span></td><td class="permission-cell">{{ permissionText(row) }}</td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.created_at || '-' }}</td><td v-if="can(user, 'admins-update') || can(user, 'admins-delete')" class="actions-cell"><button v-if="can(user, 'admins-update')" class="table-button" :disabled="row.is_super === 1 && user.is_super !== 1" @click="openEdit(row)">编辑</button><button v-if="can(user, 'admins-delete') && user.is_super === 1 && row.is_super !== 1 && row.id !== user.id" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
        </tbody></table></div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>
    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)"><section class="modal-card" style="width: min(100%, 600px)" @click.stop>
      <div class="modal-head"><h2>{{ form.id ? '编辑管理员' : '新增管理员' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
      <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
      <label class="field-block"><span>账号</span><input v-model.trim="form.username" class="text-input" maxlength="64" autocomplete="off" /></label>
      <label class="field-block"><span>{{ form.id ? '新密码（留空则不修改）' : '密码（至少 6 位）' }}</span><input v-model="form.password" class="text-input" type="password" autocomplete="new-password" /></label>
      <label class="field-block"><span>状态</span><select v-model.number="form.status" class="text-input"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
      <label v-if="user.is_super === 1" class="field-block"><span>管理员级别</span><select v-model.number="form.is_super" class="text-input"><option :value="0">普通管理员</option><option :value="1">超级管理员</option></select></label>
      <template v-if="form.is_super !== 1">
        <label class="field-block"><span>管理员类型</span><select v-model.number="form.admin_type_id" class="text-input"><option :value="0">不使用类型，单独配置权限</option><option v-for="item in types" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <section v-if="!form.admin_type_id" class="permission-panel"><div class="permission-panel__head"><span>单独配置权限</span><div class="permission-panel__actions"><button class="table-button" @click="form.permissions = visiblePermissions.map(item => item.key)">全选</button><button class="table-button" @click="form.permissions = []">清空</button></div></div><div class="permission-grid"><label v-for="item in visiblePermissions" :key="item.key" class="permission-option"><input v-model="form.permissions" type="checkbox" :value="item.key" /><span>{{ item.label }}</span></label></div></section>
      </template>
      <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
    </section></div>
  </ManageLayout>
</template>
