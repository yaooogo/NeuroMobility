<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestCreateInvestment, requestInvestmentConfig } from "../lib/api.js";
const requireAsset = (assetPath) => globalThis.require(assetPath);

defineOptions({ inheritAttrs: false });
const props = defineProps({ connected: { type: Boolean, default: false }, authenticated: { type: Boolean, default: false } });
const emit = defineEmits(["connect", "action", "notice"]);
const { lang } = useLocale();
const router = useRouter();

const investmentConfig = ref({
  minimum_investment_amount: 1000,
  whole_vehicle_tier: 50000,
  waiting_period_days: 15,
  dividend_cycle_days: 30,
  min_percent: 3,
  max_percent: 10
});
const selectedAmount = ref(1000);
const customAmount = ref("");
const submitting = ref(false);
const amountOptions = computed(() => {
  const minimum = Number(investmentConfig.value.minimum_investment_amount) || 1000;
  const wholeVehicle = Number(investmentConfig.value.whole_vehicle_tier) || 50000;
  return [1, 2, 5, 10, 20].map((multiple) => ({
    key: `multiple-${multiple}`,
    amount: minimum * multiple,
    wholeVehicle: false
  })).concat({ key: "whole-vehicle", amount: wholeVehicle, wholeVehicle: true });
});
const finalAmount = computed(() => Number(customAmount.value) || selectedAmount.value);
const canSubmit = computed(() => {
  const minimum = Number(investmentConfig.value.minimum_investment_amount) || 1000;
  const amount = finalAmount.value;
  if (!Number.isFinite(amount) || amount < minimum) return false;
  if (!customAmount.value) return true;
  return Number.isInteger(amount / minimum);
});
const instructions = computed(() => {
  const waitingDays = Number(investmentConfig.value.waiting_period_days);
  const dividendCycleDays = Number(investmentConfig.value.dividend_cycle_days);
  const minPercent = Number(investmentConfig.value.min_percent);
  const maxPercent = Number(investmentConfig.value.max_percent);
  return [
    { icon: requireAsset("@assets/images/icons/calendar.png"), title: lang(`${waitingDays}天等待期`), description: lang(`投资成功后${waitingDays}天为等待期`) },
    { icon: requireAsset("@assets/images/icons/hourglass.png"), title: lang(`第${waitingDays + 1}天开始计算`), description: lang(`之后${dividendCycleDays}天为一个分红周期`) },
    { icon: requireAsset("@assets/images/icons/data1.png"), title: lang(`月度分红 ${minPercent}%-${maxPercent}%`), description: lang("根据项目经营情况按区间发放") }
  ];
});

function selectAmount(amount) {
  selectedAmount.value = amount;
  customAmount.value = "";
}

function setCustomAmount(event) {
  customAmount.value = event.target.value.replace(/[^\d.]/g, "");
  if (customAmount.value) selectedAmount.value = 0;
}

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  if (!props.connected || !props.authenticated || !localStorage.getItem("token")) {
    emit("connect");
    return;
  }
  submitting.value = true;
  try {
    const order = await requestCreateInvestment(String(finalAmount.value));
    await router.push({ name: "invest-success", query: { order_id: order.order_id } });
  } catch (error) {
    emit("notice", { message: error?.message || lang("投资失败"), type: "error" });
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    const data = await requestInvestmentConfig();
    const minimum = Number(data?.minimum_investment_amount);
    const wholeVehicle = Number(data?.whole_vehicle_tier);
    const waitingDays = Number(data?.waiting_period_days);
    const dividendCycleDays = Number(data?.dividend_cycle_days);
    const minPercent = Number(data?.min_percent);
    const maxPercent = Number(data?.max_percent);
    if (Number.isInteger(minimum) && minimum > 0) investmentConfig.value.minimum_investment_amount = minimum;
    if (Number.isFinite(wholeVehicle) && wholeVehicle > 0) investmentConfig.value.whole_vehicle_tier = wholeVehicle;
    if (Number.isInteger(waitingDays) && waitingDays >= 0) investmentConfig.value.waiting_period_days = waitingDays;
    if (Number.isInteger(dividendCycleDays) && dividendCycleDays > 0) investmentConfig.value.dividend_cycle_days = dividendCycleDays;
    if (Number.isFinite(minPercent) && minPercent >= 0 && minPercent <= 100) investmentConfig.value.min_percent = minPercent;
    if (Number.isFinite(maxPercent) && maxPercent >= 0 && maxPercent <= 100) investmentConfig.value.max_percent = maxPercent;
    if (!customAmount.value) selectedAmount.value = investmentConfig.value.minimum_investment_amount;
  } catch {
    // Keep safe defaults when the public configuration endpoint is unavailable.
  }
});
</script>

