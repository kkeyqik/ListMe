import crypto from 'crypto';

/**
 * HMAC-SHA256 signed session token system.
 *
 * Token format: userId:role:expiryTimestamp:signature
 * Signature   = HMAC-SHA256(userId:role:expiryTimestamp, SESSION_SECRET)
 *
 * Uses 'lax' sameSite so OAuth redirects (e.g. Google) can send cookies back.
 */

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-secret-do-not-use-in-production';

/** Session lifetime in seconds — 7 days. */
const SESSION_DURATION = 604800;

/** Cookie name used to store the session token. */
export const SESSION_COOKIE_NAME = 'listme-session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a signed session token for the given user.
 *
 * @param userId - Unique user / profile id.
 * @param role   - User role (e.g. "user", "admin").
 * @returns A colon-delimited signed token string.
 */
export function createSessionToken(userId: string, role: string): string {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const payload = `${userId}:${role}:${expiry}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

/**
 * Verify a session token's signature and expiry.
 *
 * @returns The decoded userId + role, or `null` if the token is
 *          malformed, tampered with, or expired.
 */
export function verifySessionToken(
  token: string,
): { userId: string; role: string } | null {
  const parts = token.split(':');
  if (parts.length !== 4) return null;

  const [userId, role, expiryStr, signature] = parts;
  const payload = `${userId}:${role}:${expiryStr}`;

  // Constant-time comparison to prevent timing attacks and avoid uncaught RangeError on mismatched buffer lengths.
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) {
    return null;
  }

  return { userId, role };
}

/**
 * Cookie options for the session token.
 *
 * - `httpOnly` prevents client-side JS access.
 * - `secure` is enabled only in production.
 * - `sameSite: 'lax'` allows the cookie to travel with top-level
 *   navigations (OAuth redirects) while still blocking most CSRF vectors.
 */
export function getSessionCookieOptions(): object {
  return {
    path: '/',
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

/** Password reset token lifetime — 15 minutes. */
const RESET_TOKEN_DURATION = 900;

/**
 * Create a signed, short-lived token granting permission to reset password.
 * Issued ONLY after OTP has been verified.
 * Optionally binds to a specific DB PasswordResetToken ID for single-use enforcement.
 */
export function createPasswordResetSessionToken(userId: string, tokenId?: string): string {
  const expiry = Math.floor(Date.now() / 1000) + RESET_TOKEN_DURATION;
  const payload = tokenId ? `RESET:${userId}:${tokenId}:${expiry}` : `RESET:${userId}:${expiry}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

/**
 * Verify a password reset token.
 * Returns the userId and optional tokenId if valid and unexpired, null otherwise.
 */
export function verifyPasswordResetSessionToken(
  token: string
): { userId: string; tokenId?: string } | null {
  const parts = token.split(':');
  if (parts[0] !== 'RESET') return null;

  let userId = '';
  let tokenId: string | undefined = undefined;
  let expiryStr = '';
  let signature = '';
  let payload = '';

  if (parts.length === 5) {
    // Format: RESET:userId:tokenId:expiry:signature
    [, userId, tokenId, expiryStr, signature] = parts;
    payload = `RESET:${userId}:${tokenId}:${expiryStr}`;
  } else if (parts.length === 4) {
    // Format: RESET:userId:expiry:signature (legacy fallback)
    [, userId, expiryStr, signature] = parts;
    payload = `RESET:${userId}:${expiryStr}`;
  } else {
    return null;
  }

  const expected = sign(payload);
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) {
    return null;
  }

  return { userId, tokenId };
}
