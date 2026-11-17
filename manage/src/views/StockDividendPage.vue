<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import ManagePagination from '../components/ManagePagination.vue';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';
import { getUser } from '../lib/auth.js';
const canPay = can(getUser(), 'stock-dividend-pay');
const amount = ref(''); const preview = ref(null); const items = ref([]);
const mode = ref('total');
const busy = ref(false); const error = ref(''); const success = ref('');
const details = ref(null);
const page = ref(1); const total = ref(0); const lastPage = ref(1); const loading = ref(false);
const detailPage = ref(1); const detailTotal = ref(0); const detailLastPage = ref(1);
const detailBatch = ref(null); const detailLoading = ref(false); const detailError = ref('');
let listRequest = 0; let detailRequest = 0;
let refreshTimer;
function taskStatus(row) { return ({0: '待确认', 1: '已完成', 2: '排队中', 3: '分发中', 4: '部分失败'})[Number(row.status)] || '-'; }
async function retry(row) {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try { await post('/stock-dividend/pay', { batch_id: row.id, confirmed: 1 }); success.value = '失败会员已重新排队'; await load(); }
  catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
async function showDetails(row) {
  detailBatch.value = row; details.value = []; detailPage.value = 1;
  await loadDetails(1);
}
async function loadDetails(nextPage) {
  const request = ++detailRequest;
  detailLoading.value = true; detailError.value = '';
  try {
    const data = await post('/stock-dividend/detail', { batch_id: detailBatch.value.id, page: nextPage, page_size: 20 });
    if (request !== detailRequest) return;
    detailBatch.value = data.batch; details.value = data.items || []; detailPage.value = Number(data.page); detailTotal.value = Number(data.total); detailLastPage.value = Number(data.last_page);
  } catch (err) { if (request === detailRequest) detailError.value = err.message; }
  finally { if (request === detailRequest) detailLoading.value = false; }
}
function closeDetails() { ++detailRequest; details.value = null; detailBatch.value = null; }
async function load(nextPage = page.value) {
  const request = ++listRequest;
  loading.value = true;
  try {
    const data = await post('/stock-dividend/list', { page: nextPage, page_size: 20 });
    if (request !== listRequest) return;
    items.value = data.items || []; page.value = Number(data.page); total.value = Number(data.total); lastPage.value = Number(data.last_page);
  } catch (err) { if (request === listRequest) error.value = err.message; }
  finally { if (request === listRequest) loading.value = false; }
}
async function prepare() {
  busy.value = true; error.value = ''; success.value = ''; preview.value = null;
  try { preview.value = await post('/stock-dividend/prepare', { amount: amount.value, mode: mode.value }); }
  catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
async function pay() {
  if (busy.value || !preview.value) return;
  busy.value = true; error.value = '';
  try {
    await post('/stock-dividend/pay', { batch_id: preview.value.id, confirmed: 1 });
    success.value = '分红任务已提交，请在任务列表查看进度'; preview.value = null; amount.value = '';
    await load();
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
onMounted(async () => {
  await load();
  refreshTimer = setInterval(() => {
    if (!loading.value && !busy.value) load();
    if (detailBatch.value && !detailLoading.value) loadDetails(detailPage.value);
  }, 5000);
});
onBeforeUnmount(() => { clearInterval(refreshTimer); ++listRequest; ++detailRequest; });
</script>
<template>
  <ManageLayout title="股份分红" description="按会员 STOCK 可用余额占全网份额的比例，手动发放 USDT 分红。">
    <section class="panel-card dividend-panel">
      <p>按总额：会员分红 = 总额 × 会员份额 ÷ 全网份额。按每股：会员分红 = 每股金额 × 会员份额。冻结份额不参与，不扣除会员股份。</p>
      <p>例如：总额 1000 USDT、全网 50 股，则每股获得 20 USDT。确认后提交后台任务，分批入账。</p>
      <form class="toolbar" v-if="canPay" @submit.prevent="prepare">
        <label class="field-block">分红方式<select v-model="mode" class="text-input" :disabled="busy" @change="preview = null; amount = ''"><option value="total">按总额</option><option value="per_share">按每股</option></select></label>
        <label class="field-block">{{ mode === 'total' ? '分红总额（USDT）' : '每股分红（USDT / STOCK）' }}<input v-model.trim="amount" class="text-input" inputmode="decimal" :disabled="busy" required @input="preview = null" /></label>
        <button class="primary-button" type="submit" :disabled="busy">{{ busy ? '处理中…' : '预览分红' }}</button>
      </form>
      <p v-if="error" class="alert-box alert-box--error" role="alert">{{ error }}</p>
      <p v-if="success" class="alert-box alert-box--success" role="status">{{ success }}</p>
      <section v-if="preview" class="dividend-preview">
        <h3>确认本次分红</h3>
        <div class="alert-box">当前仅为预览，尚未创建分发任务，也不会入账。点击下方“确认创建分发任务”后才开始处理。</div>
        <p>分红方式：{{ preview.mode === 'per_share' ? '按每股' : '按总额' }}</p>
        <dl><dt>分红总额</dt><dd>{{ preview.amount }} USDT</dd><dt>全网股份</dt><dd>{{ preview.shares }} STOCK</dd><dt>持股会员</dt><dd>{{ preview.holders }} 人</dd></dl>
        <p v-if="preview.mode === 'per_share'">每股 {{ preview.per_share_amount }} USDT</p>
        <p v-else>每股约 {{ (Number(preview.amount) / Number(preview.shares)).toLocaleString(undefined, { maximumFractionDigits: 8 }) }} USDT（展示值）</p>
        <p>确认后提交后台任务，按预览快照分批发放至会员 USDT 账户。{{ preview.mode === 'per_share' ? '按每股金额计算，每位会员不足 USDT 最小精度的部分舍去，预览总额为实际发放合计。' : '最小单位尾差按余数分配，保证总额一致。' }}</p>
        <button class="ghost-button" type="button" :disabled="busy" @click="preview = null">取消</button>
        <button class="primary-button" type="button" :disabled="busy" @click="pay">{{ busy ? '提交中…' : '确认创建分发任务' }}</button>
      </section>
    </section>
    <section class="panel-card dividend-panel dividend-history"><div class="toolbar"><h3>分红任务</h3><button class="ghost-button" :disabled="loading" @click="load()">{{ loading ? '加载中…' : '刷新' }}</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>批次</th><th>分红方式</th><th>每股 USDT</th><th>总额 USDT</th><th>股份 STOCK</th><th>人数</th><th>状态 / 进度</th><th>完成时间</th><th>操作</th></tr></thead>
        <tbody><tr v-for="row in items" :key="row.id"><td>{{ row.id }}</td><td>{{ row.mode === 'per_share' ? '按每股' : '按总额' }}</td><td>{{ row.per_share_amount ?? '-' }}</td><td>{{ row.amount }}</td><td>{{ row.shares }}</td><td>{{ row.holders }}</td><td>{{ taskStatus(row) }} · {{ row.completed }} / {{ row.holders }} · 失败 {{ row.failed }}</td><td>{{ row.paid_at || '-' }}</td><td class="actions-cell"><button class="table-button" type="button" @click="showDetails(row)">详情</button><button v-if="canPay && Number(row.status) === 4" class="table-button" type="button" :disabled="busy" @click="retry(row)">重试失败会员</button><button v-if="canPay && Number(row.status) === 0" class="table-button" type="button" :disabled="busy" @click="preview = row">继续确认</button></td></tr></tbody>
      </table></div><p v-if="!items.length">{{ loading ? '正在加载…' : '暂无分红记录' }}</p>
      <ManagePagination :page="page" :last-page="lastPage" :total="total" @change="load" />
    </section>
    <div v-if="details" class="modal-mask" @click.self="closeDetails" @keydown.esc="closeDetails">
      <section class="modal-card dividend-detail" role="dialog" aria-modal="true" aria-label="分红明细">
        <div class="modal-head"><h2>分红明细</h2><button class="ghost-button" type="button" @click="closeDetails">关闭</button></div>
        <p class="muted-text">批次：{{ detailBatch.id }}</p>
        <p>分红总额 {{ detailBatch.amount }} USDT · 全网股份 {{ detailBatch.shares }} STOCK · {{ detailBatch.holders }} 人</p>
        <p>任务状态：{{ taskStatus(detailBatch) }} · 完成 {{ detailBatch.completed }} / {{ detailBatch.holders }} · 失败 {{ detailBatch.failed }}</p><div v-if="detailError" class="alert-box alert-box--error">{{ detailError }}</div>
        <div class="table-wrap"><table class="data-table detail-table">
          <thead><tr><th>会员钱包</th><th>股份 STOCK</th><th>应发 USDT</th><th>状态</th><th>到账时间 / 失败原因</th></tr></thead>
          <tbody><tr v-if="detailLoading || !details.length"><td colspan="5" class="empty-cell">{{ detailLoading ? '正在加载…' : '暂无分发明细' }}</td></tr>
            <template v-else><tr v-for="row in details" :key="row.wallet"><td class="mono-cell">{{ row.wallet }}</td><td class="mono-cell">{{ row.shares }}</td><td class="mono-cell">{{ row.amount }}</td><td>{{ Number(row.status) === 1 ? '已到账' : Number(row.status) === 2 ? '失败' : '待发放' }}</td><td>{{ row.error_message || row.paid_at || '-' }}</td></tr></template>
          </tbody>
        </table></div>
        <ManagePagination :page="detailPage" :last-page="detailLastPage" :total="detailTotal" @change="loadDetails" />
      </section>
    </div>
  </ManageLayout>
</template>
<style scoped>
.dividend-panel { margin-bottom: 14px; max-height: none; padding: 16px; }
.dividend-detail { width: min(100%, 1000px); max-height: 90vh; overflow: auto; }
.dividend-detail .detail-table { min-width: 900px; }
.dividend-detail > p { overflow-wrap: anywhere; }
.dividend-panel p { margin: 6px 0; line-height: 1.6; color: var(--muted); }
.dividend-panel form { display: flex; justify-content: flex-start; align-items: end; gap: 16px; margin: 14px 0 0; }
.dividend-panel .field-block { flex: 0 1 230px; margin: 0; width: auto; min-width: 0; gap: 6px; }
.dividend-panel .field-block:first-child { flex-basis: 160px; }
.dividend-panel form > button { flex: 0 0 auto; }
.dividend-preview { max-width: 760px; margin-top: 14px; padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel-strong); }
.dividend-preview h3, .dividend-history h3 { margin-top: 0; }
.dividend-preview dl { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 8px 12px; margin: 12px 0; }
.dividend-preview dt { color: var(--muted); }
.dividend-preview dd { margin: 0; overflow-wrap: anywhere; }
.dividend-preview button + button { margin-left: 10px; }
.dividend-history .data-table { min-width: 1000px; }
.dividend-history .table-wrap + button { margin-top: 16px; }
.dividend-history td button { margin-top: 8px; }
@media (max-width: 640px) {
  .dividend-panel form { flex-direction: row; flex-wrap: wrap; align-items: end; }
  .dividend-panel .field-block, .dividend-panel .field-block:first-child { flex: 1 1 140px; }
  .dividend-preview dl { grid-template-columns: auto 1fr; gap: 8px; }
}
</style>
