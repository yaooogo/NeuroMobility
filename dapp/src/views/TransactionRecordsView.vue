<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAssetRecords } from "../lib/api.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  connected: { type: Boolean, default: false }
});
const emit = defineEmits(["connect", "notice"]);

const route = useRoute();
const router = useRouter();
const { lang } = useLocale();
const records = ref([]);
const loading = ref(false);
const selectedToken = computed(() => String(route.query?.token || "").trim().toUpperCase());

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function sceneText(scene, type) {
  const sceneMap = {
    token_recharge: "链上充值",
    open_api_recharge: "API 充值",
    token_withdrawal: "提现",
    token_withdrawal_expired: "提现超时退回",
    token_withdrawal_cancel: "提现取消退回",
    investment: "投资",
    investment_dividend: "投资分红",
    investment_principal_return: "本金返还",
    investment_expansion_reward: "投资拓展奖励",
    investment_differential_income: "投资级差收益",
    position_salary: "岗位工资",
    admin_change: "后台调整"
  };
  if (sceneMap[scene]) return lang(sceneMap[scene]);
  if (scene) return scene;
  return type === "in" ? lang("收入") : lang("支出");
}

async function loadRecords() {
  if (!props.connected) return;
  if (!localStorage.getItem("token")) return;
  loading.value = true;
  try {
    records.value = await requestAssetRecords(selectedToken.value);
  } catch (error) {
    if (Number(error?.code) !== 401) emit("notice", { message: error?.message || lang("加载失败"), type: "error" });
  } finally {
    loading.value = false;
  }
}

watch(() => [props.connected, selectedToken.value], ([connected]) => {
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
      <h1>{{ selectedToken ? `${selectedToken} ${lang("记录")}` : lang("记录") }}</h1>
      <span></span>
    </header>

    <div class="records-list">
      <article v-for="record in records" :key="record.id" class="transaction-record">
        <i :class="`transaction-icon transaction-icon--${record.type}`">
          <AppIcon :name="record.type === 'in' ? 'download' : 'upload'" />
        </i>
        <div class="transaction-meta"><time>{{ record.time }}</time><small>{{ sceneText(record.scene, record.type) }}</small></div>
        <strong :class="`transaction-amount transaction-amount--${record.type}`">
          {{ record.type === "in" ? "+" : "-" }} {{ formatAmount(record.amount) }} {{ record.token }}
        </strong>
      </article>
      <p v-if="loading" class="records-empty">{{ lang("加载中") }}</p>
      <p v-else-if="!records.length" class="records-empty">
        {{ connected ? lang("暂无记录") : lang("请先连接钱包") }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.records-view { min-height: 100vh; padding: 0 19px 38px; background: linear-gradient(135deg, #fff 0%, #fbf7ff 48%, #f7f1ff 100%); color: #4d4950; }
.records-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 31px; }
.records-header h1 { min-width: 0; margin: 0; overflow: hidden; color: #111014; font-size: 18px; line-height: 32px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.records-header button { width: 40px; height: 34px; display: grid; place-items: start; padding: 3px 0; border: 0; background: rgba(255,255,255,.75); color: #812bd8; cursor: pointer; }
.records-header button svg { width: 29px; transform: rotate(180deg); }
.records-list { display: grid; gap: 13px; }
.transaction-record { min-height: 92px; display: grid; grid-template-columns: 35px minmax(0,1fr) auto; align-items: center; gap: 18px; padding: 17px 19px; border: 1px solid rgba(232,221,241,.68); border-radius: 12px; background: rgba(255,255,255,.96); box-shadow: 0 8px 23px rgba(100,55,137,.07); }
.transaction-icon { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 50%; }
.transaction-icon svg { width: 18px; height: 18px; stroke-width: 1.8; }
.transaction-icon--out { background: #ffe0d2; color: #ff5815; }
.transaction-icon--in { background: #cdf7d5; color: #00cb26; }
.transaction-record time { font-size: 14px; white-space: nowrap; }
.transaction-meta { min-width: 0; display: grid; gap: 6px; }
.transaction-meta small { color: #9b94a0; font-size: 11px; }
.transaction-amount { font-size: 15px; white-space: nowrap; }
.transaction-amount--out { color: #ff4d08; }
.transaction-amount--in { color: #00c924; }
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
