<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import AssetTransferDialog from "../components/AssetTransferDialog.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAssetOverview, requestInvestmentOrders } from "../lib/api.js";
const requireAsset = (assetPath) => globalThis.require(assetPath);

defineOptions({ inheritAttrs: false });
const props = defineProps({
  connected: { type: Boolean, default: false },
  authenticated: { type: Boolean, default: false },
  address: { type: String, default: "" }
});

const emit = defineEmits(["connect", "action", "notice"]);
const { lang } = useLocale();
const router = useRouter();
const transferVisible = ref(false);
const transferMode = ref("deposit");
const overview = ref({ balance: "0", frozen_balance: "0", token: {} });
const investmentData = ref({ items: [], principal: "0", total_dividend: "0", monthly_dividend: "0" });
const totalAssetBalance = computed(() => addDecimalAmounts(
  overview.value?.balance,
  overview.value?.frozen_balance
));
const shortcuts = computed(() => [
  { key: "deposit", icon: requireAsset("@assets/images/icons/card.png"), label: lang("充值") },
  { key: "withdraw", icon: requireAsset("@assets/images/icons/withdraw.png"), label: lang("提现") },
  { key: "deposit-records", icon: requireAsset("@assets/images/icons/file.png"), label: lang("充提记录") },
  { key: "invite", icon: requireAsset("@assets/images/icons/mail1.png"), label: lang("邀请好友") }
]);

