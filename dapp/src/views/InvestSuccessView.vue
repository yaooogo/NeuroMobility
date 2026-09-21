<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLocale } from '../composables/useLocale.js';
import { requestInvestmentOrder } from '../lib/api.js';
const requireAsset = (assetPath) => globalThis.require(assetPath);
const route = useRoute(); const router = useRouter(); const { lang } = useLocale();
const order = ref(null); const error = ref('');
function amount(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }); }
onMounted(async () => {
  try { order.value = await requestInvestmentOrder(String(route.query.order_id || '')); }
  catch (err) { error.value = err.message || lang('加载投资订单失败'); }
});
</script>

<template>
  <section class="success-page">
    <header><button type="button" @click="router.back()">‹</button><h1>{{ lang('参与成功') }}</h1><span></span></header>
    <div class="success-hero"><img :src="requireAsset('@assets/images/invest-success.png')" /><h2>{{ lang('参与提交成功') }}</h2><p>{{ lang('让每一次参与，都通向更美好的出行未来') }}</p></div>
    <div v-if="error" class="state-error">{{ error }}</div>
    <dl v-else-if="order" class="order-info">
      <div><dt>{{ lang('订单编号') }}</dt><dd>{{ order.order_id }}</dd></div>
      <div><dt>{{ lang('参与金额') }}</dt><dd>{{ amount(order.amount) }} USDT</dd></div>
      <div><dt>{{ lang('参与时间') }}</dt><dd>{{ order.created_at }}</dd></div>
      <div><dt>{{ lang('等待期') }}</dt><dd>{{ order.waiting_until }}</dd></div>
      <div><dt>{{ lang('分红周期') }}</dt><dd>{{ order.cycle_days }}{{ lang('天') }}</dd></div>
    </dl>
    <button class="home-button" type="button" @click="router.push({ name: 'home' })">{{ lang('返回首页') }}</button>
  </section>
</template>

<style scoped>
.success-page { min-height: 100vh; padding: 0 16px 38px; background: linear-gradient(180deg,#faf5ff,#fff); color: #454047; }
header { height: 66px; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; padding-top: env(safe-area-inset-top); }
header h1 { margin: 0; color: #161319; text-align: center; font-size: 18px; }
header button { border: 0; background: transparent; color: #8230db; font-size: 38px; line-height: 1; cursor: pointer; }
.success-hero { padding: 20px 0 52px; text-align: center; }
.success-hero img { width: 215px; max-width:70vw; }
.success-hero h2 { margin: 18px 0 7px; font-size: 20px; }
.success-hero p { margin: 0; color: #aaa4ad; font-size: 11px; }
.order-info { margin: 0; padding: 22px 24px; border: 1px solid #f1eafa; border-radius: 12px; background: #fff; box-shadow: 0 8px 25px rgba(116,54,172,.08); }
.order-info div { min-height: 41px; display: grid; grid-template-columns: 95px 1fr; align-items: center; border-bottom: 1px solid #eeeaf1; }
.order-info div:last-child { border-bottom: 0; }
.order-info dt { font-size: 14px; }.order-info dd { margin: 0; text-align: right; font-size: 13px; }
.home-button { width: 100%; height: 44px; margin-top: 40px; border: 2px solid #a148ed; border-radius: 9px; background: #fff; color: #a148ed; font-size: 15px; font-weight: 700; cursor: pointer; }
.state-error { padding: 20px; color: #d83f74; text-align: center; }
</style>
