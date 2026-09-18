<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import maintenanceImage from "../assets/images/announcement-maintenance.jpg";

defineOptions({ inheritAttrs: false });

const defaultContent = "今日将进行系统版本升级维护，维护期间部分功能将暂时无法使用。我们将优化系统性能，提升整体稳定性与使用体验。维护结束后服务自动恢复，由此带来不便敬请谅解，感谢各位用户的理解与支持。";
const props = defineProps({
  announcements: {
    type: Array,
    default: () => Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      category: "平台公告",
      title: "系统升级维护通知",
      image: maintenanceImage,
      content: defaultContent,
      author: "NEURO 团队",
      date: "2026.09.12"
    }))
  }
});

const router = useRouter();
const { lang } = useLocale();
const expandedId = ref(props.announcements[0]?.id ?? null);

function toggleAnnouncement(announcement) {
  expandedId.value = expandedId.value === announcement.id ? null : announcement.id;
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
      <article
        v-for="announcement in props.announcements"
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
          <img :src="announcement.image || maintenanceImage" alt="" />
          <span class="announcement-copy">
            <small>{{ lang(announcement.category) }}</small>
            <strong>{{ lang(announcement.title) }}</strong>
          </span>
          <AppIcon name="chevron" />
        </button>

        <div
          v-if="expandedId === announcement.id"
          :id="`announcement-content-${announcement.id}`"
          class="announcement-details"
        >
          <p>{{ lang(announcement.content || defaultContent) }}</p>
          <footer>
            <span>{{ announcement.author || "NEURO 团队" }}</span>
            <time>{{ announcement.date || "2026.09.12" }}</time>
          </footer>
        </div>
      </article>
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
.announcement-card { overflow: hidden; border: 1px solid #f3edf8; border-radius: 20px; background: #fff; box-shadow: 0 7px 22px rgba(90,48,128,.075); }
.announcement-summary { width: 100%; min-height: 113px; display: grid; grid-template-columns: 80px minmax(0,1fr) 30px; align-items: center; gap: 18px; padding: 18px 18px 18px 20px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.announcement-summary img { width: 80px; height: 80px; display: block; border-radius: 14px; object-fit: cover; }
.announcement-copy { min-width: 0; align-self: center; }
.announcement-copy small { width: max-content; display: block; padding: 5px 14px; border-radius: 16px; background: linear-gradient(100deg, #b452f1, #8a36dc); color: #fff; font-size: 13px; line-height: 1; }
.announcement-copy strong { display: block; margin-top: 11px; overflow: hidden; color: #4b474d; font-size: 20px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.announcement-summary > svg { width: 30px; color: #7c25d5; stroke-width: 2.1; transition: transform .2s ease; }
.announcement-card--expanded .announcement-summary { padding-bottom: 7px; }
.announcement-card--expanded .announcement-summary > svg { transform: rotate(90deg); }
.announcement-details { padding: 4px 20px 20px; color: #1f1d22; }
.announcement-details p { margin: 0; font-size: 16px; line-height: 1.75; text-align: justify; }
.announcement-details footer { display: grid; justify-items: end; gap: 3px; margin-top: 28px; font-size: 15px; line-height: 1.4; }
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
