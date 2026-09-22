<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestTeam } from "../lib/api.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  address: { type: String, default: "" },
  connected: { type: Boolean, default: false },
  authenticated: { type: Boolean, default: false }
});

const router = useRouter();
const { lang } = useLocale();
const totalContribution = ref("0");
const teamCount = ref(0);
const records = ref([]);
const loading = ref(false);
const errorMessage = ref("");
let requestId = 0;

function amount(value, decimals = 2) {
  const text = String(value ?? "0").trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text)) return "0";
  const [integerPart, fractionPart = ""] = text.split(".");
  const integer = BigInt(integerPart || "0").toLocaleString();
  if (decimals < 1) return integer;
  const fraction = fractionPart.slice(0, decimals).padEnd(decimals, "0");
  return `${integer}.${fraction}`;
}

function timeParts(value) {
  const [date = "", time = ""] = String(value || "").split(" ");
  return { date, time };
}

function shortAddress(value) {
  const text = String(value || "");
  return text.length > 13 ? `${text.slice(0, 7)}...${text.slice(-5)}` : text;
}

async function loadTeam() {
  const currentRequestId = ++requestId;
  if (!props.connected || !props.authenticated || !localStorage.getItem("token")) {
    totalContribution.value = "0";
    teamCount.value = 0;
    records.value = [];
    errorMessage.value = "";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await requestTeam();
    if (currentRequestId !== requestId) return;
    totalContribution.value = String(data?.total_contribution ?? "0");
    teamCount.value = Number(data?.team_count || 0);
    records.value = Array.isArray(data?.records) ? data.records : [];
  } catch (error) {
    if (currentRequestId !== requestId) return;
    totalContribution.value = "0";
    teamCount.value = 0;
    records.value = [];
    errorMessage.value = error?.message || lang("加载失败，请稍后重试");
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

watch(() => [props.connected, props.authenticated, props.address], loadTeam, { immediate: true });
</script>

<template>
  <section class="team-view">
    <header class="team-header">
      <button type="button" :aria-label="lang('返回我的')" @click="router.push({ name: 'mine' })"><AppIcon name="chevron" /></button>
      <h1>{{ lang("我的团队") }}</h1>
      <span></span>
    </header>

    <section class="team-hero">
      <div><span>{{ lang("团队总参与") }}</span><strong>{{ amount(totalContribution) }}</strong></div>
      <i></i>
      <div><span>{{ lang("我的团队") }}</span><strong>{{ teamCount }}</strong></div>
    </section>

    <section class="records-section">
      <h2>{{ lang("团队记录") }}</h2>
      <div class="records-card">
        <div class="record-head"><span>{{ lang("时间") }}</span><span>{{ lang("地址") }}</span><span>{{ lang("参与金额") }}</span><span>{{ lang("团队人数") }}</span></div>
        <div v-for="(record, index) in records" :key="`${record.time}-${record.address}-${index}`" class="record-row">
          <span><b>{{ timeParts(record.time).date }}</b><b>{{ timeParts(record.time).time }}</b></span>
          <span :title="record.address">{{ shortAddress(record.address) }}</span>
          <span>{{ amount(record.amount, 0) }} U</span>
          <span>{{ record.team_size }}</span>
        </div>
        <p v-if="loading" class="empty-records">{{ lang("正在加载...") }}</p>
        <p v-else-if="errorMessage" class="empty-records">{{ errorMessage }}</p>
        <p v-else-if="!records.length" class="empty-records">{{ lang("暂无团队记录") }}</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.team-view { min-height: 100vh; padding: 0 16px 34px; background: #fff; color: #4c4850; }
.team-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 17px; }
.team-header h1 { align-self: end; margin: 0; color: #151317; font-size: 18px; line-height: 31px; text-align: center; }
.team-header button { width: 40px; height: 31px; display: grid; place-items: start; padding: 4px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.team-header button svg { width: 26px; transform: rotate(180deg); }
.team-hero { position: relative; height: 132px; display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; padding: 0 23px; border-radius: 15px; background: #9744e9 url("../assets/images/team-hero.jpg") center/cover no-repeat; color: #fff; overflow: hidden; box-shadow: 0 11px 28px rgba(132,53,218,.18); }
.team-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(159,67,240,.72), rgba(153,61,231,.34), rgba(155,61,233,.72)); }
.team-hero > * { position: relative; z-index: 1; }
.team-hero div { text-align: center; }
.team-hero span, .team-hero strong { display: block; }
.team-hero span { font-size: 13px; }
.team-hero strong { margin-top: 7px; font-size: 22px; line-height: 1; }
.team-hero i { height: 54px; background: rgba(255,255,255,.5); }
.records-section { margin-top: 20px; }
.records-section > h2 { margin: 0 0 12px; padding-left: 15px; border-left: 5px solid #9f3fe9; font-size: 15px; line-height: 23px; }
.records-card { min-height: 354px; padding: 19px 14px; border: 1px solid #f2edf6; border-radius: 12px; background: #fff; box-shadow: 0 7px 21px rgba(86,48,120,.07); }
.record-head, .record-row { display: grid; grid-template-columns: 1.25fr 1.35fr 1fr .75fr; align-items: center; column-gap: 8px; }
.record-head { height: 39px; border-bottom: 1px solid #eeeaf0; color: #565159; font-size: 13px; }
.record-head span:last-child, .record-row > span:last-child { text-align: center; }
.record-row { min-height: 56px; color: #5b565e; font-size: 12px; }
.record-row b { display: block; font-weight: 400; line-height: 1.2; }
.empty-records { margin: 86px 0 0; color: #aaa4ae; font-size: 13px; text-align: center; }
@media (max-width: 390px) {
  .team-view { padding-left: 10px; padding-right: 10px; }
  .team-hero { padding-left: 13px; padding-right: 13px; }
  .team-hero strong { font-size: 23px; }
  .records-card { padding-left: 10px; padding-right: 10px; }
  .record-head, .record-row { column-gap: 5px; font-size: 11px; }
}
</style>
