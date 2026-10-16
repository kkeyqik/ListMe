/**
 * Returns `path` if it is a same-site relative path, otherwise `fallback`.
 * Blocks open redirects such as `//evil.com` or `/\evil.com`.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  return path;
}
