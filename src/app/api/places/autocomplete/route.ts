import { NextRequest, NextResponse } from 'next/server';
import { searchPlacesDetailed } from '@/lib/places';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

// Public proxy to Photon / Google / India Post: throttle per IP to respect upstream fair use.
const LIMIT = 60;
const WINDOW_MS = 60 * 1000;
const MAX_Q = 100;

/** GET /api/places/autocomplete?q=&city=&limit= : India-wide locality suggestions. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
  const city = (params.get('city') || '').trim().slice(0, MAX_Q);
  const limitParam = parseInt(params.get('limit') || '', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(15, Math.max(1, limitParam)) : 8;

  if (q.length < 2) {
    return NextResponse.json(
      { success: false, message: 'Type at least 2 characters', places: [] },
      { status: 400 }
    );
  }

  const rl = rateLimit(`places:${getClientIp(request)}`, LIMIT, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many location searches. Please wait a moment.', places: [] },
      { status: 429, headers: getRateLimitHeaders(rl, LIMIT) }
    );
  }

  try {
    const { places, degraded } = await searchPlacesDetailed({ q, city: city || undefined, limit });
    return NextResponse.json(
      { success: true, places },
      {
        headers: {
          // Same query, same answer: let the CDN serve repeats for a day. A fallback
          // answer (a provider was down) is cached only briefly so it heals quickly.
          'Cache-Control': degraded
            ? 'public, max-age=60, s-maxage=120'
            : 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    // searchPlaces does not throw; this is a last-resort guard.
    console.error('[API places/autocomplete] Error:', error);
    return NextResponse.json({ success: true, places: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
