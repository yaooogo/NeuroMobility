<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';
import QRCode from 'qrcode';

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
const googleModal = ref(false);
const googleLoading = ref(false);
const googleTarget = ref(null);
const googleSetup = ref(null);
const googleQrCode = ref('');
const googleCode = ref('');
const googleError = ref('');
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

async function openGoogleAuth(row) {
  googleTarget.value = { ...row };
  googleSetup.value = null;
  googleQrCode.value = '';
  googleCode.value = '';
  googleError.value = '';
  googleModal.value = true;
  if (!row.google_authentication_bound) await createGoogleAuthSetup();
}

async function createGoogleAuthSetup() {
  if (!googleTarget.value || googleLoading.value) return;
  googleLoading.value = true;
  googleError.value = '';
  try {
    const data = await post('/admin/google-auth/setup', { id: googleTarget.value.id });
    googleSetup.value = data;
    googleQrCode.value = await QRCode.toDataURL(data.otpauth_uri, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
  } catch (err) { googleError.value = err.message || '生成绑定信息失败'; }
  finally { googleLoading.value = false; }
}

async function bindGoogleAuth() {
  if (!googleTarget.value || googleLoading.value) return;
  if (!/^\d{6}$/u.test(googleCode.value)) { googleError.value = '请输入 6 位谷歌验证码'; return; }
  googleLoading.value = true;
  googleError.value = '';
  try {
    await post('/admin/google-auth/bind', { id: googleTarget.value.id, google_code: googleCode.value });
    googleModal.value = false;
    success.value = `管理员「${googleTarget.value.username}」已绑定谷歌验证器`;
    await load();
  } catch (err) { googleError.value = err.message || '绑定失败'; }
  finally { googleLoading.value = false; }
}

async function unbindGoogleAuth() {
  if (!googleTarget.value || googleLoading.value) return;
  const isSelf = Number(googleTarget.value.id) === Number(user.id);
  if (isSelf && !/^\d{6}$/u.test(googleCode.value)) { googleError.value = '请输入当前 6 位谷歌验证码'; return; }
  if (!window.confirm(`确定解绑管理员「${googleTarget.value.username}」的谷歌验证器吗？`)) return;
  googleLoading.value = true;
  googleError.value = '';
  try {
    await post('/admin/google-auth/unbind', { id: googleTarget.value.id, google_code: googleCode.value });
    googleModal.value = false;
    success.value = `管理员「${googleTarget.value.username}」已解绑谷歌验证器`;
    await load();
  } catch (err) { googleError.value = err.message || '解绑失败'; }
  finally { googleLoading.value = false; }
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
      <div class="table-wrap"><table class="data-table" style="min-width: 1000px"><thead><tr><th>ID</th><th>账号</th><th>类型 / 权限</th><th>谷歌验证</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="loading || !list.length"><td colspan="7" class="empty-cell">{{ loading ? '正在加载...' : '暂无管理员' }}</td></tr>
          <tr v-for="row in list" :key="row.id"><td>{{ row.id }}</td><td>{{ row.username }} <span v-if="row.is_super === 1" class="status-badge status-badge--on">超级管理员</span></td><td class="permission-cell">{{ permissionText(row) }}</td><td><span class="status-badge" :class="row.google_authentication_bound ? 'status-badge--on' : 'status-badge--off'">{{ row.google_authentication_bound ? '已绑定' : '未绑定' }}</span></td><td><span class="status-badge" :class="row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ row.status === 1 ? '启用' : '禁用' }}</span></td><td>{{ row.created_at || '-' }}</td><td class="actions-cell"><button v-if="can(user, 'admins-update')" class="table-button" :disabled="row.is_super === 1 && user.is_super !== 1" @click="openEdit(row)">编辑</button><button v-if="user.is_super === 1 || row.id === user.id" class="table-button" @click="openGoogleAuth(row)">{{ row.google_authentication_bound ? '管理验证器' : '绑定验证器' }}</button><button v-if="can(user, 'admins-delete') && user.is_super === 1 && row.is_super !== 1 && row.id !== user.id" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button></td></tr>
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
    <div v-if="googleModal" class="modal-mask" @click="!googleLoading && (googleModal = false)"><section class="modal-card google-auth-modal" @click.stop>
      <div class="modal-head"><h2>{{ googleTarget?.google_authentication_bound ? '管理谷歌验证器' : '绑定谷歌验证器' }}</h2><button class="ghost-button" :disabled="googleLoading" @click="googleModal = false">关闭</button></div>
      <div v-if="googleError" class="alert-box alert-box--error">{{ googleError }}</div>
      <template v-if="!googleTarget?.google_authentication_bound">
        <div v-if="googleLoading && !googleSetup" class="empty-cell">正在生成绑定信息...</div>
        <div v-else-if="googleSetup" class="google-auth-box">
          <p>请使用 Google Authenticator 扫描二维码，或手动输入下方密钥。绑定信息 10 分钟内有效。</p>
          <div class="google-auth-qr"><img :src="googleQrCode" alt="谷歌验证器绑定二维码" /></div>
          <label class="field-block"><span>手动密钥</span><code style="word-break: break-all">{{ googleSetup.secret }}</code></label>
          <label class="field-block"><span>谷歌验证码</span><input v-model.trim="googleCode" class="text-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入验证器中的 6 位验证码" @keyup.enter="bindGoogleAuth" /></label>
          <button class="submit-button" :disabled="googleLoading" @click="bindGoogleAuth">{{ googleLoading ? '绑定中...' : '确认绑定' }}</button>
        </div>
        <button v-else class="primary-button" :disabled="googleLoading" @click="createGoogleAuthSetup">重新生成绑定信息</button>
      </template>
      <template v-else>
        <div class="alert-box alert-box--success">管理员「{{ googleTarget.username }}」已绑定谷歌验证器。</div>
        <label v-if="Number(googleTarget.id) === Number(user.id)" class="field-block"><span>当前谷歌验证码</span><input v-model.trim="googleCode" class="text-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="解绑前请输入当前 6 位验证码" /></label>
        <p v-else>超级管理员可以为该账号重置谷歌验证器。解绑后，在验证器功能开启期间该账号将无法登录，直至重新绑定。</p>
        <button class="danger-button" :disabled="googleLoading" @click="unbindGoogleAuth">{{ googleLoading ? '解绑中...' : '解绑谷歌验证器' }}</button>
      </template>
    </section></div>
  </ManageLayout>
</template>
