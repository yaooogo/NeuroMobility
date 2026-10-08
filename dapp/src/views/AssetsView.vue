<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import AssetTransferDialog from "../components/AssetTransferDialog.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAssetOverview, requestInvestmentOrders } from "../lib/api.js";
import dividendToken from "../assets/images/dividend-token.png";

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
const transferOverview = ref({ balance: "0", frozen_balance: "0", token: {} });
const overview = ref({ balance: "0", frozen_balance: "0", token: {}, assets: [] });
const investmentData = ref({ items: [], principal: "0", total_dividend: "0", monthly_dividend: "0" });

const assetCards = computed(() => {
  const assets = Array.isArray(overview.value?.assets) ? overview.value.assets : [];
  const rows = assets.length ? assets : [overview.value].filter((item) => item?.token?.symbol || item?.token?.value);
  return rows.map(normalizeAsset).filter((item) => item.symbol);
});

const totalAssetBalance = computed(() => overview.value?.total_balance || addDecimalAmounts(
  ...assetCards.value.flatMap((item) => [item.balance, item.frozen_balance])
));

function normalizeAsset(asset) {
  const token = asset?.token || {};
  const symbol = token.symbol || token.value || "";
  return {
    ...asset,
    token,
    symbol,
    balance: String(asset?.balance || "0"),
    frozen_balance: String(asset?.frozen_balance || "0"),
    receiver_contract: overview.value?.receiver_contract || asset?.receiver_contract || "",
    withdrawal_contract: overview.value?.withdrawal_contract || asset?.withdrawal_contract || ""
  };
}

