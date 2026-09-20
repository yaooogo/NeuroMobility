<script setup>
import { computed } from "vue";
import AppHeader from "../components/AppHeader.vue";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
const requireAsset = (assetPath) => globalThis.require(assetPath);

defineOptions({ inheritAttrs: false });

defineProps({
  walletLabel: { type: String, default: "" },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(["wallet-click", "notification-click", "action"]);
const { lang } = useLocale();
const quickActions = computed(() => [
  { key: "invest", label: lang("投资计划"), icon: requireAsset("@assets/images/icons/coin.png") },
  { key: "cars", label: lang("车辆信息"), icon: requireAsset("@assets/images/icons/car.png") },
  { key: "records", label: lang("分红记录"), icon: requireAsset("@assets/images/icons/record.png") },
  { key: "invite", label: lang("邀请好友"), icon: requireAsset("@assets/images/icons/mail.png") }
]);
const highlights = computed(() => [
  { title: lang("真实租车业务"), sub: lang("实体资产支撑"), icon: requireAsset("@assets/images/icons/car.png") },
  { title: lang("月度分红"), sub: lang("共享经营收益"), icon: requireAsset("@assets/images/icons/data.png") },
  { title: lang("资金安全透明"), sub: lang("链上可查"), icon: requireAsset("@assets/images/icons/share.png") },
  { title: lang("合伙人体系"), sub: lang("收益多元化"), icon: requireAsset("@assets/images/icons/partner.png") }
]);
</script>

<template>
  <section class="home-view">
    <section class="hero">
      <div class="hero__image" role="img" :aria-label="lang('租车投资')"></div>
      <div class="hero__shade"></div>
      <AppHeader
        :wallet-label="walletLabel"
        :loading="loading"
        @wallet-click="emit('wallet-click')"
        @notification-click="emit('notification-click')"
      />
    </section>

    <section class="content-card">
      <div class="quick-grid">
        <button v-for="item in quickActions" :key="item.key" type="button" class="quick-item" @click="emit('action', item)">
          <span class="icon-tile"><img :src="item.icon" /></span><span>{{ item.label }}</span>
        </button>
      </div>

      <div class="stats-grid">
        <article><span>{{ lang('平台运营车辆') }}</span><strong>1,258 <small>{{ lang('台') }}</small></strong><i><img :src='requireAsset("@assets/images/icons/car.png")' /></i></article>
        <article><span>{{ lang('累计用户') }}</span><strong>56,320 <small>{{ lang('人') }}</small></strong><i><img :src='requireAsset("@assets/images/icons/user.png")' /></i></article>
      </div>

      <button class="investment-banner" type="button" @click="emit('action', { key: 'invest' })">
        <span><strong>{{ lang('租车投资 · 月度分红计划') }}</strong><small>{{ lang('真实投资运营｜稳定经营收益｜透明公开分配') }}</small></span>
        <b>{{ lang('立即投资') }} <AppIcon name="arrow" /></b>
      </button>

      <section class="highlights">
        <h2>{{ lang('项目亮点') }}</h2>
        <div class="highlight-grid">
          <article v-for="item in highlights" :key="item.title">
            <img :src="item.icon" /><strong>{{ item.title }}</strong><small>{{ item.sub }}</small>
          </article>
        </div>
      </section>

      <button class="partner-banner" type="button" @click="emit('action', { key: 'invite' })">
        <span class="crown"><img :src="requireAsset('@assets/images/crown.png')" /></span><span><strong>{{ lang('成为合伙人') }}</strong><small>{{ lang('与更多伙伴一起，建设全球出行生态') }}</small></span>
        <b>{{ lang('立即邀请') }} <AppIcon name="arrow" /></b>
      </button>
    </section>
  </section>
</template>
