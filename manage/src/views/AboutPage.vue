<script setup>
import { onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
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
const query = reactive({ language: '', page: 1, page_size: 20 });
const form = reactive({ id: 0, language: 'zh', content: '' });
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

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await post('/about/list', query);
    list.value = data.items || [];
    total.value = Number(data.total || 0);
    lastPage.value = Number(data.last_page || 1);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function search() {
  query.page = 1;
  load();
}

function changePage(page) {
  query.page = page;
  load();
}

function openCreate() {
  Object.assign(form, { id: 0, language: query.language || 'zh', content: '' });
  modalError.value = '';
  modal.value = true;
}

function edit(row) {
  Object.assign(form, { id: row.id, language: row.language || 'zh', content: row.content || '' });
  modalError.value = '';
  modal.value = true;
}

async function save() {
  if (saving.value) return;
  if (!form.content.trim()) {
    modalError.value = '请输入文章内容';
    return;
  }
  saving.value = true;
  modalError.value = '';
  try {
    await post(form.id ? '/about/update' : '/about/create', form);
    modal.value = false;
    success.value = form.id ? '文章已更新' : '文章已创建';
    await load();
  } catch (err) {
    modalError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  if (!window.confirm('确定删除这篇关于我们文章吗？')) return;
  deleting.value = row.id;
  error.value = '';
  try {
    await post('/about/delete', { id: row.id });
    success.value = '文章已删除';
    if (list.value.length === 1 && query.page > 1) query.page--;
    await load();
  } catch (err) {
    error.value = err.message;
  } finally {
    deleting.value = 0;
  }
}

onMounted(load);
</script>

<template>
  <ManageLayout title="关于我们" description="逐篇管理 dapp 关于我们的多语言文章。">
    <section class="panel-card">
      <div class="toolbar">
        <div class="toolbar-group">
          <select v-model="query.language" class="text-input text-input--inline">
            <option value="">全部语言</option>
            <option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <button class="primary-button" @click="search">查询</button>
        </div>
        <button v-if="can(user, 'about-create')" class="primary-button" @click="openCreate">新增文章</button>
      </div>

      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>

      <div class="table-wrap">
        <table class="data-table" style="min-width: 900px">
          <thead><tr><th>ID</th><th>语言</th><th>内容</th><th>创建时间</th><th>更新时间</th><th v-if="can(user, 'about-update') || can(user, 'about-delete')">操作</th></tr></thead>
          <tbody>
            <tr v-if="loading || !list.length"><td :colspan="can(user, 'about-update') || can(user, 'about-delete') ? 6 : 5" class="empty-cell">{{ loading ? '正在加载...' : '暂无文章' }}</td></tr>
            <tr v-for="row in list" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ languageLabels[row.language] || row.language }}</td>
              <td class="about-content">{{ row.content }}</td>
              <td>{{ row.created_at || '-' }}</td>
              <td>{{ row.updated_at || '-' }}</td>
              <td v-if="can(user, 'about-update') || can(user, 'about-delete')" class="actions-cell">
                <button v-if="can(user, 'about-update')" class="table-button" @click="edit(row)">编辑</button>
                <button v-if="can(user, 'about-delete')" class="table-button table-button--danger" :disabled="deleting === row.id" @click="remove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ManagePagination :page="query.page" :last-page="lastPage" :total="total" @change="changePage" />
    </section>

    <div v-if="modal" class="modal-mask" @click="!saving && (modal = false)">
      <section class="modal-card operation-log-modal" @click.stop>
        <div class="modal-head"><h2>{{ form.id ? '编辑文章' : '新增文章' }}</h2><button class="ghost-button" :disabled="saving" @click="modal = false">关闭</button></div>
        <div v-if="modalError" class="alert-box alert-box--error">{{ modalError }}</div>
        <label class="field-block">
          <span>语言</span>
          <select v-model="form.language" class="text-input">
            <option v-for="item in languageOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="field-block"><span>内容</span><textarea v-model.trim="form.content" class="text-input about-textarea" rows="16" placeholder="请输入文章内容"></textarea></label>
        <button class="submit-button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存文章' }}</button>
      </section>
    </div>
  </ManageLayout>
</template>

<style scoped>
.about-content { max-width: 620px; white-space: pre-wrap; word-break: break-word; }
.about-textarea { min-height: 320px; resize: vertical; line-height: 1.7; }
</style>
