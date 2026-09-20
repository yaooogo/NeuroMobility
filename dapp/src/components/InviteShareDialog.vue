<script setup>
import { computed, ref, watch } from "vue";
import { useLocale } from "../composables/useLocale.js";

const props = defineProps({
  visible: { type: Boolean, default: false },
  inviteCode: { type: String, default: "" }
});
const emit = defineEmits(["close"]);
const { lang } = useLocale();
const copiedKey = ref("");

const registrationUrl = computed(() => {
  if (!props.inviteCode) return "";
  return `${window.location.origin}?t=${encodeURIComponent(props.inviteCode)}`;
});

watch(() => props.visible, (visible) => {
  if (visible) copiedKey.value = "";
});

async function copyValue(key, value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    copiedKey.value = key;
    window.clearTimeout(copyValue.timer);
    copyValue.timer = window.setTimeout(() => { copiedKey.value = ""; }, 1800);
  } catch {
    copiedKey.value = "";
  }
}
</script>

<template>
  <transition name="invite-dialog">
    <div v-if="visible" class="invite-overlay" @click.self="emit('close')">
      <section class="share-dialog" role="dialog" aria-modal="true" :aria-label="lang('邀请好友')">
        <header>
          <h2>{{ lang("邀请好友") }}</h2>
          <button type="button" :aria-label="lang('关闭')" @click="emit('close')">×</button>
        </header>
        <label>
          <span>{{ lang("我的邀请码") }}</span>
          <button type="button" @click="copyValue('code', inviteCode)">
            <b>{{ inviteCode }}</b>
            <small>{{ copiedKey === "code" ? lang("已复制") : lang("点击复制") }}</small>
          </button>
        </label>
        <label>
          <span>{{ lang("注册链接") }}</span>
          <button type="button" @click="copyValue('url', registrationUrl)">
            <b>{{ registrationUrl }}</b>
            <small>{{ copiedKey === "url" ? lang("已复制") : lang("点击复制") }}</small>
          </button>
        </label>
      </section>
    </div>
  </transition>
</template>

<style scoped>
.invite-overlay { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(255,255,255,.62); backdrop-filter: blur(8px); }
.share-dialog { width: min(100%, 440px); padding: 24px 14px 27px; border: 1.5px solid #9b40ee; border-radius: 20px; background: rgba(255,255,255,.98); box-shadow: 0 22px 60px rgba(83,31,127,.18); }
.share-dialog header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }
.share-dialog h2 { margin: 0; font-size: 19px; }
.share-dialog header button { width: 36px; height: 36px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: #4a464e; font-size: 35px; font-weight: 200; line-height: 1; cursor: pointer; }
.share-dialog label { display: block; margin-top: 20px; color: #4d4851; font-size: 13px; }
.share-dialog label > span { display: block; margin-bottom: 10px; }
.share-dialog label > button { width: 100%; min-height: 44px; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 8px; padding: 0 13px; border: 0; border-radius: 10px; background: #f0edfb; color: #a8a3ae; text-align: left; cursor: pointer; }
.share-dialog b { min-width: 0; overflow: hidden; font-size: 13px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.share-dialog small { color: #9140df; font-size: 10px; white-space: nowrap; }
.invite-dialog-enter-active, .invite-dialog-leave-active { transition: opacity .2s ease; }
.invite-dialog-enter-active .share-dialog, .invite-dialog-leave-active .share-dialog { transition: transform .2s ease; }
.invite-dialog-enter-from, .invite-dialog-leave-to { opacity: 0; }
.invite-dialog-enter-from .share-dialog, .invite-dialog-leave-to .share-dialog { transform: translateY(10px) scale(.98); }
</style>
