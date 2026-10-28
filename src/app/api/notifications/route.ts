import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      // Unread total across all notifications, not just this page (for a badge).
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('[notifications] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
