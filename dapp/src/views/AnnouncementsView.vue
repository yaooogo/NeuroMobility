<script setup>
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import maintenanceImage from "../assets/images/announcement-maintenance.jpg";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  announcements: {
    type: Array,
    default: () => Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      category: "平台公告",
      title: "系统升级维护通知",
      image: maintenanceImage
    }))
  }
});
const emit = defineEmits(["action"]);
const router = useRouter();
const { lang } = useLocale();

function translateAnnouncement(text) {
  if (text === "平台公告") return lang("平台公告");
  if (text === "系统升级维护通知") return lang("系统升级维护通知");
  return lang(text);
}
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

    <div class="announcement-list">
      <button
        v-for="announcement in props.announcements"
        :key="announcement.id"
        class="announcement-card"
        type="button"
        @click="emit('action', { key: 'announcement', announcement })"
      >
        <img :src="announcement.image || maintenanceImage" alt="" />
        <span class="announcement-copy">
          <small>{{ translateAnnouncement(announcement.category) }}</small>
          <strong>{{ translateAnnouncement(announcement.title) }}</strong>
        </span>
        <AppIcon name="chevron" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.announcements-view { min-height: 100vh; padding: 0 20px 38px; background: #fff; color: #454149; }
.announcements-header { height: 106px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(18px, env(safe-area-inset-top)) 0 27px; }
.announcements-header h1 { margin: 0; color: #111014; font-size: 24px; line-height: 32px; text-align: center; }
.announcements-header button { width: 40px; height: 32px; display: grid; place-items: start; padding: 3px 0; border: 0; background: transparent; color: #7f27d8; cursor: pointer; }
.announcements-header button svg { width: 29px; transform: rotate(180deg); }
.announcement-list { display: grid; gap: 13px; }
.announcement-card { width: 100%; min-height: 113px; display: grid; grid-template-columns: 80px minmax(0,1fr) 30px; align-items: center; gap: 18px; padding: 18px 18px 18px 20px; border: 1px solid #f3edf8; border-radius: 20px; background: #fff; color: inherit; text-align: left; box-shadow: 0 7px 22px rgba(90,48,128,.075); cursor: pointer; }
.announcement-card img { width: 80px; height: 80px; display: block; border-radius: 14px; object-fit: cover; }
.announcement-copy { min-width: 0; align-self: center; }
.announcement-copy small { width: max-content; display: block; padding: 5px 14px; border-radius: 16px; background: linear-gradient(100deg, #b452f1, #8a36dc); color: #fff; font-size: 13px; line-height: 1; }
.announcement-copy strong { display: block; margin-top: 11px; overflow: hidden; color: #4b474d; font-size: 20px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.announcement-card > svg { width: 30px; color: #7c25d5; stroke-width: 2.1; }
@media (max-width: 390px) {
  .announcements-view { padding-left: 12px; padding-right: 12px; }
  .announcement-card { grid-template-columns: 66px minmax(0,1fr) 24px; gap: 12px; min-height: 96px; padding: 14px; border-radius: 17px; }
  .announcement-card img { width: 66px; height: 66px; border-radius: 12px; }
  .announcement-copy strong { font-size: 17px; }
  .announcement-copy small { padding: 4px 11px; font-size: 11px; }
  .announcement-card > svg { width: 24px; }
}
</style>
