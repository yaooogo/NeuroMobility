<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  questions: {
    type: Array,
    default: () => Array.from({ length: 8 }, () => ({
      title: "最低投资金额是多少？",
      summary: "最低投资金额是多少？",
      answer: "最低参与金额为 1,000 USDT，您也可以选择页面提供的其他参与金额。"
    }))
  }
});

const router = useRouter();
const { lang } = useLocale();
const openIndex = ref(-1);

function toggleQuestion(index) {
  openIndex.value = openIndex.value === index ? -1 : index;
}

function translateQuestion(text) {
  if (text === "最低投资金额是多少？") return lang("最低投资金额是多少？");
  if (text === "最低参与金额为 1,000 USDT，您也可以选择页面提供的其他参与金额。") {
    return lang("最低参与金额为 1,000 USDT，您也可以选择页面提供的其他参与金额。");
  }
  return lang(text);
}
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

    <div class="question-list">
      <article
        v-for="(question, index) in props.questions"
        :key="`${question.title}-${index}`"
        class="question-card"
        :class="{ 'question-card--open': openIndex === index }"
      >
        <button type="button" :aria-expanded="openIndex === index" @click="toggleQuestion(index)">
          <strong class="question-number">{{ String(index + 1).padStart(2, "0") }}.</strong>
          <span class="question-copy">
            <b>{{ translateQuestion(question.title) }}</b>
            <small>{{ translateQuestion(question.summary) }}</small>
          </span>
          <AppIcon class="question-arrow" name="chevron" />
        </button>
        <p v-if="openIndex === index">{{ translateQuestion(question.answer) }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.help-view { min-height: 100vh; padding: 0 16px 36px; background: #fff; color: #454149; }
.help-header { height: 91px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 21px; }
.help-header h1 { margin: 0; color: #151317; font-size: 20px; line-height: 31px; text-align: center; }
.help-header button { width: 40px; height: 31px; display: grid; place-items: start; padding: 4px 0; border: 0; background: transparent; color: #8431dc; cursor: pointer; }
.help-header button svg { width: 26px; transform: rotate(180deg); }
.question-list { display: grid; gap: 11px; }
.question-card { border: 1px solid #f3eef8; border-radius: 16px; background: #fff; box-shadow: 0 6px 18px rgba(99,53,138,.075); overflow: hidden; transition: box-shadow .2s ease; }
.question-card > button { width: 100%; min-height: 72px; display: grid; grid-template-columns: 54px minmax(0,1fr) 24px; align-items: center; gap: 7px; padding: 10px 15px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.question-number { color: #9a43e7; font-size: 29px; line-height: 1; letter-spacing: -.8px; }
.question-copy { min-width: 0; display: block; }
.question-copy b, .question-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-copy b { color: #48434b; font-size: 16px; line-height: 23px; }
.question-copy small { margin-top: 1px; color: #514c54; font-size: 13px; line-height: 20px; }
.question-arrow { width: 25px; color: #7d25d8; transition: transform .2s ease; }
.question-card--open { box-shadow: 0 8px 24px rgba(126,49,190,.11); }
.question-card--open .question-arrow { transform: rotate(90deg); }
.question-card > p { margin: -2px 19px 15px 76px; padding-top: 11px; border-top: 1px solid #f1edf5; color: #716b75; font-size: 13px; line-height: 1.7; }
@media (max-width: 390px) {
  .help-view { padding-left: 10px; padding-right: 10px; }
  .question-card > button { grid-template-columns: 49px minmax(0,1fr) 22px; padding-left: 13px; padding-right: 13px; }
  .question-number { font-size: 26px; }
  .question-copy b { font-size: 15px; }
  .question-card > p { margin-left: 69px; }
}
</style>
