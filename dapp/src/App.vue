<script setup>
import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/vue";
import { disconnect as disconnectWagmi, getAccount, watchAccount } from "@wagmi/core";
import { createWalletClient, custom, getAddress } from "viem";
import { getAddresses, signMessage } from "viem/actions";
import AppIcon from "./components/AppIcon.vue";
import { useLocale } from "./composables/useLocale.js";
import { requestLogin, requestLoginNonce, requestLogout, requestResolveInviter } from "./lib/api.js";
import { activeNetwork, appKit, projectId, wagmiAdapter } from "./lib/reown.js";
import logoSrc from "@assets/images/logo.png";

const { locale, currentLocale, supportedLocales, setLocale, t } = useLocale();
const account = useAppKitAccount();
const providerState = useAppKitProvider("eip155");
const localeOpen = ref(false);
const inviteVisible = ref(false);
const inviteCode = ref(new URLSearchParams(window.location.search).get("t") || localStorage.getItem("invite_ref_code") || "");
const inviterWallet = ref("");
const pendingAddress = ref("");
const loggingIn = ref(false);
const notice = ref("");
const noticeType = ref("success");
const accountState = computed(() => unref(account) || {});
const walletProviderState = computed(() => unref(providerState?.walletProvider) || null);
const connectedAddress = computed(() => String(accountState.value.address || getWagmiAddress()).toLowerCase());
const isConnected = computed(() => Boolean(connectedAddress.value && (accountState.value.isConnected || getWagmiAddress())));
let wagmiUnwatch = null;
const walletLabel = computed(() => {
  const address = connectedAddress.value;
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : t("connect");
});

const quickActions = [
  { key: "investmentPlan", icon: "coin" },
  { key: "vehicleInfo", icon: "car" },
  { key: "dividendRecords", icon: "record" },
  { key: "inviteFriends", icon: "mail" }
];
const highlights = [
  { title: "realVehicle", sub: "realAsset", icon: "car" },
  { title: "monthlyDividend", sub: "stableReturn", icon: "coins" },
  { title: "transparent", sub: "onchain", icon: "share" },
  { title: "partnership", sub: "growth", icon: "partner" }
];
const navItems = [
  { key: "home", icon: "home" }, { key: "invest", icon: "compass" },
  { key: "assets", icon: "stack" }, { key: "mine", icon: "user" }
];

function showNotice(message, type = "success") {
  notice.value = message;
  noticeType.value = type;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { notice.value = ""; }, 3200);
}

async function openWallet() {
  localeOpen.value = false;
  if (projectId === "YOUR_REOWN_PROJECT_ID") {
    showNotice(t("invalidProjectId"), "error");
    return;
  }
  if (isConnected.value && !hasAuthenticatedSession(connectedAddress.value)) {
    await authenticate(connectedAddress.value);
    return;
  }
  await appKit.open({ view: isConnected.value ? "Account" : "Connect" });
}

function buildWalletClient() {
  const provider = walletProviderState.value;
  if (!provider) throw new Error(t("disconnected"));
  return createWalletClient({ chain: activeNetwork, transport: custom(provider) });
}

function getWagmiAddress() {
  try {
    return String(getAccount(wagmiAdapter.wagmiConfig)?.address || "");
  } catch {
    return "";
  }
}

function hasAuthenticatedSession(address) {
  return Boolean(
    address
    && localStorage.getItem("token")
    && localStorage.getItem("auth_address") === String(address).toLowerCase()
  );
}

async function authenticate(address, refCode = "") {
  const normalizedAddress = String(address || "").toLowerCase();
  if (!normalizedAddress || !walletProviderState.value || loggingIn.value) return;
  if (hasAuthenticatedSession(normalizedAddress)) return;
  loggingIn.value = true;
  try {
    const nonce = await requestLoginNonce(normalizedAddress);
    if (Number(nonce?.is_new) === 1 && !refCode) {
      pendingAddress.value = normalizedAddress;
      inviteVisible.value = true;
      return;
    }
    showNotice(t("signing"));
    const client = buildWalletClient();
    const addresses = await getAddresses(client);
    const signer = getAddress(addresses[0] || normalizedAddress).toLowerCase();
    if (signer !== normalizedAddress) throw new Error(t("disconnected"));
    const signature = await signMessage(client, { account: signer, message: nonce.signStr });
    const session = await requestLogin(normalizedAddress, signature, refCode);
    localStorage.setItem("token", session.token);
    localStorage.setItem("auth_address", normalizedAddress);
    localStorage.removeItem("invite_ref_code");
    inviteVisible.value = false;
    showNotice(t("loginSuccess"));
  } catch (error) {
    showNotice(error?.message || t("loginFailed"), "error");
    if (!inviteVisible.value) await disconnectWallet(false);
  } finally {
    loggingIn.value = false;
  }
}

async function confirmInvite() {
  const code = inviteCode.value.trim();
  if (!code) {
    showNotice(t("inviteRequired"), "error");
    return;
  }
  loggingIn.value = true;
  try {
    const inviter = await requestResolveInviter(code);
    inviterWallet.value = inviter.wallet || "";
    localStorage.setItem("invite_ref_code", code);
  } catch (error) {
    showNotice(error?.message || t("loginFailed"), "error");
    loggingIn.value = false;
    return;
  }
  loggingIn.value = false;
  await authenticate(pendingAddress.value || connectedAddress.value, code);
}

