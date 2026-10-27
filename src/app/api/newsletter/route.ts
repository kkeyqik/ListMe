import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logUserActivity } from '@/lib/activity-logger';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 5 sign-ups per IP per hour

// Subscriptions are stored as NEWSLETTER_SUBSCRIBE rows in user_activity_log
// until a dedicated subscriber table exists (see prisma/proposed/round3-schema.md).
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(`newsletter:${getClientIp(request)}`, LIMIT, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(limit, LIMIT) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body || {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Already subscribed: answer the same way, but do not add another row.
    const existing = await prisma.userActivityLog.findFirst({
      where: {
        action: 'NEWSLETTER_SUBSCRIBE',
        metadata: { path: ['email'], equals: trimmedEmail },
      },
      select: { id: true },
    });

    if (!existing) {
      const logged = await logUserActivity({
        request,
        action: 'NEWSLETTER_SUBSCRIBE',
        metadata: {
          email: trimmedEmail,
          subscribedAt: new Date().toISOString(),
          source: 'footer_form',
        },
      });
      // logUserActivity swallows DB errors; do not claim success when nothing was saved.
      if (!logged) {
        return NextResponse.json(
          { success: false, message: 'Could not subscribe right now. Please try again later.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
    });
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while subscribing' },
      { status: 500 }
    );
  }
}
