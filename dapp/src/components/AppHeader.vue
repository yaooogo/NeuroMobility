<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import defaultLogoSrc from "@assets/images/logo.png";

defineProps({
  walletLabel: {
    type: String,
    default: ""
  },
  loading: {
    type: Boolean,
    default: false
  },
  logoSrc: {
    type: String,
    default: defaultLogoSrc
  },
  logoHref: {
    type: String,
    default: "#"
  },
  showLanguage: {
    type: Boolean,
    default: true
  },
  showNotification: {
    type: Boolean,
    default: true
  },
  notificationCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(["wallet-click", "notification-click", "logo-click"]);
const { locale, currentLocale, supportedLocales, setLocale, lang } = useLocale();
const headerRef = ref(null);
const localeOpen = ref(false);

function selectLocale(value) {
  setLocale(value);
  localeOpen.value = false;
}

function closeLocaleMenu(event) {
  if (!headerRef.value?.contains(event.target)) localeOpen.value = false;
}

onMounted(() => document.addEventListener("click", closeLocaleMenu));
onBeforeUnmount(() => document.removeEventListener("click", closeLocaleMenu));
</script>

<template>
  <header ref="headerRef" class="topbar">
    <a class="brand" :href="logoHref" aria-label="NEURO" @click="emit('logo-click', $event)">
      <img :src="logoSrc" alt="NEURO" />
    </a>

    <div class="topbar__actions">
      <div v-if="showLanguage" class="locale" @click.stop>
        <button
          type="button"
          class="locale__trigger"
          :aria-label="lang('切换语言')"
          :aria-expanded="localeOpen"
          @click="localeOpen = !localeOpen"
        >
          {{ currentLocale?.label }} <span> <AppIcon name="chevron" /></span>
        </button>
        <div v-if="localeOpen" class="locale__menu">
          <button
            v-for="item in supportedLocales"
            :key="item.value"
            type="button"
            :class="{ active: locale === item.value }"
            @click="selectLocale(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <button class="wallet-button" type="button" :disabled="loading" @click="emit('wallet-click')">
        {{ loading ? lang('登录中') : walletLabel || lang('连接钱包') }}
      </button>

      <button
        v-if="showNotification"
        class="bell"
        type="button"
        :aria-label="lang('公告')"
        @click="emit('notification-click')"
      >
        <AppIcon name="bell" />
        <small v-if="notificationCount > 0">{{ notificationCount > 99 ? '99+' : notificationCount }}</small>
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: max(22px, env(safe-area-inset-top)) 17px 0;
}

.brand { display: flex; align-items: center; color: #101018; text-decoration: none; }
.brand img { display: block; height: 27px; }
.topbar__actions { display: flex; align-items: center; gap: 7px; min-width: 0; }
.locale { position: relative; }

.locale__trigger,
.wallet-button,
.bell {
  height: 28px;
  border: 1px solid rgba(151, 82, 222, .14);
  background: rgba(255, 255, 255, .78);
  color: #852bd9;
  box-shadow: 0 5px 20px rgba(82, 47, 130, .08);
  backdrop-filter: blur(12px);
}

.locale__trigger { font-size: 12px; padding: 0 11px; border-radius: 18px; white-space: nowrap; cursor: pointer; }
.locale__trigger span { margin-left: 2px; font-size: 12px; }
.locale__trigger span svg{ width: 15px;  transform: rotate(90deg);position: relative; top: 2px; }
.wallet-button { /*max-width: 112px;*/font-size: 12px;  padding: 0 12px; border-radius: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.wallet-button:disabled { cursor: wait; opacity: .65; }
.bell { position: relative; width: 28px; display: grid; place-items: center; border-radius: 50%; cursor: pointer; }
.bell :deep(svg) { width: 15px; }
.bell small { position: absolute; top: -5px; right: -5px; min-width: 17px; height: 17px; display: grid; place-items: center; padding: 0 4px; border: 2px solid #fff; border-radius: 9px; background: #ef3f69; color: #fff; font-size: 9px; line-height: 1; }

.locale__menu {
  position: absolute;
  z-index: 10;
  top: 41px;
  right: 0;
  width: 168px;
  padding: 6px;
  border: 1px solid #eadcfb;
  border-radius: 14px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 16px 40px rgba(58, 29, 91, .18);
  backdrop-filter: blur(18px);
}

.locale__menu button { width: 100%; padding: 9px 11px; border: 0; border-radius: 9px; background: transparent; color: #4c4556; text-align: left; cursor: pointer; }
.locale__menu button:hover, .locale__menu button.active { background: #f1e7ff; color: #842bd7; }

@media (max-width: 390px) {
  .topbar { padding-left: 12px; padding-right: 12px; }
  .topbar__actions { gap: 5px; }
  .locale__trigger, .wallet-button { padding-left: 9px; padding-right: 9px; font-size: 12px; }
}
</style>
