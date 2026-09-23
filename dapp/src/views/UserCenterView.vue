<script setup>
import { computed, ref, watch } from "vue";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestProfile } from "../lib/api.js";
const requireAsset = (assetPath) => globalThis.require(assetPath);

defineOptions({ inheritAttrs: false });
const props = defineProps({
  address: { type: String, default: "" },
  connected: { type: Boolean, default: false },
  authenticated: { type: Boolean, default: false },
  currentLevel: { type: Number, default: 0 },
  nextLevel: { type: Number, default: 1 },
  currentAmount: { type: Number, default: 0 },
  targetAmount: { type: Number, default: 20000 }
});

const emit = defineEmits(["connect", "copy", "logout", "action"]);
const { lang } = useLocale();
const profileLevel = ref(null);
const profileProgress = ref(null);

const displayAddress = computed(() => {
  if (!props.address) return lang("连接钱包");
  return `${props.address.slice(0, 5)}...${props.address.slice(-4)}`;
});
const progress = computed(() => profileProgress.value?.percent
  ?? Math.min(100, Math.max(0, (props.currentAmount / props.targetAmount) * 100)));
const levelMap = {
  0: { label: "普通会员", icon: "" },
  1: { label: "区域合伙人", icon: requireAsset("@assets/images/level/1.png") },
  2: { label: "城市合伙人", icon: requireAsset("@assets/images/level/2.png") },
  3: { label: "战略合伙人", icon: requireAsset("@assets/images/level/3.png") }
};
function getLevelInfo(level) {
  const numericLevel = Number(level);
  const normalizedLevel = Math.min(3, Math.max(0, Number.isFinite(numericLevel) ? Math.trunc(numericLevel) : 0));
  return { level: normalizedLevel, ...levelMap[normalizedLevel] };
}
const displayedCurrentLevel = computed(() => profileLevel.value ?? props.currentLevel);
const displayedNextLevel = computed(() => profileProgress.value?.nextLevel ?? (profileLevel.value === null
  ? props.nextLevel
  : Math.min(3, displayedCurrentLevel.value + 1)));
const displayedCommunityInvests = computed(() => profileProgress.value?.communityInvests ?? props.currentAmount);
const displayedTargetAmount = computed(() => profileProgress.value?.targetAmount ?? props.targetAmount);
const currentLevelInfo = computed(() => getLevelInfo(displayedCurrentLevel.value));
const nextLevelInfo = computed(() => getLevelInfo(displayedNextLevel.value));
const menuItems = computed(() => [
  { key: "invite", icon: requireAsset("@assets/images/icons/invite.png"), title: lang("邀请好友"), description: lang("分享挚友·共赢未来") },
  { key: "team", icon: requireAsset("@assets/images/icons/team.png"), title: lang("我的团队"), description: lang("团队管理·共同成长") },
  { key: "help", icon: requireAsset("@assets/images/icons/help.png"), title: lang("帮助中心"), description: lang("常见问题解答") },
  { key: "about", icon: requireAsset("@assets/images/icons/invite.png"), title: lang("关于我们"), description: lang("了解Neuro") }
]);

function formatAmount(value) {
  const text = String(value ?? '0').trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text)) return '0';
  const [integerPart, fractionPart = ''] = text.split('.');
  const integer = BigInt(integerPart || '0').toLocaleString();
  const fraction = fractionPart.slice(0, 2).replace(/0+$/u, '');
  return fraction ? `${integer}.${fraction}` : integer;
}

function handleMenuClick(item) {
  emit("action", item);
}

async function loadProfile() {
  if (!props.connected || !props.authenticated || !localStorage.getItem("token")) {
    profileLevel.value = null;
    profileProgress.value = null;
    return;
  }
  try {
    const data = await requestProfile();
    const level = Number(data?.effective_level);
    profileLevel.value = Number.isFinite(level) ? level : null;
    const percent = Number(data?.level_progress_percent);
    const nextLevel = Number(data?.next_level);
    profileProgress.value = {
      communityInvests: String(data?.community_invests ?? '0'),
      targetAmount: String(data?.next_level_amount ?? '0'),
      nextLevel: Number.isFinite(nextLevel) ? nextLevel : Math.min(3, level + 1),
      percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
    };
  } catch {
    profileLevel.value = null;
    profileProgress.value = null;
  }
}

watch(() => [props.connected, props.authenticated, props.address], loadProfile, { immediate: true });
</script>

