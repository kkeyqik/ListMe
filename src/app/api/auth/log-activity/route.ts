import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/lib/activity-logger';
import { createClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { action, entityId, metadata } = await request.json();

    // Resolve user from session
    let userId: string | null = null;

    // Try Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

    // Fallback: signed session cookie
    if (!userId) {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        if (sessionCookie) {
          const sessionData = verifySessionToken(sessionCookie);
          if (sessionData) {
            userId = sessionData.userId;
          }
        }
      } catch {
        // ignore
      }
    }

    // Rate limiting: 30 requests per minute per user (or IP for anonymous)
    const rateLimitKey = userId || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitResult = rateLimit(`log-activity:${rateLimitKey}`, 30, 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 30) }
      );
    }

    await logUserActivity({
      userId,
      action,
      entityId,
      request,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[log-activity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
