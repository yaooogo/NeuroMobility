<script setup>
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  records: {
    type: Array,
    default: () => Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      type: index % 2 === 0 ? "withdraw" : "deposit",
      time: "2026.09.01 15:24:23",
      amount: 325,
      token: "USDT"
    }))
  }
});

const router = useRouter();
const { lang } = useLocale();

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
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
      <article v-for="record in props.records" :key="record.id" class="transaction-record">
        <i :class="`transaction-icon transaction-icon--${record.type}`">
          <AppIcon :name="record.type === 'deposit' ? 'download' : 'upload'" />
        </i>
        <time>{{ record.time }}</time>
        <strong :class="`transaction-amount transaction-amount--${record.type}`">
          {{ record.type === "deposit" ? "+" : "-" }} {{ formatAmount(record.amount) }} {{ record.token }}
        </strong>
      </article>
      <p v-if="!props.records.length" class="records-empty">{{ lang("暂无充提记录") }}</p>
    </div>
  </section>
</template>

<style scoped>
.records-view { min-height: 100vh; padding: 0 19px 38px; background: linear-gradient(135deg, #fff 0%, #fbf7ff 48%, #f7f1ff 100%); color: #4d4950; }
.records-header { height: 113px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 31px; }
.records-header h1 { margin: 0; color: #111014; font-size: 24px; line-height: 32px; text-align: center; }
.records-header button { width: 40px; height: 34px; display: grid; place-items: start; padding: 3px 0; border: 0; background: rgba(255,255,255,.75); color: #812bd8; cursor: pointer; }
.records-header button svg { width: 29px; transform: rotate(180deg); }
.records-list { display: grid; gap: 13px; }
.transaction-record { min-height: 92px; display: grid; grid-template-columns: 52px minmax(0,1fr) auto; align-items: center; gap: 18px; padding: 17px 19px; border: 1px solid rgba(232,221,241,.68); border-radius: 19px; background: rgba(255,255,255,.96); box-shadow: 0 8px 23px rgba(100,55,137,.07); }
.transaction-icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 50%; }
.transaction-icon svg { width: 27px; height: 27px; stroke-width: 2.5; }
.transaction-icon--withdraw { background: #ffe0d2; color: #ff5815; }
.transaction-icon--deposit { background: #cdf7d5; color: #00cb26; }
.transaction-record time { font-size: 17px; white-space: nowrap; }
.transaction-amount { font-size: 18px; white-space: nowrap; }
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
