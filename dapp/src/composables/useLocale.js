import { computed, ref } from "vue";
import { messages, normalizeLocale, supportedLocales } from "../i18n/index.js";

const storageKey = "neuro_locale";
const locale = ref(normalizeLocale(localStorage.getItem(storageKey) || navigator.language));

export function useLocale() {
  const currentLocale = computed(() => supportedLocales.find((item) => item.value === locale.value));
  function setLocale(value) {
    locale.value = normalizeLocale(value);
    localStorage.setItem(storageKey, locale.value);
    document.documentElement.lang = currentLocale.value?.tag || locale.value;
  }
  function t(key) {
    return messages[locale.value]?.[key] || messages.zh[key] || key;
  }
  setLocale(locale.value);
  return { locale, currentLocale, supportedLocales, setLocale, t };
}
