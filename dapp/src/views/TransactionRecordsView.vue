<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAssetRecords } from "../lib/api.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  connected: { type: Boolean, default: false }
});
const emit = defineEmits(["connect", "notice"]);

const router = useRouter();
const { lang } = useLocale();
const records = ref([]);
const loading = ref(false);

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function statusText(status) {
  if (Number(status) === 2) return lang("已完成");
  if (Number(status) === 3) return lang("已过期并退回");
  if (Number(status) === 1) return lang("链上确认中");
  return lang("待处理");
}

async function loadRecords() {
  if (!props.connected) return;
  if (!localStorage.getItem("token")) return;
  loading.value = true;
  try {
    records.value = await requestAssetRecords();
  } catch (error) {
    if (Number(error?.code) !== 401) emit("notice", { message: error?.message || lang("加载失败"), type: "error" });
  } finally {
    loading.value = false;
  }
}

watch(() => props.connected, (connected) => {
  if (connected) void loadRecords();
  else records.value = [];
}, { immediate: true });
</script>

<template>
  <section class="records-view">
    <header class="records-header">
      <button type="button" :aria-label="lang('返回资产')" @click="router.push({ name: 'assets' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("充提记录") }}</h1>
      <span></span>
    </header>

    <div class="records-list">
      <article v-for="record in records" :key="record.id" class="transaction-record">
        <i :class="`transaction-icon transaction-icon--${record.type}`">
          <AppIcon :name="record.type === 'deposit' ? 'download' : 'upload'" />
        </i>
        <div class="transaction-meta"><time>{{ record.time }}</time><small>{{ statusText(record.status) }}</small></div>
        <strong :class="`transaction-amount transaction-amount--${record.type}`">
          {{ record.type === "deposit" ? "+" : "-" }} {{ formatAmount(record.amount) }} {{ record.token }}
        </strong>
      </article>
      <p v-if="loading" class="records-empty">{{ lang("加载中") }}</p>
      <p v-else-if="!records.length" class="records-empty">
        {{ connected ? lang("暂无充提记录") : lang("请先连接钱包") }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.records-view { min-height: 100vh; padding: 0 19px 38px; background: linear-gradient(135deg, #fff 0%, #fbf7ff 48%, #f7f1ff 100%); color: #4d4950; }
.records-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 31px; }
.records-header h1 { margin: 0; color: #111014; font-size: 18px; line-height: 32px; text-align: center; }
.records-header button { width: 40px; height: 34px; display: grid; place-items: start; padding: 3px 0; border: 0; background: rgba(255,255,255,.75); color: #812bd8; cursor: pointer; }
.records-header button svg { width: 29px; transform: rotate(180deg); }
.records-list { display: grid; gap: 13px; }
.transaction-record { min-height: 92px; display: grid; grid-template-columns: 35px minmax(0,1fr) auto; align-items: center; gap: 18px; padding: 17px 19px; border: 1px solid rgba(232,221,241,.68); border-radius: 12px; background: rgba(255,255,255,.96); box-shadow: 0 8px 23px rgba(100,55,137,.07); }
.transaction-icon { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 50%; }
.transaction-icon svg { width: 18px; height: 18px; stroke-width: 1.8; }
.transaction-icon--withdraw { background: #ffe0d2; color: #ff5815; }
.transaction-icon--deposit { background: #cdf7d5; color: #00cb26; }
.transaction-record time { font-size: 14px; white-space: nowrap; }
.transaction-meta { min-width: 0; display: grid; gap: 6px; }
.transaction-meta small { color: #9b94a0; font-size: 11px; }
.transaction-amount { font-size: 15px; white-space: nowrap; }
.transaction-amount--withdraw { color: #ff4d08; }
.transaction-amount--deposit { color: #00c924; }
.records-empty { margin: 80px 0 0; color: #a39ca8; font-size: 14px; text-align: center; }
@media (max-width: 420px) {
  .records-view { padding-left: 12px; padding-right: 12px; }
  .transaction-record { min-height: 80px; grid-template-columns: 42px minmax(0,1fr) auto; gap: 9px; padding: 13px 12px; }
  .transaction-icon { width: 42px; height: 42px; }
  .transaction-icon svg { width: 22px; height: 22px; }
  .transaction-record time { font-size: 12px; }
  .transaction-amount { font-size: 13px; }
}
</style>
