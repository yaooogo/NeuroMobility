export function formatAssetAmount(rawValue, decimals = 18) {
  const precision = Math.max(0, Number.parseInt(decimals, 10) || 0);
  let text = String(rawValue ?? '0').trim();
  if (!/^-?\d+$/u.test(text)) text = '0';
  const negative = text.startsWith('-');
  let digits = (negative ? text.slice(1) : text).replace(/^0+(?=\d)/u, '') || '0';
  if (precision === 0) return `${negative && digits !== '0' ? '-' : ''}${digits}`;

  digits = digits.padStart(precision + 1, '0');
  const integer = digits.slice(0, -precision);
  const fraction = digits.slice(-precision).replace(/0+$/u, '');
  const value = fraction ? `${integer}.${fraction}` : integer;
  return `${negative && value !== '0' ? '-' : ''}${value}`;
}

export function parseAssetAmount(value, decimals = 18) {
  const precision = Math.max(0, Number.parseInt(decimals, 10) || 0);
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text)) throw new Error('资产金额格式不正确');
  const [integerPart, fractionPart = ''] = text.split('.');
  if (fractionPart.length > precision) throw new Error(`资产金额最多支持 ${precision} 位小数`);

  const integer = integerPart.replace(/^0+(?=\d)/u, '') || '0';
  const raw = `${integer}${fractionPart.padEnd(precision, '0')}`.replace(/^0+(?=\d)/u, '') || '0';
  if (raw.length > 64) throw new Error('资产金额超出允许范围');
  return raw;
}
