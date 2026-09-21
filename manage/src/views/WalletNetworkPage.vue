<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';

const ROOT_PAGE_SIZE = 20;
const CHILD_PAGE_SIZE = 100;
const loading = ref(false);
const error = ref('');
const roots = ref([]);
const expanded = ref(new Set());
const loadingNodes = ref(new Set());
const children = ref(new Map());
const childPages = ref(new Map());
const query = reactive({ keyword: '', page: 1, page_size: ROOT_PAGE_SIZE });
const pagination = reactive({ total: 0, last_page: 1 });

function key(value) { return String(value || '').trim().toLowerCase(); }
function isExpanded(row) { return expanded.value.has(key(row?.wallet)); }
function isLoading(row) { return loadingNodes.value.has(key(row?.wallet)); }
function hasChildren(row) { return Boolean(row?.has_children) || Number(row?.direct_count || 0) > 0; }

function replaceSet(source, value, enabled) {
  const next = new Set(source.value); enabled ? next.add(value) : next.delete(value); source.value = next;
}

function setChildren(wallet, rows, page, append = false) {
  const walletKey = key(wallet);
  const nextChildren = new Map(children.value);
  const nextPages = new Map(childPages.value);
  nextChildren.set(walletKey, append ? [...(nextChildren.get(walletKey) || []), ...(rows || [])] : (rows || []));
  nextPages.set(walletKey, page || { page: 1, lastPage: 1 });
  children.value = nextChildren; childPages.value = nextPages;
}

function flatten(nodes, depth = 0) {
  const result = [];
  for (const row of nodes || []) {
    const walletKey = key(row.wallet);
    result.push({ type: 'node', key: `node-${walletKey}-${depth}`, row, depth });
    if (!expanded.value.has(walletKey)) continue;
    if (loadingNodes.value.has(walletKey) && !children.value.has(walletKey)) {
      result.push({ type: 'loading', key: `loading-${walletKey}`, depth: depth + 1 });
      continue;
    }
    result.push(...flatten(children.value.get(walletKey) || [], depth + 1));
    const page = childPages.value.get(walletKey);
    if (page && Number(page.page || 1) < Number(page.lastPage || 1)) {
      result.push({ type: 'more', key: `more-${walletKey}-${page.page}`, row, depth: depth + 1, nextPage: Number(page.page) + 1 });
    }
  }
  return result;
}

const flatRows = computed(() => flatten(roots.value));

async function loadRoots() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/wallet/tree', query);
    roots.value = data.list || []; pagination.total = Number(data.pagination?.total || 0);
    pagination.last_page = Number(data.pagination?.lastPage || 1);
    expanded.value = new Set(); loadingNodes.value = new Set(); children.value = new Map(); childPages.value = new Map();
  } catch (err) { error.value = err.message || '加载网体图失败'; roots.value = []; }
  finally { loading.value = false; }
}

async function loadChildren(row, page = 1, append = false) {
  const walletKey = key(row?.wallet);
  if (!walletKey) return;
  replaceSet(loadingNodes, walletKey, true); error.value = '';
  try {
    const data = await post('/wallet/tree', { wallet: row.wallet, page, page_size: CHILD_PAGE_SIZE });
    setChildren(row.wallet, data.list || [], data.pagination, append);
  } catch (err) { error.value = err.message || '加载直属下线失败'; }
  finally { replaceSet(loadingNodes, walletKey, false); }
}

async function toggle(row) {
  if (!hasChildren(row)) return;
  const walletKey = key(row.wallet);
  if (expanded.value.has(walletKey)) { replaceSet(expanded, walletKey, false); return; }
  replaceSet(expanded, walletKey, true);
  if (!children.value.has(walletKey)) await loadChildren(row);
}

function search() { query.page = 1; loadRoots(); }
function reset() { query.keyword = ''; query.page = 1; loadRoots(); }
function changePage(page) { query.page = page; loadRoots(); }
function formatAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 8 }) : String(value || '0');
}
function formatInteger(value) { return Number(value || 0).toLocaleString('en-US'); }
onMounted(loadRoots);
</script>

