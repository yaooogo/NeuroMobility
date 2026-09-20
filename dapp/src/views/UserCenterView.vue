<script setup>
import { computed } from "vue";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
const requireAsset = (assetPath) => globalThis.require(assetPath);

defineOptions({ inheritAttrs: false });
const props = defineProps({
  address: { type: String, default: "" },
  connected: { type: Boolean, default: false },
  currentLevel: { type: Number, default: 1 },
  nextLevel: { type: Number, default: 2 },
  currentAmount: { type: Number, default: 0 },
  targetAmount: { type: Number, default: 20000 }
});

const emit = defineEmits(["connect", "copy", "logout", "action"]);
const { lang } = useLocale();

const displayAddress = computed(() => {
  if (!props.address) return lang("连接钱包");
  return `${props.address.slice(0, 5)}...${props.address.slice(-4)}`;
});
const progress = computed(() => Math.min(100, Math.max(0, (props.currentAmount / props.targetAmount) * 100)));
const menuItems = computed(() => [
  { key: "invite", icon: requireAsset("@assets/images/icons/invite.png"), title: lang("邀请好友"), description: lang("分享挚友·共赢未来") },
  { key: "team", icon: requireAsset("@assets/images/icons/team.png"), title: lang("我的团队"), description: lang("团队管理·共同成长") },
  { key: "help", icon: requireAsset("@assets/images/icons/help.png"), title: lang("帮助中心"), description: lang("常见问题解答") },
  { key: "about", icon: requireAsset("@assets/images/icons/invite.png"), title: lang("关于我们"), description: lang("了解Neuro") }
]);

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function handleMenuClick(item) {
  emit("action", item);
}
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
          <div v-if="props.address" class="rank-pill"><AppIcon name="badge" />{{ lang("县级合伙人") }}</div>
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
          <strong>L{{ currentLevel }}</strong>
          <span class="level-arrow"><AppIcon name="chevron" /></span>
          <strong>L{{ nextLevel }}</strong>
        </div>
        <div class="level-percent"><span>{{ Math.round(progress) }}%</span><span>50%</span><span>100%</span></div>
        <div class="level-track"><i :style="{ width: `${Math.max(4, progress)}%` }"></i></div>
        <div class="level-amount"><span>{{ formatAmount(currentAmount) }}USDT</span><span>{{ formatAmount(targetAmount) }}USDT</span></div>
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
.rank-pill { height: 25px; display: flex; align-items: center; gap: 5px; padding: 0 12px; border-radius: 14px; background: #ffd68c; color: #d37208; font-size: 12px; }
.rank-pill svg { width: 15px; }
.profile-content { position: relative; z-index: 3; margin-top: -50px; padding: 0 16px 26px; }
.level-card, .menu-card { border: 1px solid rgba(133,80,190,.05); background: rgba(255,255,255,.96); box-shadow: 0 6px 22px rgba(88,47,129,.08); }
.level-card { position: relative; min-height: 174px; margin-top: -1px; padding: 21px 20px 17px; border-radius: 19px; overflow: hidden; background: url("../assets/images/level-card-bg.jpg") #fff no-repeat center -20px; background-size: auto 120%; }
.level-head, .level-values, .level-percent, .level-amount { position: relative; display: flex; justify-content: space-between; }
.level-head { color: #404040 ; font-size: 13px; }
.level-values { align-items: center; margin-top: 11px; color: #9d43e9; }
.level-values strong { font-size: 25px; line-height: 1; color: transparent; background-clip: text;background-image: linear-gradient(90deg, #A95CF8 0%, #7428C6 100%);}
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
.mobility-banner strong { display: block; font-size: 22px; line-height: 1.2; }
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
