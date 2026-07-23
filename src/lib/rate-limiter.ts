/**
 * In-memory sliding-window rate limiter.
 *
 * Uses `globalThis` so the store survives across warm Lambda / serverless
 * invocations within the same process.
 *
 * A max cache size (10 000 entries) prevents unbounded memory growth —
 * the oldest entries are evicted when the cap is exceeded.
 */

const MAX_CACHE_SIZE = 10_000;

// Persist the store across hot-reloads / warm invocations.
const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, number[]>;
};

function getStore(): Map<string, number[]> {
  if (!globalStore.__rateLimitStore) {
    globalStore.__rateLimitStore = new Map<string, number[]>();
  }
  return globalStore.__rateLimitStore;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Check whether a request identified by `key` is within the rate limit.
 *
 * @param key      - Unique identifier (e.g. IP address, userId).
 * @param limit    - Maximum number of requests allowed in the window.
 * @param windowMs - Window size in milliseconds.
 *
 * @returns `allowed` — whether the request should proceed,
 *          `remaining` — how many requests are left,
 *          `retryAfter` — seconds until the next slot opens (0 if allowed).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const store = getStore();
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get (or init) the timestamps for this key.
  let timestamps = store.get(key) || [];

  // Prune entries outside the current window.
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    // Earliest timestamp still in the window → when it expires.
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfter = Math.ceil(retryAfterMs / 1000);

    store.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Record this request.
  timestamps.push(now);
  store.set(key, timestamps);

  // Evict oldest entries when the cache grows too large.
  if (store.size > MAX_CACHE_SIZE) {
    const keysToDelete = store.size - MAX_CACHE_SIZE;
    const iterator = store.keys();
    for (let i = 0; i < keysToDelete; i++) {
      const oldest = iterator.next().value;
      if (oldest !== undefined) {
        store.delete(oldest);
      }
    }
  }

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    retryAfter: 0,
  };
}

// ---------------------------------------------------------------------------
// Header helper
// ---------------------------------------------------------------------------

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