async function disconnectWallet(callApi = true) {
  if (callApi && localStorage.getItem("token")) {
    try { await requestLogout(); } catch { /* session may already be expired */ }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("auth_address");
  try { await appKit.disconnect("eip155"); } catch { /* handled by wagmi fallback */ }
  try { await disconnectWagmi(wagmiAdapter.wagmiConfig); } catch { /* already disconnected */ }
}

function handleAction() {
  if (!isConnected.value) openWallet();
  else showNotice(t("connectHint"));
}

watch(
  [
    () => accountState.value.isConnected,
    () => accountState.value.address,
    () => walletProviderState.value
  ],
  async ([connected, appKitAddress, provider]) => {
    const address = String(appKitAddress || getWagmiAddress()).toLowerCase();
    if (!connected && !getWagmiAddress()) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_address");
      return;
    }
    if (address && provider) await authenticate(address);
  },
  { immediate: true }
);

wagmiUnwatch = watchAccount(wagmiAdapter.wagmiConfig, {
  onChange(accountData) {
    const address = String(accountData?.address || "").toLowerCase();
    if (!accountData?.isConnected || !address) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_address");
      return;
    }
    void authenticate(address);
  }
});

onBeforeUnmount(() => {
  wagmiUnwatch?.();
  wagmiUnwatch = null;
});
</script>

<template>
  <main class="app-shell" @click="localeOpen = false">
    <section class="hero">
      <div class="hero__image" role="img" :aria-label="t('bannerTitle')"></div>
      <div class="hero__shade"></div>
      <header class="topbar">
        <a class="brand" href="#" aria-label="NEURO">
        <img :src="logoSrc" alt="" />
        </a>
        <div class="topbar__actions">
          <div class="locale" @click.stop>
            <button type="button" class="locale__trigger" :aria-label="t('language')" @click="localeOpen = !localeOpen">
              {{ currentLocale.label }} <span>⌄</span>
            </button>
            <div v-if="localeOpen" class="locale__menu">
              <button v-for="item in supportedLocales" :key="item.value" type="button" :class="{ active: locale === item.value }" @click="setLocale(item.value); localeOpen = false">{{ item.label }}</button>
            </div>
          </div>
          <button class="wallet-button" type="button" :disabled="loggingIn" @click="openWallet">
            {{ loggingIn ? t('connecting') : walletLabel }}
          </button>
          <button class="bell" type="button" :aria-label="t('notices')"><AppIcon name="bell" /></button>
        </div>
      </header>
    </section>

    <section class="content-card">
      <div class="quick-grid">
        <button v-for="item in quickActions" :key="item.key" type="button" class="quick-item" @click="handleAction">
          <span class="icon-tile"><AppIcon :name="item.icon" /></span><span>{{ t(item.key) }}</span>
        </button>
      </div>

      <div class="stats-grid">
        <article><span>{{ t('platformVehicles') }}</span><strong>1,258 <small>{{ t('units') }}</small></strong><i><AppIcon name="car" /></i></article>
        <article><span>{{ t('totalUsers') }}</span><strong>56,320 <small>{{ t('users') }}</small></strong><i><AppIcon name="users" /></i></article>
      </div>

      <button class="investment-banner" type="button" @click="handleAction">
        <span><strong>{{ t('bannerTitle') }}</strong><small>{{ t('bannerSub') }}</small></span>
        <b>{{ t('investNow') }} <AppIcon name="arrow" /></b>
      </button>

      <section class="highlights">
        <h2>{{ t('highlights') }}</h2>
        <div class="highlight-grid">
          <article v-for="item in highlights" :key="item.title">
            <AppIcon :name="item.icon" /><strong>{{ t(item.title) }}</strong><small>{{ t(item.sub) }}</small>
          </article>
        </div>
      </section>

      <button class="partner-banner" type="button" @click="handleAction">
        <span class="crown">♛</span><span><strong>{{ t('partnerTitle') }}</strong><small>{{ t('partnerSub') }}</small></span>
        <b>{{ t('enquire') }} <AppIcon name="arrow" /></b>
      </button>
    </section>

    <nav class="bottom-nav" aria-label="Primary">
      <button v-for="(item, index) in navItems" :key="item.key" type="button" :class="{ active: index === 0 }" @click="handleAction">
        <AppIcon :name="item.icon" /><span>{{ t(item.key) }}</span>
      </button>
    </nav>

    <transition name="toast"><div v-if="notice" class="toast" :class="`toast--${noticeType}`">{{ notice }}</div></transition>

    <div v-if="inviteVisible" class="modal-backdrop">
      <section class="invite-modal" role="dialog" aria-modal="true" :aria-label="t('inviteRequired')">
        <div class="invite-modal__icon"><AppIcon name="users" /></div>
        <h2>{{ t('inviteRequired') }}</h2>
        <p>{{ walletLabel }}</p>
        <label><span>{{ t('inviteCode') }}</span><input v-model.trim="inviteCode" type="text" autocomplete="off" :placeholder="t('inviteCode')" @keyup.enter="confirmInvite" /></label>
        <div v-if="inviterWallet" class="inviter"><span>{{ t('inviterWallet') }}</span><strong>{{ inviterWallet }}</strong></div>
        <button class="primary" type="button" :disabled="loggingIn" @click="confirmInvite">{{ loggingIn ? t('connecting') : t('verifyInvite') }}</button>
        <button class="secondary" type="button" @click="inviteVisible = false; disconnectWallet(false)">{{ t('cancel') }}</button>
      </section>
    </div>
  </main>
</template>
