const BASE = 'http://localhost';

/**
 * Returns `path` if it is a same-site relative path, otherwise `fallback`.
 * Blocks open redirects such as `//evil.com`, `/\evil.com`, `/%09/evil.com`
 * and `javascript:` URLs by resolving the path against a fixed origin.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  // Browsers drop tabs/newlines and treat `\` as `/`, which turns `/\t/evil.com` into `//evil.com`
  if (!path || !path.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(path)) return fallback;
  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
