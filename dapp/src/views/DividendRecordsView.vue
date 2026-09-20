<script setup>
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import dividendToken from "../assets/images/dividend-token.png";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  totalDividend: { type: Number, default: 12580 },
  monthlyDividend: { type: Number, default: 325 },
  records: {
    type: Array,
    default: () => ["2026.09.01", "2026.08.01", "2026.07.01", "2026.06.01"].map((date, index) => ({
      id: index + 1,
      date,
      amount: 325,
      token: "USDT"
    }))
  }
});

const router = useRouter();
const { lang } = useLocale();

function amount(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
</script>

<template>
  <section class="dividend-view">
    <header class="dividend-header">
      <button type="button" :aria-label="lang('返回首页')" @click="router.push({ name: 'home' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("分红记录") }}</h1>
      <span></span>
    </header>

    <section class="dividend-summary">
      <div><span>{{ lang("总分红 (USDT)") }}</span><strong>{{ amount(totalDividend) }}</strong></div>
      <i></i>
      <div><span>{{ lang("单月分红 (USDT)") }}</span><strong>{{ amount(monthlyDividend) }}</strong></div>
    </section>

    <div class="dividend-list">
      <article v-for="record in props.records" :key="record.id" class="dividend-record">
        <img :src="dividendToken" alt="" />
        <time>{{ record.date }}</time>
        <strong>+ {{ amount(record.amount) }} {{ record.token }}</strong>
      </article>
      <p v-if="!props.records.length" class="dividend-empty">{{ lang("暂无分红记录") }}</p>
    </div>
  </section>
</template>

<style scoped>
.dividend-view { min-height: 100vh; padding: 0 18px 38px; background: linear-gradient(135deg, #fff 0%, #fbf7ff 48%, #f7f1ff 100%); color: #4d4950; }
.dividend-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(15px, env(safe-area-inset-top)) 0 19px; }
.dividend-header h1 { margin: 0; color: #111014; font-size: 18px; line-height: 31px; text-align: center; }
.dividend-header button { width: 40px; height: 34px; display: grid; place-items: start; padding: 3px 0; border: 0; border-radius: 16px; background: rgba(255,255,255,.72); color: #812bd8; cursor: pointer; }
.dividend-header button svg { width: 28px; transform: rotate(180deg); }
.dividend-summary { position: relative; min-height: 136px; display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; padding: 0 28px; border: 1px solid #dfceff; border-radius: 12px; background: linear-gradient(145deg, rgba(255,255,255,.86), rgba(227,221,255,.94)); overflow: hidden; }
.dividend-summary::before, .dividend-summary::after { content: ""; position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,.7); transform: rotate(-20deg); }
.dividend-summary::before { width: 260px; height: 86px; left: -53px; top: 45px; box-shadow: 125px 24px 0 14px rgba(169,139,255,.09); }
.dividend-summary::after { width: 210px; height: 90px; right: -58px; bottom: -29px; background: rgba(167,133,255,.12); }
.dividend-summary > * { position: relative; z-index: 1; }
.dividend-summary div { text-align: center; }
.dividend-summary span, .dividend-summary strong { display: block; }
.dividend-summary span { font-size: 13px; }
.dividend-summary strong { margin-top: 7px; color: #7f25d8; font-size: 21px; line-height: 1; }
.dividend-summary i { height: 83px; background: #a66de9; }
.dividend-list { display: grid; gap: 12px; margin-top: 20px; }
.dividend-record { min-height: 73px; display: grid; grid-template-columns: 44px minmax(0,1fr) auto; align-items: center; gap: 13px; padding: 13px 17px; border: 1px solid rgba(233,224,241,.76); border-radius: 17px; background: rgba(255,255,255,.97); box-shadow: 0 7px 21px rgba(91,47,127,.07); }
.dividend-record img { width: 35px; height: 35px; display: block; object-fit: contain; filter: drop-shadow(0 4px 5px rgba(82,18,139,.18)); }
.dividend-record time { font-size: 13px; }
.dividend-record strong { color: #9345e7; font-size: 15px; white-space: nowrap; }
.dividend-empty { margin: 76px 0 0; color: #aaa2ae; font-size: 14px; text-align: center; }

</style>
