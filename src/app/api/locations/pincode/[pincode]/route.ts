import { NextRequest, NextResponse } from 'next/server';
import { lookupPinCode } from '@/lib/pincode';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

// Public proxy to India Post: throttle per IP so it cannot be used to hammer the upstream API.
const LIMIT = 60;
const WINDOW_MS = 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  try {
    const { pincode } = await params;
    const cleanPin = (pincode || '').replace(/\D/g, '');

    if (cleanPin.length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit Indian PIN code' },
        { status: 400 }
      );
    }

    const limit = rateLimit(`pincode:${getClientIp(request)}`, LIMIT, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many PIN code lookups. Please wait a moment.' },
        { status: 429, headers: getRateLimitHeaders(limit, LIMIT) }
      );
    }

    const result = await lookupPinCode(cleanPin);

    if (!result) {
      return NextResponse.json(
        { success: false, message: `No location found for PIN code ${cleanPin}` },
        { status: 404 }
      );
    }

    // PIN code data rarely changes: let the CDN answer repeat lookups.
    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
    );
  } catch (error: any) {
    console.error('[API locations/pincode] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while resolving PIN code' },
      { status: 500 }
    );
  }
}
