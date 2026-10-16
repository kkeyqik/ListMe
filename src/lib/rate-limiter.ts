import { prisma } from '@/lib/prisma';

/**
 * Fixed-window rate limiter backed by the `rate_limits` table
 * (prisma/sql/auth-email-first.sql).
 *
 * Vercel runs many server instances, each with its own memory, so counters
 * must live in the database to hold across requests. If the database call
 * fails, an in-process counter is used for that request instead, so a
 * database hiccup never locks everyone out.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

const MAX_MEMORY_KEYS = 10_000;

const globalStore = globalThis as unknown as {
  __rateLimitFallback?: Map<string, { count: number; resetAt: number }>;
};

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (!globalStore.__rateLimitFallback) globalStore.__rateLimitFallback = new Map();
  const store = globalStore.__rateLimitFallback;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  store.set(key, entry);

  if (store.size > MAX_MEMORY_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  return toResult(entry.count, entry.resetAt, limit, now);
}

function toResult(count: number, resetAt: number, limit: number, now: number): RateLimitResult {
  if (count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
  }
  return { allowed: true, remaining: limit - count, retryAfter: 0 };
}

/**
 * Count one request against `key` and report whether it is within `limit`
 * requests per `windowMs`.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
      insert into public.rate_limits (key, count, reset_at)
      values (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
      on conflict (key) do update set
        count    = case when public.rate_limits.reset_at <= now() then 1 else public.rate_limits.count + 1 end,
        reset_at = case when public.rate_limits.reset_at <= now() then excluded.reset_at else public.rate_limits.reset_at end
      returning count, reset_at`;

    // Occasionally clear out expired rows so the table stays small.
    if (Math.random() < 0.01) {
      prisma.$executeRaw`delete from public.rate_limits where reset_at < now() - interval '1 day'`.catch(() => {});
    }

    const row = rows[0];
    return toResult(Number(row.count), new Date(row.reset_at).getTime(), limit, now);
  } catch (error) {
    console.error('[rateLimit] Database limiter unavailable, using in-process fallback:', error);
    return memoryRateLimit(key, limit, windowMs);
  }
}

/** The caller's IP address as reported by Vercel's proxy. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build standard rate-limit response headers.
 */
export function getRateLimitHeaders(
  result: { remaining: number; retryAfter: number },
  limit: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };

  if (result.retryAfter > 0) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}
