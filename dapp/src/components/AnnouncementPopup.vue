<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useLocale } from '../composables/useLocale.js';
import { requestAnnouncements } from '../lib/api.js';

const { locale, lang } = useLocale();
const announcements = ref([]);
const dismissed = new Set();
const current = computed(() => announcements.value.find(item => !dismissed.has(`${locale.value}:${item.id}:${item.updated_at}`)));
let requestId = 0;
let stopped = false;
const dialog = ref(null);
let previousFocus = null;
watch(current, async (value, previous) => {
  if (value && !previous) previousFocus = document.activeElement;
  await nextTick();
  if (stopped) return;
  if (value) dialog.value?.querySelector('button')?.focus();
  else previousFocus?.focus?.();
});
function trapFocus(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    dialog.value?.querySelector('button')?.focus();
  }
}
function close() {
  if (!current.value) return;
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
onBeforeUnmount(() => { stopped = true; window.clearInterval(timer); });
</script>

<template>
  <Teleport to="body">
    <div v-if="current" class="announcement-popup-mask" @keydown.esc="close">
      <section :key="current.id" ref="dialog" class="announcement-popup" role="dialog" aria-modal="true" aria-labelledby="popup-announcement-title" tabindex="-1" @keydown="trapFocus">
        <header><h2 id="popup-announcement-title">{{ current.title }}</h2><button type="button" :aria-label="lang('关闭')" @click="close">×</button></header>
        <div class="announcement-popup-body"><img v-if="current.cover" :src="current.cover" alt="" /><p>{{ current.content }}</p></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.announcement-popup-mask { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 50%); }
.announcement-popup { width: min(100%, 440px); max-height: 80dvh; display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; background: #fff; color: #29232e; box-shadow: 0 12px 48px #0003; }
.announcement-popup header { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #eee; }
.announcement-popup h2 { flex: 1; margin: 0; font-size: 18px; overflow-wrap: anywhere; }
.announcement-popup button { flex: none; width: 36px; height: 36px; border: 0; border-radius: 50%; background: #f5edf9; color: #7f27d8; font-size: 26px; cursor: pointer; }
.announcement-popup-body { overflow-y: auto; padding: 20px; }
.announcement-popup img { display: block; width: 100%; height: auto; border-radius: 10px; }
.announcement-popup p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.8; }
</style>
