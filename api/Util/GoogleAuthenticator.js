import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_PERIOD_SECONDS = 30;
const DEFAULT_DIGITS = 6;

function encodeBase32(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');

  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    encoded += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

export function generateGoogleAuthenticatorSecret(bytes = 20) {
  return encodeBase32(crypto.randomBytes(bytes));
}

export function buildGoogleAuthenticatorUri(secret, accountName, issuer = 'NeuroMobility') {
  const normalizedIssuer = String(issuer || 'NeuroMobility').trim();
  const label = `${normalizedIssuer}:${String(accountName || '').trim()}`;
  const params = new URLSearchParams({
    secret: String(secret || '').trim(),
    issuer: normalizedIssuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_PERIOD_SECONDS)
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function decodeBase32(secret) {
  const normalized = String(secret || '')
    .toUpperCase()
    .replace(/[\s=-]/gu, '');

  if (!normalized || [...normalized].some(character => !BASE32_ALPHABET.includes(character))) {
    return null;
  }

  let bits = '';
  for (const character of normalized) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return bytes.length ? Buffer.from(bytes) : null;
}

function generateCode(secretBuffer, counter, digits = DEFAULT_DIGITS) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);

  return String(binary % (10 ** digits)).padStart(digits, '0');
}

export function verifyGoogleAuthenticatorCode(secret, code, options = {}) {
  const normalizedCode = String(code || '').trim();
  const digits = Number(options.digits || DEFAULT_DIGITS);
  const periodSeconds = Number(options.periodSeconds || DEFAULT_PERIOD_SECONDS);
  const window = Math.max(0, Number(options.window ?? 1));
  const timestamp = Number(options.timestamp ?? Date.now());

  if (!new RegExp(`^\\d{${digits}}$`, 'u').test(normalizedCode)) return false;
  const secretBuffer = decodeBase32(secret);
  if (!secretBuffer || !Number.isFinite(timestamp) || !Number.isFinite(periodSeconds) || periodSeconds <= 0) return false;

  const counter = Math.floor(timestamp / 1000 / periodSeconds);
  const submitted = Buffer.from(normalizedCode);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = Buffer.from(generateCode(secretBuffer, counter + offset, digits));
    if (submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected)) return true;
  }

  return false;
}

export default { buildGoogleAuthenticatorUri, generateGoogleAuthenticatorSecret, verifyGoogleAuthenticatorCode };
