<script setup>
import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { useAppKitAccount } from "@reown/appkit/vue";
import { disconnect as disconnectWagmi, getAccount, signMessage as signMessageWagmi, watchAccount } from "@wagmi/core";
import { getAddress } from "viem";
import { useRoute, useRouter } from "vue-router";
import AppBottomNav from "./components/AppBottomNav.vue";
import AppIcon from "./components/AppIcon.vue";
import InviteShareDialog from "./components/InviteShareDialog.vue";
import { useLocale } from "./composables/useLocale.js";
import { AUTH_EXPIRED_EVENT, requestLogin, requestLoginNonce, requestLogout, requestResolveInviter } from "./lib/api.js";
import { appKit, projectId, wagmiAdapter } from "./lib/reown.js";
const { lang } = useLocale();
const route = useRoute();
const router = useRouter();

const account = useAppKitAccount();
const inviteVisible = ref(false);
const shareInviteVisible = ref(false);
const pendingShareInvite = ref(false);
const inviteCode = ref(new URLSearchParams(window.location.search).get("t") || localStorage.getItem("invite_ref_code") || "");
const inviterWallet = ref("");
const pendingAddress = ref("");
const ownInviteCode = ref(localStorage.getItem("auth_ref_code") || "");
const loggingIn = ref(false);
const authSuppressedAddress = ref("");
const notice = ref("");
const noticeType = ref("success");
const activeTab = computed(() => String(route.meta.navKey || "home"));
const accountState = computed(() => unref(account) || {});
const connectedAddress = computed(() => String(accountState.value.address || getWagmiAddress()).toLowerCase());
const isConnected = computed(() => Boolean(connectedAddress.value && (accountState.value.isConnected || getWagmiAddress())));
let wagmiUnwatch = null;
let hasObservedWalletConnection = false;
const walletLabel = computed(() => {
  const address = connectedAddress.value;
  return address ? `${address.slice(0, 5)}...${address.slice(-4)}` : lang("连接钱包");
});

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
    await authenticate(connectedAddress.value, "", true);
    return;
  }
  await appKit.open({ view: isConnected.value ? "Account" : "Connect" });
}

function getWagmiAddress() {
  try {
    return String(getAccount(wagmiAdapter.wagmiConfig)?.address || "");
  } catch {
    return "";
  }
}

async function waitForSigningAccount(expectedAddress, timeout = 5000) {
  const expected = String(expectedAddress || "").toLowerCase();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const current = getAccount(wagmiAdapter.wagmiConfig);
    const address = String(current?.address || "").toLowerCase();
    if (current?.isConnected && address === expected && current?.connector) return current;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  throw new Error(lang("钱包连接尚未就绪，请稍后重试"));
}

function hasAuthenticatedSession(address) {
  const expiresAt = Number(localStorage.getItem("auth_expires_at") || 0);
  return Boolean(
    address
    && localStorage.getItem("token")
    && localStorage.getItem("auth_address") === String(address).toLowerCase()
    && (!expiresAt || expiresAt > Date.now() + 30_000)
  );
}

function clearStoredAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("auth_address");
  localStorage.removeItem("auth_expires_at");
  localStorage.removeItem("auth_ref_code");
  ownInviteCode.value = "";
}

function isUserRejectedError(error) {
  const code = Number(error?.code ?? error?.cause?.code ?? error?.cause?.cause?.code);
  const text = String(error?.shortMessage || error?.message || error?.cause?.message || "").toLowerCase();
  return code === 4001 || error?.name === "UserRejectedRequestError" || text.includes("user rejected");
}

