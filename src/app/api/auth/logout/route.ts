import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { logUserActivity } from '@/lib/activity-logger';

/**
 * POST /api/auth/logout
 *
 * Revokes this device's Supabase refresh token (so a copied token cannot be
 * reused) and clears the session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) console.warn('[POST /api/auth/logout] Supabase signOut:', error.message);

    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith('sb-') || cookie.name === 'listme-session') {
        cookieStore.set(cookie.name, '', { path: '/', maxAge: 0 });
      }
    }

    if (userId) {
      await logUserActivity({
        userId,
        action: 'LOGOUT',
        request,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/auth/logout] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
