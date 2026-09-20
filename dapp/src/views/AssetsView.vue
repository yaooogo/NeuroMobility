<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  connected: { type: Boolean, default: false },
  totalAssets: { type: Number, default: 12580 },
  principal: { type: Number, default: 10000 },
  totalDividend: { type: Number, default: 15820 },
  monthlyDividend: { type: Number, default: 325 },
  order: {
    type: Object,
    default: () => ({
      distributed: 3214,
      nextDividendDays: 14,
      totalDividend: 63214,
      number: "N20260916154509",
      amount: 1000,
      joinedAt: "2026-09-16 15:45:09",
      waitingUntil: "2026-10-02 15:45:09",
      cycleDays: 30
    })
  }
});

const emit = defineEmits(["connect", "action"]);
const { lang } = useLocale();
const router = useRouter();
const shortcuts = computed(() => [
  { key: "deposit", icon: "card", label: lang("充值") },
  { key: "withdraw", icon: "withdraw", label: lang("提现") },
  { key: "deposit-records", icon: "file", label: lang("充提记录") },
  { key: "invite", icon: "mail", label: lang("邀请好友") }
]);

function amount(value, decimals = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
</script>

<template>
  <section class="assets-view">
    <header class="assets-header">
      <h1>{{ lang("资产") }}</h1>
    </header>

    <section class="balance-card">
      <span>{{ lang("总资产 (USDT)") }}</span>
      <strong>{{ amount(totalAssets) }}</strong>
      <div class="balance-breakdown">
        <span>{{ lang("参与本金") }}<b>{{ amount(principal) }}</b></span>
        <span>{{ lang("累计分红") }}<b>{{ amount(totalDividend) }}</b></span>
        <span>{{ lang("本月分红") }}<b>{{ amount(monthlyDividend) }}</b></span>
      </div>
    </section>

    <section class="asset-shortcuts">
      <button v-for="item in shortcuts" :key="item.key" type="button" @click="emit('action', item)">
        <AppIcon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </section>

    <section class="orders-section">
      <h2>{{ lang("我的订单") }}</h2>
      <article class="order-card">
        <div class="order-summary">
          <span>{{ lang("已分红") }}<b>{{ amount(order.distributed, 0) }} U</b></span>
          <span>{{ lang("距离下次分红") }}<b>{{ order.nextDividendDays }}{{ lang("天") }}</b></span>
          <span>{{ lang("总分红") }}<b>{{ amount(order.totalDividend, 0) }} U</b></span>
        </div>
        <dl>
          <div><dt>{{ lang("订单编号") }}</dt><dd>{{ order.number }}</dd></div>
          <div><dt>{{ lang("参与金额") }}</dt><dd>{{ amount(order.amount, 0) }} USDT</dd></div>
          <div><dt>{{ lang("参与时间") }}</dt><dd>{{ order.joinedAt }}</dd></div>
          <div><dt>{{ lang("等待期") }}</dt><dd>{{ order.waitingUntil }}</dd></div>
          <div><dt>{{ lang("分红周期") }}</dt><dd>·{{ order.cycleDays }}{{ lang("天") }}</dd></div>
        </dl>
        <div class="order-actions">
          <button type="button" @click="emit('action', { key: 'details', order })">{{ lang("查看详情") }}</button>
          <button type="button" @click="emit('action', { key: 'add-investment', order })">{{ lang("追加投资") }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.assets-view { min-height: calc(100vh - 78px); padding: 0 15px 29px; background: #fff; color: #37333a; }
.assets-header { height:60px; display: flex; justify-content: center; align-items: center; padding: max(18px, env(safe-area-inset-top)) 0 18px; }
.assets-header h1 { display: flex; justify-content: center; margin: 0; text-align: center; color: #151317; font-size: 16px; line-height: 32px; }
.assets-header button { width: 40px; height: 31px; display: grid; place-items: start; padding: 4px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.assets-header button svg { width: 25px; transform: rotate(180deg); }
.balance-card { min-height: 161px; padding: 17px 15px 16px; border-radius: 11px; background: linear-gradient(112deg, #8454ff, #4d2eea); color: #fff; box-shadow: 0 12px 28px rgba(76,45,227,.17); }
.balance-card > span { font-size: 13px; }
.balance-card > strong { display: block; margin-top: 7px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,.13); font-size: 31px; line-height: 1.15; letter-spacing: .5px; }
.balance-breakdown { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px; margin-top: 13px; }
.balance-breakdown span { font-size: 12px; }
.balance-breakdown b { display: block; margin-top: 7px; font-size: 17px; }
.asset-shortcuts { height: 105px; display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 20px; padding: 18px 4px 13px; border: 1px solid #f0ebf6; border-radius: 17px; background: #fff; box-shadow: 0 7px 19px rgba(84,49,120,.08); }
.asset-shortcuts button { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0; border: 0; background: transparent; color: #3f3a42; font-size: 13px; cursor: pointer; }
.asset-shortcuts svg { width: 30px; height: 30px; padding: 4px; border-radius: 8px; background: linear-gradient(145deg, #b752f1, #8c3bec); color: #fff; stroke-width: 2; }
.orders-section { margin-top: 17px; }
.orders-section > h2 { margin: 0 0 17px; padding-left: 15px; border-left: 5px solid #9f3fe9; font-size: 16px; line-height: 23px; }
.order-card { padding: 20px; border: 1px solid #f1edf5; border-radius: 17px; background: #fff; box-shadow: 0 7px 21px rgba(88,48,125,.07); }
.order-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 14px; border-radius: 10px; background: #f0ecfb; }
.order-summary span { min-width: 0; color: #5a555e; font-size: 12px; white-space: nowrap; }
.order-summary b { display: block; margin-top: 5px; color: #8d37e1; font-size: 18px; }
.order-card dl { margin: 16px 0 19px; }
.order-card dl > div { min-height: 37px; display: grid; grid-template-columns: 92px minmax(0, 1fr); align-items: center; border-bottom: 1px solid #eeeaf0; font-size: 13px; }
.order-card dl > div:last-child { border-bottom: 0; }
.order-card dt { font-weight: 600; }
.order-card dd { min-width: 0; margin: 0; overflow: hidden; color: #5e5961; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.order-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.order-actions button { height: 53px; border: 1px solid #9e40eb; border-radius: 10px; background: #fff; color: #a443ec; font-size: 16px; cursor: pointer; }
.order-actions button:last-child { border: 0; background: linear-gradient(105deg, #ad52f4, #7825d2); color: #fff; }
@media (max-width: 390px) {
  .assets-view { padding-left: 10px; padding-right: 10px; }
  .balance-card { padding-left: 12px; padding-right: 12px; }
  .balance-breakdown { gap: 6px; }
  .balance-breakdown b { font-size: 15px; }
  .order-card { padding: 15px; }
  .order-summary { padding-left: 10px; padding-right: 10px; }
  .order-summary b { font-size: 16px; }
}
</style>