async function authenticate(address, refCode = "", force = false) {
  const normalizedAddress = String(address || "").toLowerCase();
  if (!normalizedAddress || loggingIn.value) return;
  if (hasAuthenticatedSession(normalizedAddress)) return;
  if (!force && authSuppressedAddress.value === normalizedAddress) return;
  if (!refCode && inviteVisible.value && pendingAddress.value === normalizedAddress) return;
  loggingIn.value = true;
  try {
    const nonce = await requestLoginNonce(normalizedAddress);
    if (Number(nonce?.is_new) === 1 && !refCode) {
      pendingAddress.value = normalizedAddress;
      inviteVisible.value = true;
      return;
    }
    showNotice(lang("请在钱包中确认签名"));
    const signingAccount = await waitForSigningAccount(normalizedAddress);
    const signer = getAddress(signingAccount.address).toLowerCase();
    if (signer !== normalizedAddress) throw new Error(lang("未连接"));
    const signature = await signMessageWagmi(wagmiAdapter.wagmiConfig, {
      account: getAddress(signingAccount.address),
      connector: signingAccount.connector,
      message: nonce.signStr
    });
    const session = await requestLogin(normalizedAddress, signature, refCode);
    localStorage.setItem("token", session.token);
    localStorage.setItem("auth_address", normalizedAddress);
    localStorage.setItem("auth_expires_at", String(Date.now() + Number(session.expiresIn || 0) * 1000));
    ownInviteCode.value = session.ref_code || normalizedAddress;
    localStorage.setItem("auth_ref_code", ownInviteCode.value);
    localStorage.removeItem("invite_ref_code");
    authSuppressedAddress.value = "";
    inviteVisible.value = false;
    showNotice(lang("登录成功"));
    if (pendingShareInvite.value) {
      pendingShareInvite.value = false;
      shareInviteVisible.value = true;
    }
  } catch (error) {
    if (isUserRejectedError(error)) {
      pendingShareInvite.value = false;
      authSuppressedAddress.value = normalizedAddress;
      showNotice(lang("已取消签名"));
    } else {
      pendingShareInvite.value = false;
      showNotice(error?.shortMessage || error?.message || lang("登录失败"), "error");
    }
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
  await authenticate(pendingAddress.value || connectedAddress.value, code, true);
}

async function disconnectWallet(callApi = true) {
  if (callApi && localStorage.getItem("token")) {
    try { await requestLogout(); } catch { /* session may already be expired */ }
  }
  clearStoredAuthSession();
  shareInviteVisible.value = false;
  pendingShareInvite.value = false;
  authSuppressedAddress.value = "";
  try { await appKit.disconnect("eip155"); } catch { /* handled by wagmi fallback */ }
  try { await disconnectWagmi(wagmiAdapter.wagmiConfig); } catch { /* already disconnected */ }
}

function handleAuthExpired() {
  const address = String(getWagmiAddress() || connectedAddress.value).toLowerCase();
  if (!address || loggingIn.value) return;
  void authenticate(address, "", true);
}

async function openInviteShare() {
  if (!isConnected.value || !hasAuthenticatedSession(connectedAddress.value)) {
    pendingShareInvite.value = true;
    if (!isConnected.value) await openWallet();
    else await authenticate(connectedAddress.value, "", true);
    return;
  }
  shareInviteVisible.value = true;
}

function handleHomeAction(item) {
  if (item?.key === "invest") {
    void router.push({ name: "invest" });
    return;
  }
  if (item?.key === "cars") {
    void router.push({ name: "vehicles" });
    return;
  }
  if (item?.key === "records") {
    void router.push({ name: "dividend-records" });
    return;
  }
  if (!isConnected.value) void openWallet();
  else showNotice(lang("功能正在建设中"));
}

function handleNavSelect(item) {
  if (item.key !== activeTab.value) void router.push({ name: item.key });
}

function handleProtectedAction() {
  if (!isConnected.value) {
    void openWallet();
    return;
  }
  showNotice(lang("功能正在建设中"));
}

async function copyWalletAddress() {
  if (!connectedAddress.value) {
    await openWallet();
    return;
  }
  try {
    await navigator.clipboard.writeText(connectedAddress.value);
    showNotice(lang("钱包地址已复制"));
  } catch {
    showNotice(lang("复制失败，请手动复制"), "error");
  }
}

async function logoutFromProfile() {
  await disconnectWallet();
  showNotice(lang("已安全退出"));
}

function handleProfileAction(item) {
  if (item?.key === "invest") {
    void router.push({ name: "invest" });
    return;
  }
  if (!isConnected.value && (item?.key === "invite" || item?.key === "team")) {
    void openWallet();
    return;
  }
  if (item?.key === "team") {
    void router.push({ name: "team" });
    return;
  }
  if (item?.key === "help") {
    void router.push({ name: "help" });
    return;
  }
  if (item?.key === "about") {
    void router.push({ name: "about" });
    return;
  }
  showNotice(lang("功能正在建设中"));
}

function handleViewAction(item) {
  if (item?.key === "invite") {
    void openInviteShare();
    return;
  }
  if (item?.key === "announcement") {
    void router.push({ name: "announcements" });
    return;
  }
  if (route.name === "home") {
    handleHomeAction(item);
    return;
  }
  if (route.name === "mine") {
    handleProfileAction(item);
    return;
  }
  if (route.name === "assets" && item?.key === "add-investment") {
    void router.push({ name: "invest" });
    return;
  }
  if (route.name === "assets" && item?.key === "deposit-records") {
    void router.push({ name: "transaction-records" });
    return;
  }
  handleProtectedAction(item);
}

function handleNotification() {
  void router.push({ name: "announcements" });
}

watch(
  [
    () => accountState.value.isConnected,
    () => accountState.value.address
  ],
  ([connected, appKitAddress]) => {
    const address = String(appKitAddress || getWagmiAddress()).toLowerCase();
    if (connected && address && hasAuthenticatedSession(address)) {
      ownInviteCode.value = localStorage.getItem("auth_ref_code") || address;
    }
  },
  { immediate: true }
);

wagmiUnwatch = watchAccount(wagmiAdapter.wagmiConfig, {
  onChange(accountData) {
    const address = String(accountData?.address || "").toLowerCase();
    // AppKit briefly reports a disconnected state while restoring a connector.
    // Ignore that initial empty snapshot, but clear the API session after a
    // wallet that was actually connected is explicitly disconnected.
    if (!accountData?.isConnected || !address) {
      if (hasObservedWalletConnection) {
        hasObservedWalletConnection = false;
        clearStoredAuthSession();
      }
      return;
    }
    hasObservedWalletConnection = true;
    void authenticate(address);
  }
});

window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  wagmiUnwatch?.();
  wagmiUnwatch = null;
});
</script>

