import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * POST /api/auth/logout
 *
 * Destroys the current session by clearing all auth-related cookies:
 *  - listme-session    (our signed session cookie)
 *  - sb-mock-user-id   (dev/test cleanup)
 *  - any sb-* cookies  (Supabase auth tokens)
 */
export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear our session cookie.
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    });

    // Clear the mock user cookie used in dev/test.
    cookieStore.set('sb-mock-user-id', '', {
      path: '/',
      maxAge: 0,
    });

    // Clear any Supabase-related cookies (sb-* prefix).
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        cookieStore.set(cookie.name, '', {
          path: '/',
          maxAge: 0,
        });
      }
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
