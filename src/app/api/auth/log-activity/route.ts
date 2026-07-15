import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/lib/activity-logger';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { action, entityId, metadata } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await logUserActivity({
      userId: user?.id || null,
      action,
      entityId,
      request,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
