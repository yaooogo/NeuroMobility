<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestHelpArticles } from "../lib/api.js";

defineOptions({ inheritAttrs: false });

const router = useRouter();
const { lang, locale } = useLocale();
const articles = ref([]);
const openId = ref(null);
const loading = ref(true);
const errorMessage = ref("");
let requestId = 0;

function summary(content) {
  const text = String(content || "").replace(/\s+/gu, " ").trim();
  return text.length > 54 ? `${text.slice(0, 54)}...` : text;
}

async function loadArticles() {
  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const items = await requestHelpArticles(locale.value);
    if (currentRequestId !== requestId) return;
    articles.value = items;
    openId.value = null;
  } catch (error) {
    if (currentRequestId !== requestId) return;
    errorMessage.value = error?.message || lang("加载失败，请稍后重试");
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

function toggleArticle(id) {
  openId.value = openId.value === id ? null : id;
}

watch(locale, loadArticles, { immediate: true });
</script>

<template>
  <section class="help-view">
    <header class="help-header">
      <button type="button" :aria-label="lang('返回我的')" @click="router.push({ name: 'mine' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("帮助中心") }}</h1>
      <span></span>
    </header>

    <div v-if="loading" class="content-state">{{ lang("正在加载...") }}</div>
    <div v-else-if="errorMessage" class="content-state content-state--error">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="loadArticles">{{ lang("重新加载") }}</button>
    </div>
    <div v-else-if="!articles.length" class="content-state">{{ lang("暂无帮助内容") }}</div>

    <div v-else class="question-list">
      <article
        v-for="(article, index) in articles"
        :key="article.id"
        class="question-card"
        :class="{ 'question-card--open': openId === article.id }"
      >
        <button type="button" :aria-expanded="openId === article.id" @click="toggleArticle(article.id)">
          <strong class="question-number">{{ String(index + 1).padStart(2, "0") }}.</strong>
          <span class="question-copy">
            <b>{{ article.title }}</b>
            <small>{{ summary(article.content) }}</small>
          </span>
          <AppIcon class="question-arrow" name="chevron" />
        </button>
        <p v-if="openId === article.id">{{ article.content }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.help-view { min-height: 100vh; padding: 0 16px 36px; background: #fff; color: #454149; }
.help-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 21px; }
.help-header h1 { margin: 0; color: #151317; font-size: 18px; line-height: 31px; text-align: center; }
.help-header button { width: 40px; height: 31px; display: grid; place-items: start; padding: 4px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.help-header button svg { width: 26px; transform: rotate(180deg); }
.content-state { min-height: 180px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #8b8490; font-size: 14px; text-align: center; }
.content-state--error { color: #b14558; }
.content-state button { padding: 8px 18px; border: 0; border-radius: 18px; background: #8731dc; color: #fff; cursor: pointer; }
.question-list { display: grid; gap: 11px; }
.question-card { border: 1px solid #f3eef8; border-radius: 12px; background: #fff; box-shadow: 0 6px 18px rgba(99,53,138,.075); overflow: hidden; transition: box-shadow .2s ease; }
.question-card > button { width: 100%; min-height: 72px; display: grid; grid-template-columns: 54px minmax(0,1fr) 24px; align-items: center; gap: 7px; padding: 10px 15px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.question-number { color: #9a43e7; font-size: 25px; line-height: 1; letter-spacing: -.8px; }
.question-copy { min-width: 0; display: block; }
.question-copy b, .question-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-copy b { color: #48434b; font-size: 15px; line-height: 23px; }
.question-copy small { margin-top: 1px; color: #514c54; font-size: 13px; line-height: 20px; }
.question-arrow { width: 25px; color: #7d25d8; transition: transform .2s ease; }
.question-card--open { box-shadow: 0 8px 24px rgba(126,49,190,.11); }
.question-card--open .question-arrow { transform: rotate(90deg); }
.question-card > p { margin: -2px 19px 15px 76px; padding-top: 11px; border-top: 1px solid #f1edf5; color: #716b75; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.7; }
@media (max-width: 390px) {
  .help-view { padding-left: 10px; padding-right: 10px; }
  .question-card > button { grid-template-columns: 49px minmax(0,1fr) 22px; padding-left: 13px; padding-right: 13px; }
  .question-number { font-size: 26px; }
  .question-copy b { font-size: 15px; }
  .question-card > p { margin-left: 69px; }
}
</style>
