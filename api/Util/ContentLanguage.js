export const CONTENT_LANGUAGES = ['zh', 'en', 'id', 'ko', 'ja', 'th', 'hi', 'vi'];

export function normalizeContentLanguage(value) {
  const language = String(value || '').trim().toLowerCase();
  return CONTENT_LANGUAGES.includes(language) ? language : 'zh';
}
