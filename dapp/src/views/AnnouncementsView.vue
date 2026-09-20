<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAnnouncements } from "../lib/api.js";
import maintenanceImage from "../assets/images/announcement-maintenance.jpg";

defineOptions({ inheritAttrs: false });

const router = useRouter();
const { lang, locale } = useLocale();
const announcements = ref([]);
const expandedId = ref(null);
const loading = ref(true);
const errorMessage = ref("");
let requestId = 0;

function formatDate(value) {
  if (!value) return "";
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10).replaceAll("-", ".") : text;
}

async function loadAnnouncements() {
  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const items = await requestAnnouncements(locale.value);
    if (currentRequestId !== requestId) return;
    announcements.value = items;
    expandedId.value = announcements.value[0]?.id ?? null;
  } catch (error) {
    if (currentRequestId !== requestId) return;
    errorMessage.value = error?.message || lang("加载失败，请稍后重试");
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

function toggleAnnouncement(announcement) {
  expandedId.value = expandedId.value === announcement.id ? null : announcement.id;
}

watch(locale, loadAnnouncements, { immediate: true });
</script>

<template>
  <section class="announcements-view">
    <header class="announcements-header">
      <button type="button" :aria-label="lang('返回首页')" @click="router.push({ name: 'home' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("咨询公告") }}</h1>
      <span></span>
    </header>

    <div v-if="loading" class="content-state">{{ lang("正在加载...") }}</div>
    <div v-else-if="errorMessage" class="content-state content-state--error">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="loadAnnouncements">{{ lang("重新加载") }}</button>
    </div>
    <div v-else-if="!announcements.length" class="content-state">{{ lang("暂无公告") }}</div>

    <div v-else class="announcement-list">
      <article
        v-for="announcement in announcements"
        :key="announcement.id"
        class="announcement-card"
        :class="{ 'announcement-card--expanded': expandedId === announcement.id }"
      >
        <button
          class="announcement-summary"
          type="button"
          :aria-expanded="expandedId === announcement.id"
          :aria-controls="`announcement-content-${announcement.id}`"
          @click="toggleAnnouncement(announcement)"
        >
          <img :src="announcement.cover || maintenanceImage" alt="" />
          <span class="announcement-copy">
            <small>{{ lang("平台公告") }}</small>
            <strong>{{ announcement.title }}</strong>
            <time v-if="announcement.created_at">{{ formatDate(announcement.created_at) }}</time>
          </span>
          <AppIcon name="chevron" />
        </button>

        <div
          v-if="expandedId === announcement.id"
          :id="`announcement-content-${announcement.id}`"
          class="announcement-details"
        >
          <p>{{ announcement.content }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.announcements-view { min-height: 100vh; padding: 0 20px 38px; background: #fff; color: #454149; }
.announcements-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 27px; }
.announcements-header h1 { margin: 0; color: #111014; font-size:18px; line-height: 32px; text-align: center; }
.announcements-header button { width: 40px; height: 32px; display: grid; place-items: start; padding: 3px 0; border: 0; background: transparent; color: #7f27d8; cursor: pointer; }
.announcements-header button svg { width: 29px; transform: rotate(180deg); }
.content-state { min-height: 180px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #8b8490; font-size: 14px; text-align: center; }
.content-state--error { color: #b14558; }
.content-state button { padding: 8px 18px; border: 0; border-radius: 18px; background: #8731dc; color: #fff; cursor: pointer; }
.announcement-list { display: grid; gap: 13px; }
.announcement-card { overflow: hidden; border: 1px solid #f3edf8; border-radius: 12px; background: #fff; box-shadow: 0 7px 22px rgba(90,48,128,.075); }
.announcement-summary { width: 100%; min-height: 113px; display: grid; grid-template-columns: 55px minmax(0,1fr) 30px; align-items: center; gap: 18px; padding: 18px 18px 18px 20px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.announcement-summary img { width: 55px; height: 55px; display: block; border-radius: 14px; object-fit: cover; }
.announcement-copy { min-width: 0; align-self: center; }
.announcement-copy small { width: max-content; display: block; padding: 3px 8px; border-radius: 16px; background: linear-gradient(100deg, #b452f1, #8a36dc); color: #fff; font-size: 9px; line-height: 1; }
.announcement-copy strong { display: block; margin-top: 8px; overflow: hidden; color: #4b474d; font-size: 15px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.announcement-copy time { display: block; margin-top: 5px; color: #aaa2ad; font-size: 11px; }
.announcement-summary > svg { width: 30px; color: #7c25d5; stroke-width: 2.1; transition: transform .2s ease; }
.announcement-card--expanded .announcement-summary > svg { transform: rotate(90deg); }
.announcement-details { padding: 0 20px 20px; color: #1f1d22; }
.announcement-details p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.75; text-align: justify; }
@media (max-width: 390px) {
  .announcements-view { padding-left: 12px; padding-right: 12px; }
  .announcement-summary { grid-template-columns: 66px minmax(0,1fr) 24px; gap: 12px; min-height: 96px; padding: 14px; }
  .announcement-summary img { width: 66px; height: 66px; border-radius: 12px; }
  .announcement-copy strong { font-size: 17px; }
  .announcement-copy small { padding: 4px 11px; font-size: 11px; }
  .announcement-summary > svg { width: 24px; }
  .announcement-details { padding: 3px 14px 17px; }
  .announcement-details p { font-size: 14px; }
}
</style>