function amount(value, decimals = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function addDecimalAmounts(...values) {
  const normalized = values.map((value) => {
    const text = String(value ?? "0").trim();
    return /^\d+(?:\.\d+)?$/u.test(text) ? text : "0";
  });
  const precision = Math.max(0, ...normalized.map((value) => (value.split(".")[1] || "").length));
  const total = normalized.reduce((sum, value) => {
    const [integer, fraction = ""] = value.split(".");
    return sum + BigInt(`${integer}${fraction.padEnd(precision, "0")}`);
  }, 0n);
  if (!precision) return total.toString();
  const digits = total.toString().padStart(precision + 1, "0");
  const fraction = digits.slice(-precision).replace(/0+$/u, "");
  return fraction ? `${digits.slice(0, -precision)}.${fraction}` : digits.slice(0, -precision);
}

async function loadOverview(showError = false) {
  if (!props.connected || !props.authenticated || !localStorage.getItem("token")) {
    overview.value = { balance: "0", frozen_balance: "0", token: {} };
    return;
  }
  if (overview.value?.wallet && String(overview.value.wallet).toLowerCase() !== props.address.toLowerCase()) {
    overview.value = { balance: "0", frozen_balance: "0", token: {} };
  }
  try {
    overview.value = await requestAssetOverview();
  } catch (error) {
    if (showError && Number(error?.code) !== 401) emit("notice", { message: error?.message || lang("加载失败"), type: "error" });
  }
}

async function loadInvestments(showError = false) {
  if (!props.connected || !props.authenticated || !localStorage.getItem("token")) {
    investmentData.value = { items: [], principal: "0", total_dividend: "0", monthly_dividend: "0" };
    return;
  }
  try { investmentData.value = await requestInvestmentOrders(); }
  catch (error) {
    if (showError && Number(error?.code) !== 401) emit("notice", { message: error?.message || lang("加载失败"), type: "error" });
  }
}

function nextDividendDays(value) {
  const target = new Date(String(value || '').replace(' ', 'T')).getTime();
  return Number.isFinite(target) ? Math.max(0, Math.ceil((target - Date.now()) / 86400000)) : 0;
}

async function handleShortcut(item) {
  if (item.key !== "deposit" && item.key !== "withdraw") {
    emit("action", item);
    return;
  }
  if (!props.connected) {
    emit("connect");
    return;
  }
  if (!localStorage.getItem("token")) {
    emit("connect");
    return;
  }
  await loadOverview(true);
  if (!overview.value?.token?.contract) return;
  transferMode.value = item.key;
  transferVisible.value = true;
}

function handleTransferSuccess(result) {
  transferVisible.value = false;
  emit("notice", { message: result.type === "deposit" ? lang("充值交易已确认，余额将在区块同步后更新") : lang("提现成功"), type: "success" });
  void loadOverview();
}

watch(() => [props.connected, props.authenticated, props.address], () => {
  void loadOverview(); void loadInvestments();
}, { immediate: true });
</script>

<template>
  <section class="assets-view">
    <header class="assets-header">
      <h1>{{ lang("资产") }}</h1>
    </header>

    <section class="balance-card">
      <span>{{ lang("总资产 (USDT)") }}</span>
      <strong>{{ amount(totalAssetBalance) }}</strong>
      <div class="balance-breakdown">
        <span>{{ lang("参与本金") }}<b>{{ amount(investmentData.principal) }}</b></span>
        <span>{{ lang("累计分红") }}<b>{{ amount(investmentData.total_dividend) }}</b></span>
        <span>{{ lang("本月分红") }}<b>{{ amount(investmentData.monthly_dividend) }}</b></span>
      </div>
    </section>

    <section class="asset-shortcuts">
      <button v-for="item in shortcuts" :key="item.key" type="button" @click="handleShortcut(item)">
        <img :src="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </section>

    <section class="orders-section">
      <h2>{{ lang("我的订单") }}</h2>
      <div v-if="!investmentData.items.length" class="empty-orders">{{ lang('暂无投资订单') }}</div>
      <article v-for="order in investmentData.items" :key="order.order_id" class="order-card">
        <div class="order-summary">
          <span>{{ lang("已分红") }}<b>{{ amount(order.distributed_amount, 0) }} U</b></span>
          <span>{{ lang("距离下次分红") }}<b>{{ nextDividendDays(order.next_dividend_at) }}{{ lang("天") }}</b></span>
          <span>{{ lang("总分红") }}<b>{{ amount(order.total_dividend, 0) }} U</b></span>
        </div>
        <dl>
          <div><dt>{{ lang("订单编号") }}</dt><dd>{{ order.order_id }}</dd></div>
          <div><dt>{{ lang("参与金额") }}</dt><dd>{{ amount(order.amount, 0) }} USDT</dd></div>
          <div><dt>{{ lang("参与时间") }}</dt><dd>{{ order.created_at }}</dd></div>
          <div><dt>{{ lang("等待期") }}</dt><dd>{{ order.waiting_until }}</dd></div>
          <div><dt>{{ lang("分红周期") }}</dt><dd>{{ order.cycle_days }}{{ lang("天") }}</dd></div>
        </dl>
        <div class="order-actions">
          <!-- <button type="button" @click="router.push({ name: 'invest-success', query: { order_id: order.order_id } })">{{ lang("查看详情") }}</button> -->
          <button type="button" @click="emit('action', { key: 'add-investment', order })">{{ lang("追加投资") }}</button>
        </div>
      </article>
    </section>

    <AssetTransferDialog
      :visible="transferVisible"
      :mode="transferMode"
      :address="address"
      :overview="overview"
      @close="transferVisible = false"
      @success="handleTransferSuccess"
      @notice="emit('notice', $event)"
    />
  </section>
</template>

<style scoped>
.assets-view { min-height: calc(100vh - 78px); padding: 0 15px 29px; background: #fff; color: #37333a; }
.assets-header { height:70px; display: flex; justify-content: center; align-items: center; padding: max(18px, env(safe-area-inset-top)) 0 18px; }
.assets-header h1 { display: flex; justify-content: center; margin: 0; text-align: center; color: #151317; font-size: 18px; line-height: 32px; }
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
.asset-shortcuts img { width: 26px; height: 26px;  }
.orders-section { margin-top: 17px; }
.orders-section > h2 { margin: 0 0 17px; padding-left: 15px; border-left: 5px solid #9f3fe9; font-size: 15px; line-height: 23px; }
.order-card { margin-top: 14px; padding: 15px; border: 1px solid #f1edf5; border-radius: 12px; background: #fff; box-shadow: 0 7px 21px rgba(88,48,125,.07); }
.empty-orders { padding: 36px 15px; border: 1px solid #f1edf5; border-radius: 12px; color: #aaa3ad; text-align: center; }
.order-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 14px; border-radius: 12px; background: #f0ecfb; }
.order-summary span { min-width: 0; color: #5a555e; font-size: 12px; white-space: nowrap; }
.order-summary b { display: block; margin-top: 5px; color: #8d37e1; font-size: 17px; }
.order-card dl { margin: 16px 0 19px 10px; }
.order-card dl > div { min-height: 37px; display: grid; grid-template-columns: 45% minmax(0, 1fr); align-items: center; border-bottom: 1px solid #eeeaf0; font-size: 13px; }
.order-card dl > div:last-child { border-bottom: 0; }
.order-card dt { font-weight: 600; }
.order-card dd { min-width: 0; margin: 0; overflow: hidden; color: #5e5961; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
/* .order-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } */
.order-actions { display: block; }
.order-actions button {width: 100%; height: 44px; border: 1px solid #9e40eb; border-radius: 8px; background: #fff; color: #a443ec; font-size: 15px; cursor: pointer; }
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