<template>
  <section class="invest-view">
    <header class="invest-header">
      <h1>{{ lang("投资计划") }}</h1>
    </header>

    <section class="plan-banner">
      <div>
        <strong>{{ lang("商务出行创富计划") }}</strong>
        <span>{{ lang("共享真实资产·共享稳定收益") }}</span>
      </div>
    </section>

    <section class="amount-section">
      <h2>{{ lang("参与金额") }} <small>({{ lang("最低") }} {{ investmentConfig.minimum_investment_amount.toLocaleString() }} U)</small></h2>
      <div class="amount-grid">
        <button
          v-for="option in amountOptions"
          :key="option.key"
          type="button"
          :class="{ active: selectedAmount === option.amount && !customAmount }"
          @click="selectAmount(option.amount)"
        >
          {{ option.amount.toLocaleString() }}
          <em v-if="option.wholeVehicle">{{ lang("整车参与") }}</em>
        </button>
      </div>
      <label class="custom-amount" :class="{ active: customAmount }">
        <input
          :value="customAmount"
          inputmode="decimal"
          :placeholder="lang('自定义参与数量')"
          :aria-label="lang('自定义参与数量')"
          @input="setCustomAmount"
        />
        <span v-if="customAmount">USDT</span>
      </label>
      <button class="participate-button" type="button" :disabled="!canSubmit || submitting" @click="submit">{{ submitting ? lang("提交中...") : lang("立即参与") }}</button>
    </section>

    <section class="instructions">
      <h2>{{ lang("说明") }}</h2>
      <div class="instruction-card">
        <article v-for="item in instructions" :key="item.title">
          <i><img :src="item.icon" /></i>
          <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.invest-view { min-height: calc(100vh - 78px); padding: 0 16px 29px; background: #fff; color: #363239; }
.invest-header { height:70px; display: flex; justify-content: center; align-items: center; padding: max(18px, env(safe-area-inset-top)) 0 18px; }
.invest-header h1 { display: flex; justify-content: center; margin: 0; text-align: center; color: #151317; font-size: 18px; line-height: 32px; }
.invest-header button { width: 40px; height: 32px; display: grid; place-items: start; padding: 5px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.invest-header button svg { width: 25px; transform: rotate(180deg); }
.plan-banner { position: relative; height: 110px; display: flex; align-items: center; padding: 0 16px; border-radius: 12px; background: #246af4 url("../assets/images/invest-plan-hero.jpg") center/cover no-repeat; color: #fff; overflow: hidden; }
.plan-banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(37,104,241,.98) 0%, rgba(37,104,241,.72) 47%, transparent 78%); }
.plan-banner div { position: relative; z-index: 1; }
.plan-banner strong, .plan-banner span { display: block; white-space: nowrap; }
.plan-banner strong { font-size: 25px; line-height: 1.25; }
.plan-banner span { margin-top: 5px; font-size: 17px; }
.amount-section { margin-top: 20px; }
.amount-section h2, .instructions > h2 { margin: 0 0 17px; padding-left: 15px; border-left: 5px solid #a243ee; font-size: 15px; line-height: 23px; }
.amount-section h2 small { color: #99949d; font-size: 11px; font-weight: 400; }
.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 17px 14px; }
.amount-grid button { position: relative; height: 44px; padding: 0; border: 1px solid #e1d5f9; border-radius: 8px; background: #f2effa; color: #918d96; font-size: 16px; cursor: pointer; transition: .18s ease; }
.amount-grid button.active { border-color: transparent; background: linear-gradient(115deg, #ad53f5, #7926d4); color: #fff; font-weight: 700; box-shadow: 0 8px 18px rgba(138,49,218,.16); }
.amount-grid em { position: absolute; right: -2px; top: -17px; padding: 4px 6px; border-radius: 5px 5px 0 5px; background: #a342ec; color: #fff; font-size: 9px; font-style: normal; line-height: 15px; }
.custom-amount { height: 44px; display: flex; align-items: center; margin-top: 20px; padding: 0 16px; border: 1px solid #e1d5f9; border-radius: 11px; background: #f2effa; transition: .18s ease; }
.custom-amount.active { border-color: #a647eb; box-shadow: 0 0 0 3px rgba(166,71,235,.09); }
.custom-amount input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #4d4851; font-size: 17px; }
.custom-amount input::placeholder { color: #bcb7c2; }
.custom-amount span { color: #9d44e7; font-size: 12px; }
.participate-button { width: 100%; height: 44px; margin-top: 29px; border: 0; border-radius: 10px; background: linear-gradient(100deg, #ad51f5, #7623d1); color: #fff; font-size: 15px; font-weight: 700; box-shadow: 0 10px 23px rgba(134,42,218,.18); cursor: pointer; }
.participate-button:disabled { cursor: not-allowed; opacity: .5; }
.instructions { margin-top: 29px; }
.instruction-card { padding: 0 15px; border: 1px solid #f2edf7; border-radius: 17px; background: #fff; box-shadow: 0 7px 20px rgba(88,47,129,.07); }
.instruction-card article { min-height: 76px; display: flex; align-items: center; gap: 13px; border-bottom: 1px solid #eeeaf0; }
.instruction-card article:last-child { border-bottom: 0; }
.instruction-card i { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(145deg, #af50f2, #7626d8); color: #fff; }
.instruction-card i img { width: 18px; }
.instruction-card strong, .instruction-card small { display: block; }
.instruction-card strong { color: #7b28d4; font-size: 14px; }
.instruction-card small { margin-top: 4px; color: #4c4c4c; font-size: 11px; }
@media (max-width: 390px) {
  .invest-view { padding-left: 11px; padding-right: 11px; }
  .plan-banner strong { font-size: 21px; }
  .plan-banner span { font-size: 14px; }
  .amount-grid { gap: 14px 10px; }
  .amount-grid button { font-size: 17px; }
}
</style>
