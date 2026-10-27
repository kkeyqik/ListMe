import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { logUserActivity } from '@/lib/activity-logger';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { action, entityId, metadata } = await request.json();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clients may only record their own CLIENT_* events. Server-side actions
    // (LOGIN, FAILED_LOGIN, SEARCH, VIEW_PROPERTY, EXPRESS_INTEREST,
    // SYSTEM_ERROR, ...) drive the admin Activity view and must not be forgeable.
    if (typeof action !== 'string' || !/^CLIENT_[A-Z_]{1,33}$/.test(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Rate limiting: 30 requests per minute per user (or IP for anonymous)
    const rateLimitResult = rateLimit(`log-activity:${userId}`, 30, 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 30) }
      );
    }

    await logUserActivity({
      userId,
      action,
      entityId: typeof entityId === 'string' ? entityId.slice(0, 200) : undefined,
      request,
      metadata: metadata && typeof metadata === 'object' && JSON.stringify(metadata).length <= 4000 ? metadata : undefined,
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
