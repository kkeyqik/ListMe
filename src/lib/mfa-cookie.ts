import crypto from 'crypto';
import { requireSecret } from '@/lib/mock-auth';

/**
 * "Two-step verification passed" cookie for admin accounts.
 *
 * Token format: userId:expiryTimestamp:signature
 * Signature   = HMAC-SHA256(userId:expiry) with a key derived from
 *               SESSION_SECRET (separate from the session-token key).
 *
 * Only crypto + env: safe to import from the proxy and from API routes.
 */

export const MFA_COOKIE_NAME = 'listme-admin-mfa';

/** Lifetime of a successful verification — 12 hours. */
export const MFA_COOKIE_DURATION = 12 * 60 * 60;

let cachedKey: { secret: string; key: Buffer } | null = null;

function cookieKey(): Buffer {
  const secret = requireSecret('SESSION_SECRET', 'dev-secret-do-not-use-in-production');
  if (cachedKey && cachedKey.secret === secret) return cachedKey.key;
  const key = Buffer.from(
    crypto.hkdfSync('sha256', secret, Buffer.alloc(0), 'listme-admin-mfa-cookie', 32),
  );
  cachedKey = { secret, key };
  return key;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', cookieKey()).update(payload).digest('hex');
}

export function createMfaCookieToken(userId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + MFA_COOKIE_DURATION;
  const payload = `${userId}:${expiry}`;
  return `${payload}:${sign(payload)}`;
}

/** True only if the token is intact, unexpired and issued for `userId`. */
export function verifyMfaCookieToken(token: string | null | undefined, userId: string | null | undefined): boolean {
  if (!token || !userId) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [tokenUserId, expiryStr, signature] = parts;
  if (tokenUserId !== userId) return false;

  const expected = sign(`${tokenUserId}:${expiryStr}`);
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  const expiry = parseInt(expiryStr, 10);
  return !isNaN(expiry) && Math.floor(Date.now() / 1000) <= expiry;
}

export function getMfaCookieOptions() {
  return {
    path: '/',
    maxAge: MFA_COOKIE_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

export function getClearedMfaCookieOptions() {
  return { ...getMfaCookieOptions(), maxAge: 0 };
}
