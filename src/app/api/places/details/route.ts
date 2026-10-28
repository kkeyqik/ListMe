import { NextRequest, NextResponse } from 'next/server';
import { getPlaceDetails } from '@/lib/places';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

const LIMIT = 30;
const WINDOW_MS = 60 * 1000;

/**
 * GET /api/places/details?id=google:<placeId>
 * Coordinates and PIN for a Google suggestion (Google autocomplete has neither).
 * Only used when GOOGLE_MAPS_API_KEY is set; the key never leaves the server.
 */
export async function GET(request: NextRequest) {
  const id = (request.nextUrl.searchParams.get('id') || '').trim().slice(0, 320);
  if (!id.startsWith('google:')) {
    return NextResponse.json({ success: false, message: 'Unknown place id' }, { status: 400 });
  }

  const rl = rateLimit(`place-details:${getClientIp(request)}`, LIMIT, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: getRateLimitHeaders(rl, LIMIT) }
    );
  }

  const place = await getPlaceDetails(id);
  if (!place) {
    return NextResponse.json({ success: false, message: 'Place details unavailable' }, { status: 404 });
  }
  return NextResponse.json(
    { success: true, place },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } }
  );
}
