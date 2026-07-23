import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // User might be unauthenticated when error occurred
    }

    const body = await request.json();
    const { message, stack, source = 'frontend', url, metadata } = body;

    if (!message) {
      return NextResponse.json({ message: 'Error message is required' }, { status: 400 });
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const userAgent = request.headers.get('user-agent') || null;

    // Log system error into UserActivityLog database table with action: SYSTEM_ERROR
    const errorLog = await prisma.userActivityLog.create({
      data: {
        userId,
        action: 'SYSTEM_ERROR',
        entityId: url || null,
        ipAddress,
        userAgent,
        metadata: {
          errorMessage: message,
          errorStack: stack || null,
          errorSource: source,
          pageUrl: url || null,
          timestamp: new Date().toISOString(),
          ...(metadata || {}),
        },
      },
    });

    return NextResponse.json({ success: true, logId: errorLog.id });
  } catch (error: any) {
    console.error('[ErrorLogger API] Failed to log error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
