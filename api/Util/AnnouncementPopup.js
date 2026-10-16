function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim().replace('T', ' ');
  const normalized = text.length === 16 ? `${text}:00` : text;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) throw new Error('弹窗时间格式不正确');
  const date = new Date(`${normalized.replace(' ', 'T')}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19).replace('T', ' ') !== normalized) throw new Error('弹窗时间无效');
  return normalized;
}

export function validateAnnouncementPopup(body = {}) {
  const enabled = Number(body.popup_enabled) === 1 ? 1 : 0;
  if (!enabled) return { popup_enabled: 0, popup_start_at: null, popup_end_at: null };
  const start = normalizeDate(body.popup_start_at);
  const end = normalizeDate(body.popup_end_at);
  if (!start || !end || start >= end) throw new Error('弹窗结束时间必须晚于开始时间');
  return { popup_enabled: 1, popup_start_at: start, popup_end_at: end };
}
