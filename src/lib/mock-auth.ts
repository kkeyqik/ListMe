/**
 * Mock auth (test phone numbers, `x-mock-user-id`, `sb-mock-user-id`) is a
 * local-development convenience only. It requires the explicit
 * ENABLE_MOCK_AUTH=true opt-in AND a non-production runtime, so a stray env
 * flag on Vercel (where NODE_ENV is always "production") can never open it.
 */
export function isMockAuthEnabled(): boolean {
  return process.env.ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production';
}

/**
 * Returns a server-side secret, refusing to fall back to a hardcoded value in
 * production. Called lazily (at request time) so `next build` still works
 * without runtime secrets present.
 */
export function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return devFallback;
}
