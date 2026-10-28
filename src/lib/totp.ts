import crypto from 'crypto';

/**
 * RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30-second steps) using only Node's
 * crypto module. Compatible with Google Authenticator, Microsoft
 * Authenticator, Authy, 1Password, etc.
 */

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** Accept codes from one step before and after the current one (clock drift). */
export const TOTP_WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** New random 160-bit secret, base32-encoded (32 chars). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Current time step number (floor(unixSeconds / 30)). */
export function currentTimeStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
}

/** HOTP value for a raw key and counter (RFC 4226 dynamic truncation). */
export function hotp(key: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const msg = Buffer.alloc(8);
  // Counter fits easily in 53 bits; split into high/low 32-bit words.
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** TOTP code for a base32 secret at the given time step. */
export function totpAtStep(secretBase32: string, step: number, digits: number = TOTP_DIGITS): string {
  return hotp(base32Decode(secretBase32), step, digits);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Checks a 6-digit code against the current step ±TOTP_WINDOW. Steps at or
 * before `lastUsedStep` are rejected so a code cannot be replayed.
 *
 * @returns the matching time step, or null if the code is invalid.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastUsedStep: number | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const key = base32Decode(secretBase32);
  const now = currentTimeStep(nowMs);
  let matched: number | null = null;
  // Check every step in the window (no early exit) to keep timing uniform.
  for (let step = now - TOTP_WINDOW; step <= now + TOTP_WINDOW; step++) {
    if (safeEqual(hotp(key, step), normalized) && matched === null) {
      matched = step;
    }
  }
  if (matched === null) return null;
  if (typeof lastUsedStep === 'number' && matched <= lastUsedStep) return null;
  return matched;
}

/**
 * otpauth:// URI for authenticator apps (encoded into the QR code).
 * Label is "ListMe:<account>", issuer "ListMe".
 */
export function buildOtpauthUri(secretBase32: string, accountName: string, issuer = 'ListMe'): string {
  const account = accountName.replace(/:/g, '').trim() || 'admin';
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