<template>
  <ManageLayout title="网体图" description="按钱包逐层展开直属关系，查看个人投资与社区数据。">
    <section class="panel-card">
      <div class="toolbar"><div class="toolbar-group">
        <input v-model.trim="query.keyword" class="text-input text-input--inline network-search" placeholder="钱包地址、邀请码、邀请人或备注" @keyup.enter="search" />
        <button class="primary-button" @click="search">查询</button><button class="ghost-button" @click="reset">重置</button>
      </div></div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div class="table-wrap"><table class="data-table network-table">
        <thead><tr><th>钱包地址</th><th>个人投资</th><th>社区投资</th><th>社区用户</th><th>直属人数</th><th>团队人数</th><th>层级</th><th>等级</th><th>邀请人</th><th>状态</th><th>备注</th><th>注册时间</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="12" class="empty-cell">正在加载...</td></tr>
          <tr v-else-if="!roots.length"><td colspan="12" class="empty-cell">暂无网体数据</td></tr>
          <template v-for="item in flatRows" v-else :key="item.key">
            <tr v-if="item.type === 'node'" :class="{ 'network-row--child': item.depth > 0 }">
              <td><div class="wallet-tree-cell" :style="{ paddingLeft: `${item.depth * 24}px` }"><button v-if="hasChildren(item.row)" class="tree-toggle" :disabled="isLoading(item.row)" @click="toggle(item.row)">{{ isExpanded(item.row) ? '−' : '+' }}</button><span v-else class="tree-toggle tree-toggle--empty"></span><strong class="mono-cell">{{ item.row.wallet || '-' }}</strong></div></td>
              <td>{{ formatAmount(item.row.invests) }}</td><td>{{ formatAmount(item.row.community_invests) }}</td><td>{{ formatInteger(item.row.community_users) }}</td><td>{{ formatInteger(item.row.direct_count) }}</td><td>{{ formatInteger(item.row.team_count) }}</td><td>{{ item.row.lv }}</td><td>{{ item.row.effective_level }}</td><td class="mono-cell">{{ item.row.inviter || '-' }}</td><td><span class="status-badge" :class="item.row.status === 1 ? 'status-badge--on' : 'status-badge--off'">{{ item.row.status === 1 ? '启用' : '禁用' }}</span></td>
              <td><div class="remark-stack"><span>系统：{{ item.row.remark_system || '-' }}</span><span>名称：{{ item.row.remark_name || '-' }}</span><span>社区：{{ item.row.remark_community || '-' }}</span></div></td><td>{{ item.row.created_at || '-' }}</td>
            </tr>
            <tr v-else><td colspan="12"><div class="network-inline" :style="{ paddingLeft: `${item.depth * 24}px` }"><span v-if="item.type === 'loading'">正在加载直属下线...</span><button v-else class="table-button" :disabled="isLoading(item.row)" @click="loadChildren(item.row, item.nextPage, true)">{{ isLoading(item.row) ? '加载中...' : '加载更多直属下线' }}</button></div></td></tr>
          </template>
        </tbody>
      </table></div>
      <ManagePagination :page="query.page" :last-page="pagination.last_page" :total="pagination.total" @change="changePage" />
    </section>
  </ManageLayout>
</template>

<style scoped>
.network-search { min-width: 320px; }
.network-table { min-width: 1750px; }
.network-table th:first-child { width: 310px; }
.network-table th:nth-child(9) { width: 280px; }
.network-table th:nth-child(11) { width: 220px; }
.network-table th:last-child { width: 165px; }
.network-row--child td { background: rgba(255, 255, 255, 0.015); }
.wallet-tree-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tree-toggle { flex: 0 0 28px; width: 28px; height: 28px; min-height: 28px; padding: 0; border: 1px solid rgba(142, 168, 241, 0.22); border-radius: 8px; background: rgba(61, 123, 255, 0.16); color: var(--text); cursor: pointer; font-size: 18px; line-height: 1; }
.tree-toggle:disabled { opacity: 0.6; cursor: wait; }
.tree-toggle--empty { border-color: transparent; background: transparent; }
.remark-stack { display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 12px; white-space: nowrap; }
.network-inline { min-height: 36px; display: flex; align-items: center; color: var(--muted); font-size: 12px; }
@media (max-width: 640px) { .network-search { min-width: 0; } }
</style>