function amount(value, decimals = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function orderPaymentParts(order) {
  const parts = Array.isArray(order?.payment_parts) ? order.payment_parts : [];
  if (parts.length) return parts;
  const token = String(order?.token || "USDT").toUpperCase();
  if (token !== "USDT+RUSDT") return [{ token, amount: order?.amount || "0" }];
  const total = Number(order?.amount || 0);
  const usdtPercent = Math.min(100, Math.max(0, Number(order?.mixed_usdt_percent ?? 0)));
  const usdt = total * usdtPercent / 100;
  return [
    { token: "USDT", amount: String(usdt) },
    { token: "RUSDT", amount: String(total - usdt) }
  ].filter((part) => Number(part.amount) > 0);
}

function orderAmountText(order) {
  return orderPaymentParts(order)
    .map((part) => `${amount(part.amount, 0)} ${part.token || "USDT"}`)
    .join(" + ");
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
    overview.value = { balance: "0", frozen_balance: "0", token: {}, assets: [] };
    return;
  }
  if (overview.value?.wallet && String(overview.value.wallet).toLowerCase() !== props.address.toLowerCase()) {
    overview.value = { balance: "0", frozen_balance: "0", token: {}, assets: [] };
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
  const target = new Date(String(value || "").replace(" ", "T")).getTime();
  return Number.isFinite(target) ? Math.max(0, Math.ceil((target - Date.now()) / 86400000)) : 0;
}

function canDeposit(asset) {
  return Number(asset?.token?.rechargeable || 0) === 1;
}

function canWithdraw(asset) {
  return Number(asset?.token?.withdrawable || 0) === 1;
}

async function handleAssetAction(mode, asset) {
  if (!props.connected || !localStorage.getItem("token")) {
    emit("connect");
    return;
  }
  await loadOverview(true);
  const latest = assetCards.value.find((item) => item.symbol === asset.symbol) || asset;
  if (!latest?.token?.contract) return;
  if (mode === "deposit" && !canDeposit(latest)) {
    emit("notice", { message: lang("当前资产暂不支持充值"), type: "error" });
    return;
  }
  if (mode === "withdraw" && !canWithdraw(latest)) {
    emit("notice", { message: lang("当前资产暂不支持提现"), type: "error" });
    return;
  }
  transferMode.value = mode;
  transferOverview.value = latest;
  transferVisible.value = true;
}

function openAssetRecords(asset) {
  if (!props.connected || !localStorage.getItem("token")) {
    emit("connect");
    return;
  }
  void router.push({ name: "transaction-records", query: { token: asset.symbol } });
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
      <span>{{ lang("总资产 (USDT + RUSDT)") }}</span>
      <strong>{{ amount(totalAssetBalance) }}</strong>
      <div class="balance-breakdown">
        <span>{{ lang("参与本金") }}<b>{{ amount(investmentData.principal) }}</b></span>
        <span>{{ lang("累计分红") }}<b>{{ amount(investmentData.total_dividend) }}</b></span>
        <span>{{ lang("本月分红") }}<b>{{ amount(investmentData.monthly_dividend) }}</b></span>
      </div>
    </section>

    <section class="asset-list">
      <article v-for="asset in assetCards" :key="asset.symbol" class="asset-card">
        <button class="asset-record-link" type="button" :aria-label="`${asset.symbol} ${lang('充提记录')}`" @click="openAssetRecords(asset)">
          <span class="asset-token">
            <img :src="dividendToken">
            <b>{{ asset.symbol }}</b>
          </span>
          <strong>{{ amount(addDecimalAmounts(asset.balance, asset.frozen_balance)) }}</strong>
          <AppIcon name="chevron" />
        </button>
        <div v-if="canDeposit(asset) || canWithdraw(asset)" class="asset-actions">
          <button v-if="canDeposit(asset)" class="asset-action asset-action--deposit" type="button" @click="handleAssetAction('deposit', asset)">
            <AppIcon name="download" />
            <span>{{ lang("充值") }}</span>
          </button>
          <button v-if="canWithdraw(asset)" class="asset-action asset-action--withdraw" type="button" @click="handleAssetAction('withdraw', asset)">
            <AppIcon name="upload" />
            <span>{{ lang("提现") }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="orders-section">
      <h2>{{ lang("我的订单") }}</h2>
      <div v-if="!investmentData.items.length" class="empty-orders">{{ lang("暂无投资订单") }}</div>
      <article v-for="order in investmentData.items" :key="order.order_id" class="order-card">
        <div class="order-summary">
          <span>{{ lang("已分红") }}<b>{{ amount(order.distributed_amount, 0) }} U</b></span>
          <span>{{ lang("距离下次分红") }}<b>{{ nextDividendDays(order.next_dividend_at) }}{{ lang("天") }}</b></span>
          <span>{{ lang("总分红") }}<b>{{ amount(order.total_dividend, 0) }} U</b></span>
        </div>
        <dl>
          <div><dt>{{ lang("订单编号") }}</dt><dd>{{ order.order_id }}</dd></div>
          <div><dt>{{ lang("参与金额") }}</dt><dd>{{ orderAmountText(order) }}</dd></div>
          <div><dt>{{ lang("参与时间") }}</dt><dd>{{ order.created_at }}</dd></div>
          <div><dt>{{ lang("等待期") }}</dt><dd>{{ order.waiting_until }}</dd></div>
          <div><dt>{{ lang("分红周期") }}</dt><dd>{{ order.cycle_days }}{{ lang("天") }}</dd></div>
        </dl>
        <div class="order-actions">
          <button type="button" @click="emit('action', { key: 'add-investment', order })">{{ lang("追加投资") }}</button>
        </div>
      </article>
    </section>

    <AssetTransferDialog
      :visible="transferVisible"
      :mode="transferMode"
      :address="address"
      :overview="transferOverview"
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
.balance-card { min-height: 161px; padding: 17px 15px 16px; border-radius: 11px; background: linear-gradient(112deg, #8454ff, #4d2eea); color: #fff; box-shadow: 0 12px 28px rgba(76,45,227,.17); }
.balance-card > span { font-size: 13px; }
.balance-card > strong { display: block; margin-top: 7px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,.13); font-size: 31px; line-height: 1.15; letter-spacing: .5px; }
.balance-breakdown { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px; margin-top: 13px; }
.balance-breakdown span { font-size: 12px; }
.balance-breakdown b { display: block; margin-top: 7px; font-size: 17px; }
.asset-list { display: grid; gap: 18px; margin-top: 20px; }
.asset-card { padding:20px 15px; border: 1px solid #f0ebf6; border-radius: 12px; background: #fff; box-shadow: 0 7px 19px rgba(84,49,120,.08); }
.asset-record-link { width: 100%; min-height: 45px; display: grid; grid-template-columns: minmax(0, 1fr) auto 22px; align-items: center; gap: 10px; padding: 0; border: 0; background: transparent; color: #3f3a42; cursor: pointer; }
.asset-token { min-width: 0; display: flex; align-items: center; gap: 9px; }
.asset-token  img{ width: 32px;}
.asset-token b { overflow: hidden; font-size:17px; text-overflow: ellipsis; white-space: nowrap; }
.token-mark { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: #18b88c; color: #fff; font-size: 24px; font-style: normal; font-weight: 800; }
.asset-record-link > strong { color: #3f3a42; font-size: 17px; white-space: nowrap; }
.asset-record-link svg { width: 22px; color: #5a5660; }
.asset-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
.asset-action { min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 9px; border: 1px solid #a64df1; border-radius: 6px; background: #fff; color: #4a424e; font-size: 15px; cursor: pointer; }
.asset-action--deposit { border: 0; background: #a94ff0; color: #fff; }
.asset-actions svg { width: 19px; height: 19px; padding: 4px; border-radius: 50%; background: #F6EDFF;color: #a94ff0; box-sizing: content-box; }
.asset-action--deposit svg { color: #a94ff0;  background: #fff;}
.orders-section { margin-top: 17px; }
.orders-section > h2 { margin: 0 0 17px; padding-left: 15px; border-left: 5px solid #9f3fe9; font-size: 15px; line-height: 23px; }
.order-card { margin-top: 14px; padding: 15px; border: 1px solid #f1edf5; border-radius: 12px; background: #fff; box-shadow: 0 7px 21px rgba(88,48,125,.07); }
.empty-orders { padding: 36px 15px; border: 1px solid #f1edf5; border-radius: 12px; color: #aaa3ad; text-align: center; }
.order-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 14px; border-radius: 8px; background: #f0ecfb; }
.order-summary span { min-width: 0; color: #5a555e; font-size: 12px; white-space: nowrap; }
.order-summary b { display: block; margin-top: 5px; color: #8d37e1; font-size: 17px; }
.order-card dl { margin: 16px 0 19px 10px; }
.order-card dl > div { min-height: 37px; display: grid; grid-template-columns: 45% minmax(0, 1fr); align-items: center; border-bottom: 1px solid #eeeaf0; font-size: 13px; }
.order-card dl > div:last-child { border-bottom: 0; }
.order-card dt { font-weight: 600; }
.order-card dd { min-width: 0; margin: 0; overflow: hidden; color: #5e5961; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.order-actions { display: block; }
.order-actions button {width: 100%; height: 44px; border: 0; border-radius: 8px; background: linear-gradient(105deg, #ad52f4, #7825d2); color: #fff; font-size: 15px; cursor: pointer; }
@media (max-width: 390px) {
  .assets-view { padding-left: 10px; padding-right: 10px; }
  .balance-card { padding-left: 12px; padding-right: 12px; }
  .balance-breakdown { gap: 6px; }
  .balance-breakdown b { font-size: 15px; }
  .asset-card { padding: 18px 14px 24px; }
  .asset-actions { gap: 10px; }
  .asset-action { min-height: 46px; }
  .asset-record-link > strong, .asset-token b { font-size: 18px; }
  .order-card { padding: 15px; }
  .order-summary { padding-left: 10px; padding-right: 10px; }
  .order-summary b { font-size: 16px; }
}
</style>
