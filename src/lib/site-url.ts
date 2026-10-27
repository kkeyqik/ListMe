/**
 * Canonical public origin of the site, used for metadataBase, canonical/og:url,
 * robots.txt, sitemap.xml, JSON-LD and breadcrumbs.
 *
 * Set NEXT_PUBLIC_SITE_URL to the real production domain once one is connected.
 * VERCEL_URL is deliberately NOT used: it is a per-deployment host that sits
 * behind Vercel SSO and changes on every deploy.
 */
const FALLBACK_SITE_URL = 'https://listme-sable.vercel.app';

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return url.origin;
    } catch {
      // fall through to the default
    }
  }
  return FALLBACK_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

/** Build an absolute URL on the canonical origin from a path such as "/property/123". */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
