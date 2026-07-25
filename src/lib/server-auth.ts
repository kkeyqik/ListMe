import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * Returns the authenticated user's ID by checking both:
 * 1. Supabase native session (`supabase.auth.getUser()`)
 * 2. Custom signed `listme-session` cookie
 * 
 * This unifies authentication across Firebase bypasses and standard Supabase logins.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    let userId: string | null = null;

    // 1. Try Supabase session first.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    }

    // 2. Fall back to the signed listme-session cookie.
    if (!userId) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

      if (sessionCookie?.value) {
        const session = verifySessionToken(sessionCookie.value);
        if (session) {
          userId = session.userId;
        }
      }
    }

    return userId;
  } catch (error) {
    console.error('[getAuthenticatedUserId] Error:', error);
    return null;
  }
}