<template>
  <section class="profile-page">
    <header class="profile-hero">
      <div class="profile-hero__shade"></div>
      <button class="identity" type="button" @click="emit('connect')">
        <span class="avatar"><span class="avatar__mark"><img :src="requireAsset('@assets/images/min-logo.png')" /></span></span>
        <span class="identity__text">
          <strong v-if="props.address">NEURO</strong>
          <strong v-else>{{ lang('点击登录') }}</strong>
          <span v-if="props.address">{{ displayAddress }}  <img  :src="requireAsset('@assets/images/icons/copy.png')" class="copy-icon" name="copy" @click.stop="emit('copy')" /> </span>
          <div v-if="props.address" class="rank-pill" :class="`rank-pill--level-${currentLevelInfo.level}`"><img v-if="currentLevelInfo.icon" :src="currentLevelInfo.icon" />{{ lang(currentLevelInfo.label) }}</div>
        </span>
      </button>
    </header>

    <div class="profile-content">
      <section class="level-card">
        <div class="level-head">
          <span>{{ lang("当前级别") }}</span>
          <span>{{ lang("下一级别") }}</span>
        </div>
        <div class="level-values">
          <strong>L{{ currentLevelInfo.level }}</strong>
          <span class="level-arrow"><AppIcon name="chevron" /></span>
          <strong>L{{ nextLevelInfo.level }}</strong>
        </div>
        <div class="level-percent"><span>{{ Math.round(progress) }}%</span><span>50%</span><span>100%</span></div>
        <div class="level-track"><i :style="{ width: `${Math.max(4, progress)}%` }"></i></div>
        <div class="level-amount"><span>{{ formatAmount(displayedCommunityInvests) }} USDT</span><span>{{ formatAmount(displayedTargetAmount) }} USDT</span></div>
      </section>

      <section class="menu-card">
        <button v-for="item in menuItems" :key="item.key" type="button" @click="handleMenuClick(item)">
          <img class="menu-icon" :src="item.icon" />
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
          <AppIcon class="chevron" name="chevron" />
        </button>
        <button class="logout" type="button" @click="connected ? emit('logout') : emit('connect')" v-if="props.address">
          <AppIcon class="menu-icon" name="logout" />
          <strong>{{ connected ? lang("退出登录") : lang("连接钱包") }}</strong>
          <span>{{ connected ? lang("安全退出当前账户") : lang("连接后查看账户信息") }}</span>
          <AppIcon class="chevron" name="chevron" />
        </button>
      </section>

      <button class="mobility-banner" type="button" @click="emit('action', { key: 'invest' })">
        <span><strong>{{ lang("投资共享出行未来") }}</strong><small>{{ lang("每一份收入，都是更美好的出行") }}</small></span>
      </button>
    </div>

  </section>
</template>

