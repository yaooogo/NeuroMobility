export function formatFixedAmount(value, precision = 5) {
  const digits = Math.max(0, Number.parseInt(precision, 10) || 0);
  const text = String(value ?? '0').trim();
  if (!/^-?\d+(?:\.\d+)?$/u.test(text)) return digits ? `0.${'0'.repeat(digits)}` : '0';

  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [integerPart = '0', fractionPart = ''] = unsigned.split('.');
  const roundingDigits = fractionPart.padEnd(digits + 1, '0');
  const keptFraction = roundingDigits.slice(0, digits);
  const scale = 10n ** BigInt(digits);
  let scaled = BigInt(integerPart || '0') * scale + BigInt(keptFraction || '0');
  if (roundingDigits[digits] >= '5') scaled += 1n;

  const integer = scaled / scale;
  const fraction = digits ? (scaled % scale).toString().padStart(digits, '0') : '';
  const prefix = negative && scaled !== 0n ? '-' : '';
  return `${prefix}${integer.toLocaleString('en-US')}${digits ? `.${fraction}` : ''}`;
}
