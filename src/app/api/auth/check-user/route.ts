import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

/**
 * POST /api/auth/check-user  { identifier }
 *
 * Tells the login screen whether an email or phone already has an account, so
 * new phone numbers go to sign-up instead of being sent an SMS. The identifier
 * travels in the body (not the query string) so it stays out of request logs.
 *
 * This endpoint only reads. It used to "self-heal" missing profiles from
 * Supabase Auth inside an unauthenticated request, which could recreate
 * deleted users and attach user-editable metadata to new profiles. Profiles
 * are now created only by authenticated flows.
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`check-user:${ip}`, 10, 60 * 1000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { registered: false, message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 10) }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) {
      return NextResponse.json({ registered: false, message: 'Identifier is required' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      const profile = await prisma.profile.findFirst({
        where: { email: { equals: identifier, mode: 'insensitive' } },
        select: { id: true },
      });
      // Only return registration status — do NOT leak userId
      return NextResponse.json({ registered: !!profile });
    }

    const cleanPhone = identifier.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ registered: false, message: 'Invalid phone number' }, { status: 400 });
    }
    const localNum = cleanPhone.slice(-10);

    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { phone: `+91${localNum}` },
          { phone: localNum },
          { phone: `91${localNum}` },
        ],
      },
      select: { id: true },
    });

    // Only return registration status — do NOT leak userId
    return NextResponse.json({ registered: !!profile });
  } catch (error) {
    console.error('[check-user] Error:', error);
    return NextResponse.json(
      { registered: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
