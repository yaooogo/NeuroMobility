import en from "./locales/en.js";
import hi from "./locales/hi.js";
import id from "./locales/id.js";
import ja from "./locales/ja.js";
import ko from "./locales/ko.js";
import th from "./locales/th.js";
import vi from "./locales/vi.js";
import zh from "./locales/zh.js";

export const messages = {
  zh,
  en,
  id,
  ko,
  ja,
  th,
  hi,
  vi
};

export const defaultLocale = "zh";

export const supportedLocales = [
  { value: "zh", label: "中文", htmlLang: "zh-CN" },
  { value: "en", label: "English", htmlLang: "en" },
  { value: "id", label: "Bahasa Indonesia", htmlLang: "id" },
  { value: "ko", label: "한국어", htmlLang: "ko" },
  { value: "ja", label: "日本語", htmlLang: "ja" },
  { value: "th", label: "ไทย", htmlLang: "th" },
  { value: "hi", label: "हिन्दी", htmlLang: "hi" },
  { value: "vi", label: "Tiếng Việt", htmlLang: "vi" }
];

export const localeMap = new Map(supportedLocales.map((item) => [item.value, item]));

export function normalizeLocale(value) {
  const locale = String(value || "").trim();
  return localeMap.has(locale) ? locale : defaultLocale;
}
