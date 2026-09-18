<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";

defineOptions({ inheritAttrs: false });
defineProps({ connected: { type: Boolean, default: false } });
const emit = defineEmits(["connect", "action"]);
const { lang } = useLocale();
const router = useRouter();

const amountOptions = [1000, 2000, 5000, 10000, 20000, 50000];
const selectedAmount = ref(1000);
const customAmount = ref("");
const finalAmount = computed(() => Number(customAmount.value) || selectedAmount.value);
const canSubmit = computed(() => finalAmount.value >= 1000);
const instructions = computed(() => [
  { icon: "calendar", title: lang("15天等待期"), description: lang("投资成功后15天为等待期") },
  { icon: "hourglass", title: lang("第16天开始计算"), description: lang("之后30天为一个分红周期") },
  { icon: "coins", title: lang("月度分红 3%-10%"), description: lang("根据项目经营情况按区间发放") }
]);

function selectAmount(amount) {
  selectedAmount.value = amount;
  customAmount.value = "";
}

function setCustomAmount(event) {
  customAmount.value = event.target.value.replace(/[^\d.]/g, "");
  if (customAmount.value) selectedAmount.value = 0;
}

function submit() {
  if (!canSubmit.value) return;
  emit("action", { key: "participate", amount: finalAmount.value });
}
</script>

<template>
  <section class="invest-view">
    <header class="invest-header">
      <button type="button" :aria-label="lang('返回首页')" @click="router.push({ name: 'home' })"><AppIcon name="chevron" /></button>
      <h1>{{ lang("投资计划") }}</h1>
      <span></span>
    </header>

    <section class="plan-banner">
      <div>
        <strong>{{ lang("商务出行创富计划") }}</strong>
        <span>{{ lang("共享真实资产·共享稳定收益") }}</span>
      </div>
    </section>

    <section class="amount-section">
      <h2>{{ lang("参与金额") }} <small>({{ lang("最低 1,000 U") }})</small></h2>
      <div class="amount-grid">
        <button
          v-for="amount in amountOptions"
          :key="amount"
          type="button"
          :class="{ active: selectedAmount === amount && !customAmount }"
          @click="selectAmount(amount)"
        >
          {{ amount.toLocaleString() }}
          <em v-if="amount === 50000">{{ lang("整车参与") }}</em>
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
      <button class="participate-button" type="button" :disabled="!canSubmit" @click="submit">{{ lang("立即参与") }}</button>
    </section>

    <section class="instructions">
      <h2>{{ lang("说明") }}</h2>
      <div class="instruction-card">
        <article v-for="item in instructions" :key="item.title">
          <i><AppIcon :name="item.icon" /></i>
          <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.invest-view { min-height: calc(100vh - 78px); padding: 0 16px 29px; background: #fff; color: #363239; }
.invest-header { height: 86px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 18px; }
.invest-header h1 { align-self: end; margin: 0; text-align: center; color: #151317; font-size: 20px; line-height: 32px; }
.invest-header button { width: 40px; height: 32px; display: grid; place-items: start; padding: 5px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.invest-header button svg { width: 25px; transform: rotate(180deg); }
.plan-banner { position: relative; height: 138px; display: flex; align-items: center; padding: 0 16px; border-radius: 12px; background: #246af4 url("../assets/images/invest-plan-hero.jpg") center/cover no-repeat; color: #fff; overflow: hidden; }
.plan-banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(37,104,241,.98) 0%, rgba(37,104,241,.72) 47%, transparent 78%); }
.plan-banner div { position: relative; z-index: 1; }
.plan-banner strong, .plan-banner span { display: block; white-space: nowrap; }
.plan-banner strong { font-size: 25px; line-height: 1.25; }
.plan-banner span { margin-top: 5px; font-size: 17px; }
.amount-section { margin-top: 20px; }
.amount-section h2, .instructions > h2 { margin: 0 0 17px; padding-left: 15px; border-left: 5px solid #a243ee; font-size: 16px; line-height: 23px; }
.amount-section h2 small { color: #99949d; font-size: 11px; font-weight: 400; }
.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 17px 14px; }
.amount-grid button { position: relative; height: 54px; padding: 0; border: 1px solid #e1d5f9; border-radius: 11px; background: #f2effa; color: #918d96; font-size: 20px; cursor: pointer; transition: .18s ease; }
.amount-grid button.active { border-color: transparent; background: linear-gradient(115deg, #ad53f5, #7926d4); color: #fff; font-weight: 700; box-shadow: 0 8px 18px rgba(138,49,218,.16); }
.amount-grid em { position: absolute; right: -2px; top: -17px; padding: 4px 6px; border-radius: 5px 5px 0 5px; background: #a342ec; color: #fff; font-size: 9px; font-style: normal; line-height: 15px; }
.custom-amount { height: 54px; display: flex; align-items: center; margin-top: 20px; padding: 0 16px; border: 1px solid #e1d5f9; border-radius: 11px; background: #f2effa; transition: .18s ease; }
.custom-amount.active { border-color: #a647eb; box-shadow: 0 0 0 3px rgba(166,71,235,.09); }
.custom-amount input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #4d4851; font-size: 17px; }
.custom-amount input::placeholder { color: #bcb7c2; }
.custom-amount span { color: #9d44e7; font-size: 12px; }
.participate-button { width: 100%; height: 53px; margin-top: 29px; border: 0; border-radius: 10px; background: linear-gradient(100deg, #ad51f5, #7623d1); color: #fff; font-size: 17px; font-weight: 700; box-shadow: 0 10px 23px rgba(134,42,218,.18); cursor: pointer; }
.participate-button:disabled { cursor: not-allowed; opacity: .5; }
.instructions { margin-top: 29px; }
.instruction-card { padding: 0 15px; border: 1px solid #f2edf7; border-radius: 17px; background: #fff; box-shadow: 0 7px 20px rgba(88,47,129,.07); }
.instruction-card article { min-height: 76px; display: flex; align-items: center; gap: 13px; border-bottom: 1px solid #eeeaf0; }
.instruction-card article:last-child { border-bottom: 0; }
.instruction-card i { width: 45px; height: 45px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(145deg, #af50f2, #7626d8); color: #fff; }
.instruction-card i svg { width: 23px; }
.instruction-card strong, .instruction-card small { display: block; }
.instruction-card strong { color: #7b28d4; font-size: 15px; }
.instruction-card small { margin-top: 4px; color: #5f5a63; font-size: 11px; }
@media (max-width: 390px) {
  .invest-view { padding-left: 11px; padding-right: 11px; }
  .plan-banner strong { font-size: 21px; }
  .plan-banner span { font-size: 14px; }
  .amount-grid { gap: 14px 10px; }
  .amount-grid button { font-size: 17px; }
}
</style>
