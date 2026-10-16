<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useLocale } from '../composables/useLocale.js';
import { requestAnnouncements } from '../lib/api.js';

const { locale, lang } = useLocale();
const announcements = ref([]);
const dismissed = new Set();
const current = computed(() => announcements.value.find(item => !dismissed.has(`${locale.value}:${item.id}:${item.updated_at}`)));
const currentKey = computed(() => current.value ? `${locale.value}:${current.value.id}:${current.value.updated_at}` : '');
const closeCountdown = ref(0);
let countdownTimer = null;
function clearCountdown() {
  window.clearInterval(countdownTimer);
  countdownTimer = null;
}
watch(currentKey, (key) => {
  clearCountdown();
  closeCountdown.value = key ? 3 : 0;
  if (!key) return;
  const unlockAt = Date.now() + 3000;
  countdownTimer = window.setInterval(() => {
    closeCountdown.value = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));
    if (closeCountdown.value === 0) clearCountdown();
  }, 100);
});
let requestId = 0;
let stopped = false;
const dialog = ref(null);
let previousFocus = null;
watch(currentKey, async (value, previous) => {
  if (value && !previous) previousFocus = document.activeElement;
  await nextTick();
  if (stopped) return;
  if (value) dialog.value?.focus();
  else previousFocus?.focus?.();
});
function trapFocus(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    if (closeCountdown.value > 0) dialog.value?.focus();
    else dialog.value?.querySelector('button')?.focus();
  }
}
function close() {
  if (!current.value || closeCountdown.value > 0) return;
  dismissed.add(`${locale.value}:${current.value.id}:${current.value.updated_at}`);
  announcements.value = [...announcements.value];
}
async function load() {
  const id = ++requestId;
  try {
    const items = await requestAnnouncements(locale.value, true);
    if (!stopped && id === requestId) announcements.value = items;
  } catch {
    if (!stopped && id === requestId) announcements.value = [];
  }
}
watch(locale, () => { announcements.value = []; load(); }, { immediate: true });
const timer = window.setInterval(load, 30000);
onBeforeUnmount(() => { stopped = true; window.clearInterval(timer); clearCountdown(); });
</script>

<template>
  <Teleport to="body">
    <div v-if="current" class="announcement-popup-mask" @keydown.esc="close">
      <section :key="current.id" ref="dialog" class="announcement-popup" role="dialog" aria-modal="true" aria-labelledby="popup-announcement-title" tabindex="-1" @keydown="trapFocus">
        <header><h2 id="popup-announcement-title">{{ current.title }}</h2><button type="button" :disabled="closeCountdown > 0" :aria-label="closeCountdown > 0 ? `${lang('关闭')} (${closeCountdown}s)` : lang('关闭')" @click="close">{{ closeCountdown > 0 ? `${closeCountdown}s` : '×' }}</button></header>
        <div class="announcement-popup-body"><img v-if="current.cover" :src="current.cover" alt="" /><p>{{ current.content }}</p></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.announcement-popup-mask { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 50%); }
.announcement-popup { width: min(100%, 440px); max-height: 80dvh; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; background: #fff; color: #29232e; box-shadow: 0 12px 48px #0003; }
.announcement-popup header { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #eee; }
.announcement-popup h2 { flex: 1; margin: 0; font-size: 18px; overflow-wrap: anywhere; }
.announcement-popup button { flex: none; width: 36px; height: 36px; border: 0; border-radius: 50%; background: #f5edf9; color: #7f27d8; font-size: 26px; cursor: pointer; }
.announcement-popup button:disabled { opacity: .6; font-size: 14px; cursor: not-allowed; }
.announcement-popup-body { overflow-y: auto; padding: 20px; }
.announcement-popup img { display: block; width: 100%; height: auto; border-radius: 10px; }
.announcement-popup p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.8; }
</style>