<template>
  <main class="app-shell" :class="{ 'app-shell--subpage': route.meta.showBottomNav === false }">
    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        :address="connectedAddress"
        :connected="isConnected"
        :wallet-label="walletLabel"
        :loading="loggingIn"
        @wallet-click="openWallet"
        @notification-click="handleNotification"
        @connect="openWallet"
        @copy="copyWalletAddress"
        @logout="logoutFromProfile"
        @action="handleViewAction"
      />
    </RouterView>

    <AppBottomNav v-if="route.meta.showBottomNav !== false" :active-key="activeTab" @select="handleNavSelect" />

    <InviteShareDialog
      :visible="shareInviteVisible"
      :invite-code="ownInviteCode || connectedAddress"
      @close="shareInviteVisible = false"
    />

    <transition name="toast"><div v-if="notice" class="toast" :class="`toast--${noticeType}`">{{ notice }}</div></transition>

    <div v-if="inviteVisible" class="modal-backdrop">
      <section class="invite-modal" role="dialog" aria-modal="true" :aria-label="lang('首次登录需要邀请码')">
        <div class="invite-modal__icon"><AppIcon name="users" /></div>
        <h2>{{ lang('首次登录需要邀请码') }}</h2>
        <p>{{ walletLabel }}</p>
        <label><span>{{ lang('邀请码') }}</span><input v-model.trim="inviteCode" type="text" autocomplete="off" :placeholder="lang('邀请码')" @keyup.enter="confirmInvite" /></label>
        <div v-if="inviterWallet" class="inviter"><span>{{ lang('推荐人钱包') }}</span><strong>{{ inviterWallet }}</strong></div>
        <button class="primary" type="button" :disabled="loggingIn" @click="confirmInvite">{{ loggingIn ? lang('已登录') : lang('验证并登录') }}</button>
        <button class="secondary" type="button" @click="inviteVisible = false; pendingShareInvite = false; disconnectWallet(false)">{{ lang('取消') }}</button>
      </section>
    </div>
  </main>
</template>
