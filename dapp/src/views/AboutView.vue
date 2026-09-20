<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestAboutArticles } from "../lib/api.js";

defineOptions({ inheritAttrs: false });

const router = useRouter();
const { lang, locale } = useLocale();
const articles = ref([]);
const loading = ref(true);
const errorMessage = ref("");
let requestId = 0;

async function loadContent() {
  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const items = await requestAboutArticles(locale.value);
    if (currentRequestId !== requestId) return;
    articles.value = items;
  } catch (error) {
    if (currentRequestId !== requestId) return;
    errorMessage.value = error?.message || lang("加载失败，请稍后重试");
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

watch(locale, loadContent, { immediate: true });
</script>

<template>
  <section class="about-view">
    <header class="about-header">
      <button type="button" :aria-label="lang('返回我的')" @click="router.push({ name: 'mine' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("关于我们") }}</h1>
      <span></span>
    </header>

    <div v-if="loading" class="content-state">{{ lang("正在加载...") }}</div>
    <div v-else-if="errorMessage" class="content-state content-state--error">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="loadContent">{{ lang("重新加载") }}</button>
    </div>
    <div v-else-if="!articles.length" class="content-state">{{ lang("暂无内容") }}</div>
    <div v-else class="about-list">
      <article v-for="article in articles" :key="article.id" class="about-content">{{ article.content }}</article>
    </div>
  </section>
</template>

<style scoped>
.about-view { min-height: 100vh; padding: 0 16px 40px; background: #fbfaff; color: #454149; }
.about-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 21px; }
.about-header h1 { margin: 0; color: #151317; font-size: 18px; line-height: 31px; text-align: center; }
.about-header button { width: 40px; height: 31px; display: grid; place-items: start; padding: 4px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.about-header button svg { width: 26px; transform: rotate(180deg); }
.content-state { min-height: 220px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #8b8490; font-size: 14px; text-align: center; }
.content-state--error { color: #b14558; }
.content-state button { padding: 8px 18px; border: 0; border-radius: 18px; background: #8731dc; color: #fff; cursor: pointer; }
.about-list { display: grid; gap: 14px; }
.about-content { padding: 22px 20px; border: 1px solid #f0eaf6; border-radius: 12px; background: #fff; box-shadow: 0 8px 26px rgba(88,47,129,.075); white-space: pre-wrap; overflow-wrap: anywhere; color: #544f58; font-size: 14px; line-height: 1.85; }
@media (max-width: 390px) {
  .about-view { padding-left: 10px; padding-right: 10px; }
  .about-content { padding: 18px 16px; }
}
</style>