<style scoped>
.profile-page { min-height: calc(100vh - 78px); background: #fbfaff; }
.profile-hero { position: relative; height: 230px; padding: max(0px, calc(env(safe-area-inset-top) + 40px)) 30px 0; color: #fff; background: #7024d8 url("../assets/images/profile-hero.jpg")  center -30px no-repeat; background-size: auto 96%; overflow: hidden; }
.profile-hero__shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(116, 40, 198, 0.6) 70%, #FFFFFF 100%);
 }
.identity {margin-top: 30px;  position: relative; z-index: 1; display: grid; grid-template-columns: 92px minmax(0,1fr) 19px; align-items: center; gap: 15px; padding: 0; border: 0; background: transparent; color: #fff; text-align: left; cursor: pointer; }
.avatar { width: 80px; height: 80px; display: grid; place-items: center; border-radius: 50%; background: #fff; box-shadow: 0 9px 28px rgba(49,0,105,.2); }
.avatar__mark { width: 42px;  display: grid; place-items: center; }
.avatar__mark img{ width: 100%;}
.identity__text { display: flex; flex-direction: column; gap: 3px;}
.identity__text strong { display: block;  font-size: 20px; letter-spacing: .2px; }
.identity__text span { display: flex; gap: 8px; display: flex; align-items: center; color: rgba(255,255,255,.9); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.copy-icon { width:14px; }
.rank-pill { width: fit-content; min-height: 28px; display: flex; align-items: center; gap: 6px; margin-top: 3px; padding: 2px 13px 2px 7px; border-radius: 16px; font-size: 11px;  border: 1px solid #fff;}
.rank-pill img { width: 20px; height: 20px; object-fit: contain; }
.rank-pill--level-0 { padding-left: 13px; background: rgba(255,255,255,.2); color: #fff; }
.rank-pill--level-1 { background: linear-gradient(90deg, #C7FFCA 0%, #9FFFA4 100%); color: #008710; }
.rank-pill--level-2 { background: linear-gradient(90deg, #C7CEFF 0%, #9FA2FF 100%); color: #523CE6; }
.rank-pill--level-3 { background: linear-gradient(90deg, #E6CDFF 0%, #CA9FFF 100%); color:#7428C6; }
.profile-content { position: relative; z-index: 3; margin-top: -50px; padding: 0 16px 26px; }
.level-card, .menu-card { border: 1px solid rgba(133,80,190,.05); background: rgba(255,255,255,.96); box-shadow: 0 6px 22px rgba(88,47,129,.08); }
.level-card { position: relative; min-height: 174px; margin-top: -1px; padding: 21px 20px 17px; border-radius: 19px; overflow: hidden; background: url("../assets/images/level-card-bg.jpg") #fff no-repeat center -20px; background-size: auto 120%; }
.level-head, .level-values, .level-percent, .level-amount { position: relative; display: flex; justify-content: space-between; }
.level-head { color: #404040 ; font-size: 13px; }
.level-values { align-items: center; margin-top: 11px; color: #9d43e9; }
.level-values strong { display: flex; align-items: center; gap: 7px; font-size: 25px; line-height: 1; color: #8233d5; }
.level-values strong img { width: 34px; height: 34px; object-fit: contain; }
.level-arrow { width: 16px; height: 16px; display: grid; place-items: center; border: 2px solid #9d43e9; border-radius: 50%; }
.level-arrow svg { width: 13px; }
.level-percent { margin-top: 16px; color: #4f4b55; font-size: 13px; }
.level-track { position: relative; height: 14px; margin-top: 6px; border-radius: 7px; background: #eee9f7; overflow: hidden; }
.level-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #ba5bfc, #7e27d4); transition: width .4s ease; }
.level-amount { margin-top: 7px; color: #a5a0a9; font-size: 13px; }
.menu-card { margin-top: 18px; padding: 18px 19px; border-radius: 19px; }
.menu-card button { width: 100%; height: 51px; display: grid; grid-template-columns: 25px minmax(90px,1fr) auto 17px; align-items: center; gap: 9px; padding: 0; border: 0; border-bottom: 1px solid #eeeaf1; background: transparent; color: #3c3940; text-align: left; cursor: pointer; }
.menu-card button:last-child { border-bottom: 0; }
.menu-icon { width: 18px; color: #aa49f4; }
.menu-card strong { font-size: 13px; white-space: nowrap; }
.menu-card button > span { color: #65616a; font-size: 13px; white-space: nowrap; }
.menu-card .chevron { width: 18px; color: #1f1e22; }
.menu-card .logout .menu-icon, .menu-card .logout strong { color: #ff541f; }
.mobility-banner { position: relative; width: 100%; height: 123px; margin-top: 18px; padding: 0; border: 0; border-radius: 11px; background: #2171e9 url("../assets/images/profile-banner.jpg") center/cover no-repeat; color: #fff; text-align: left; overflow: hidden; cursor: pointer; }
.mobility-banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(24,101,235,.94) 0%, rgba(29,107,235,.77) 40%, transparent 70%); }
.mobility-banner > span { position: relative; z-index: 1; display: block; padding: 33px 14px; }
.mobility-banner strong { display: block; font-size: 20px; line-height: 1.2; }
.mobility-banner small { display: block; margin-top: 7px; font-size: 13px; }
@media (max-width: 390px) {
  .profile-hero { padding-left: 21px; padding-right: 21px; }
  .identity { grid-template-columns: 80px minmax(0,1fr) 17px; gap: 11px; }
  .avatar { width: 80px; height: 80px; }
  .rank-pill { left: 113px; }
  .profile-content { padding-left: 10px; padding-right: 10px; }
  .menu-card { padding-left: 14px; padding-right: 14px; }
  .menu-card button { grid-template-columns: 23px minmax(76px,1fr) auto 15px; gap: 7px; }
  .menu-card button > span { font-size: 11px; }
  .mobility-banner strong { font-size: 18px; }
}
</style>
