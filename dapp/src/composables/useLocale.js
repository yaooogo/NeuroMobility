import { computed, ref } from "vue";
import {defaultLocale, messages, normalizeLocale, supportedLocales } from "../i18n/index.js";
import { crc32 } from "@i18n/crc32.js";

const storageKey = "neuro_locale";
const locale = ref(normalizeLocale(localStorage.getItem(storageKey) || navigator.language));

function resolveMessage(currentLocale, text) {
  const rawKey = String(text ?? "");
  const hashKey = crc32(rawKey);

  return (
    messages[currentLocale]?.[rawKey] ||
    messages[currentLocale]?.[hashKey] ||
    messages[defaultLocale]?.[rawKey] ||
    messages[defaultLocale]?.[hashKey] ||
    rawKey
  );
}

export function useLocale() {
  const currentLocale = computed(() => supportedLocales.find((item) => item.value === locale.value));
  function setLocale(value) {
    locale.value = normalizeLocale(value);
    localStorage.setItem(storageKey, locale.value);
    document.documentElement.lang = currentLocale.value?.tag || locale.value;
  }
  function lang(key) {
    return resolveMessage(locale.value, key);
  }
  setLocale(locale.value);
  return { locale, currentLocale, supportedLocales, setLocale, lang };
}
