/** Best-effort client IP for rate-limit keys and logs (first x-forwarded-for hop on Vercel). */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

const BOT_UA_RE = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|curl|wget|python-requests|httpclient|axios|node-fetch|go-http-client/i;

/** True for crawlers, link unfurlers and scripted clients (and a missing user agent). */
export function isLikelyBot(request: Request): boolean {
  const ua = request.headers.get('user-agent');
  return !ua || BOT_UA_RE.test(ua);
}
