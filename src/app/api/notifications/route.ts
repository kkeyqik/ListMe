import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
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

    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('[notifications] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
