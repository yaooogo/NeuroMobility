<script setup>
import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/vue";
import { disconnect as disconnectWagmi, getAccount, watchAccount } from "@wagmi/core";
import { createWalletClient, custom, getAddress } from "viem";
import { getAddresses, signMessage } from "viem/actions";
import AppBottomNav from "./components/AppBottomNav.vue";
import AppHeader from "./components/AppHeader.vue";
import AppIcon from "./components/AppIcon.vue";
import { useLocale } from "./composables/useLocale.js";
import { requestLogin, requestLoginNonce, requestLogout, requestResolveInviter } from "./lib/api.js";
import { activeNetwork, appKit, projectId, wagmiAdapter } from "./lib/reown.js";
const { lang } = useLocale();

const account = useAppKitAccount();
const providerState = useAppKitProvider("eip155");
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
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : lang("连接钱包");
});

const quickActions = [
  { key: lang("投资计划"), icon: "coin" },
  { key: lang("车辆信息"), icon: "car" },
  { key: lang("分红记录"), icon: "record" },
  { key: lang("邀请好友"), icon: "mail" }
];
const highlights = [
  { title: lang("真实租车业务"), sub: lang("实体资产支撑"), icon: "car" },
  { title: lang("月度分红"), sub: lang("共享经营收益"), icon: "coins" },
  { title: lang("资金安全透明"), sub: lang("链上可查"), icon: "share" },
  { title: lang("合伙人体系"), sub: lang("收益多元化"), icon: "partner" }
];
function showNotice(message, type = "success") {
  notice.value = message;
  noticeType.value = type;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { notice.value = ""; }, 3200);
}

async function openWallet() {
  if (projectId === "YOUR_REOWN_PROJECT_ID") {
    showNotice(lang("请先配置 Reown Project ID"), "error");
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
  if (!provider) throw new Error(lang("未连接"));
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
    showNotice(lang("请在钱包中确认签名"));
    const client = buildWalletClient();
    const addresses = await getAddresses(client);
    const signer = getAddress(addresses[0] || normalizedAddress).toLowerCase();
    if (signer !== normalizedAddress) throw new Error(lang("未连接"));
    const signature = await signMessage(client, { account: signer, message: nonce.signStr });
    const session = await requestLogin(normalizedAddress, signature, refCode);
    localStorage.setItem("token", session.token);
    localStorage.setItem("auth_address", normalizedAddress);
    localStorage.removeItem("invite_ref_code");
    inviteVisible.value = false;
    showNotice(lang("登录成功"));
  } catch (error) {
    showNotice(error?.message || lang("登录失败"), "error");
    if (!inviteVisible.value) await disconnectWallet(false);
  } finally {
    loggingIn.value = false;
  }
}

async function confirmInvite() {
  const code = inviteCode.value.trim();
  if (!code) {
    showNotice(lang("首次登录需要邀请码"), "error");
    return;
  }
  loggingIn.value = true;
  try {
    const inviter = await requestResolveInviter(code);
    inviterWallet.value = inviter.wallet || "";
    localStorage.setItem("invite_ref_code", code);
  } catch (error) {
    showNotice(error?.message || lang("登录失败"), "error");
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
  else showNotice(lang("连接钱包后可查看投资与资产"));
}

function handleNotification() {
  showNotice(lang("暂无公告"));
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
  <main class="app-shell">
    <section class="hero">
      <div class="hero__image" role="img" :aria-label="lang('租车投资')"></div>
      <div class="hero__shade"></div>
      <AppHeader
        :wallet-label="walletLabel"
        :loading="loggingIn"
        @wallet-click="openWallet"
        @notification-click="handleNotification"
      />
    </section>

    <section class="content-card">
      <div class="quick-grid">
        <button v-for="item in quickActions" :key="item.key" type="button" class="quick-item" @click="handleAction">
          <span class="icon-tile"><AppIcon :name="item.icon" /></span><span>{{ item.key }}</span>
        </button>
      </div>

      <div class="stats-grid">
        <article><span>{{ lang('平台运营车辆') }}</span><strong>1,258 <small>{{ lang('台') }}</small></strong><i><AppIcon name="car" /></i></article>
        <article><span>{{ lang('累计用户') }}</span><strong>56,320 <small>{{ lang('人') }}</small></strong><i><AppIcon name="users" /></i></article>
      </div>

      <button class="investment-banner" type="button" @click="handleAction">
        <span><strong>{{ lang('租车投资 · 月度分红计划') }}</strong><small>{{ lang('真实投资运营｜稳定经营收益｜透明公开分配') }}</small></span>
        <b>{{ lang('立即投资') }} <AppIcon name="arrow" /></b>
      </button>

      <section class="highlights">
        <h2>{{ lang('项目亮点') }}</h2>
        <div class="highlight-grid">
          <article v-for="item in highlights" :key="item.title">
            <AppIcon :name="item.icon" /><strong>{{ item.title }}</strong><small>{{ item.sub }}</small>
          </article>
        </div>
      </section>

      <button class="partner-banner" type="button" @click="handleAction">
        <span class="crown">♛</span><span><strong>{{ lang('成为合伙人') }}</strong><small>{{ lang('与更多伙伴一起，建设全球出行生态') }}</small></span>
        <b>{{ lang('立即邀请') }} <AppIcon name="arrow" /></b>
      </button>
    </section>

    <AppBottomNav active-key="home" @select="handleAction" />

    <transition name="toast"><div v-if="notice" class="toast" :class="`toast--${noticeType}`">{{ notice }}</div></transition>

    <div v-if="inviteVisible" class="modal-backdrop">
      <section class="invite-modal" role="dialog" aria-modal="true" :aria-label="lang('首次登录需要邀请码')">
        <div class="invite-modal__icon"><AppIcon name="users" /></div>
        <h2>{{ lang('首次登录需要邀请码') }}</h2>
        <p>{{ walletLabel }}</p>
        <label><span>{{ lang('邀请码') }}</span><input v-model.trim="inviteCode" type="text" autocomplete="off" :placeholder="lang('邀请码')" @keyup.enter="confirmInvite" /></label>
        <div v-if="inviterWallet" class="inviter"><span>{{ lang('推荐人钱包') }}</span><strong>{{ inviterWallet }}</strong></div>
        <button class="primary" type="button" :disabled="loggingIn" @click="confirmInvite">{{ loggingIn ? lang('已登录') : lang('验证并登录') }}</button>
        <button class="secondary" type="button" @click="inviteVisible = false; disconnectWallet(false)">{{ lang('取消') }}</button>
      </section>
    </div>
  </main>
</template>
