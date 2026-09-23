const CJK_PATTERN = /[\u3400-\u9fff]/u;

export function toDappApiMessage(value, fallback = 'Request failed') {
  const message = String(value?.message ?? value ?? '').trim();
  if (!message) return fallback;
  if (message === '资产金额格式不正确') return 'Invalid asset amount format';
  const precisionMatch = message.match(/^资产金额最多支持 (\d+) 位小数$/u);
  if (precisionMatch) return `The asset amount supports up to ${precisionMatch[1]} decimal places`;
  if (message === '资产金额超出允许范围') return 'The asset amount exceeds the allowed range';
  if (message === '邀请人不能是自己') return 'The inviter cannot be the wallet itself';
  if (message === '邀请人不能设置为当前用户的下级') return 'The inviter cannot be a descendant wallet';
  return CJK_PATTERN.test(message) ? fallback : message;
}

export function toDappApiError(error, fallback = 'Request failed') {
  return new Error(toDappApiMessage(error, fallback));
}
