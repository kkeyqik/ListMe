import { prisma } from './prisma';
import { rateLimit } from './rate-limiter';
import { getClientIp, isLikelyBot } from './request-ip';

const VIEW_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000; // one view per visitor per listing per 6 hours

/**
 * Counts one public view of a listing. Bots are ignored and repeat views from
 * the same visitor are collapsed (per server instance), so a loop of requests
 * cannot inflate the owner's "Views" stat. The raw UPDATE leaves updated_at
 * alone, so a view does not look like a content change (sitemap lastModified).
 *
 * Call it after the response is sent, e.g. inside `after()` from next/server.
 */
export async function recordListingView(listingId: string, request: Request, viewerId?: string | null) {
  if (isLikelyBot(request)) return;
  const visitor = viewerId || getClientIp(request);
  if (!rateLimit(`listing-view:${listingId}:${visitor}`, 1, VIEW_DEDUPE_WINDOW_MS).allowed) return;
  try {
    await prisma.$executeRaw`UPDATE listings SET view_count = view_count + 1 WHERE id = ${listingId}::uuid`;
  } catch (err) {
    console.error('[listing-views] viewCount update failed:', err);
  }
}
