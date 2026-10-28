import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      userId = await getAuthenticatedUserId();
    } catch {
      // User might be unauthenticated when error occurred
    }

    const ipKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = rateLimit(`log-error:${userId || ipKey}`, 20, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ success: false }, { status: 429, headers: getRateLimitHeaders(limit, 20) });
    }

    const body = await request.json().catch(() => null);
    const { message, stack, source = 'frontend', url: rawUrl, metadata } = body || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ message: 'Error message is required' }, { status: 400 });
    }

    // The same error repeating (render loops, polling) is stored once per minute per client.
    const dedupe = rateLimit(`log-error-dup:${userId || ipKey}:${message.slice(0, 200)}`, 1, 60 * 1000);
    if (!dedupe.allowed) {
      return NextResponse.json({ success: true, deduplicated: true });
    }

    // Page URLs can carry tokens or personal data in the query string or hash: keep the path only.
    let url: string | null = null;
    if (typeof rawUrl === 'string') {
      try {
        const parsed = new URL(rawUrl);
        url = parsed.origin + parsed.pathname;
      } catch {
        url = rawUrl.split(/[?#]/)[0];
      }
    }

    // Unauthenticated endpoint: cap sizes so it cannot be used to fill the database
    const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);
    const safeMetadata =
      metadata && typeof metadata === 'object' && JSON.stringify(metadata).length <= 4000 ? metadata : {};

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;

    // Log system error into UserActivityLog database table with action: SYSTEM_ERROR
    const errorLog = await prisma.userActivityLog.create({
      data: {
        userId,
        action: 'SYSTEM_ERROR',
        entityId: clip(url, 500),
        ipAddress,
        userAgent,
        metadata: {
          ...safeMetadata,
          errorMessage: clip(message, 2000),
          errorStack: clip(stack, 8000),
          errorSource: clip(source, 50),
          pageUrl: clip(url, 500),
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true, logId: errorLog.id });
  } catch (error: any) {
    console.error('[ErrorLogger API] Failed to log error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
