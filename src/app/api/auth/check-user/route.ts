import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('identifier')?.trim();

    if (!identifier) {
      return NextResponse.json({ registered: false, message: 'Identifier is required' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      // Check email
      const profile = await prisma.profile.findFirst({
        where: {
          email: {
            equals: identifier,
            mode: 'insensitive',
          },
        },
      });
      // Only return registration status — do NOT leak userId
      return NextResponse.json({ registered: !!profile });
    } else {
      // Check phone number
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
          ],
        },
      });
      // Only return registration status — do NOT leak userId
      return NextResponse.json({ registered: !!profile });
    }
  } catch (error: any) {
    console.error('[check-user] Error:', error);
    return NextResponse.json(
      { registered: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
