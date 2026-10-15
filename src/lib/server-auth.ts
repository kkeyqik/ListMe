import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { prisma } from '@/lib/prisma';

/**
 * Returns the authenticated user's ID by checking:
 * 1. Mock test header `x-mock-user-id` (local development with ENABLE_MOCK_AUTH only)
 * 2. Supabase native session (`supabase.auth.getUser()`)
 * 3. Custom signed `listme-session` cookie
 *
 * Suspended or banned accounts are treated as signed out, so an existing
 * session stops working as soon as an admin suspends the user.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    let userId: string | null = null;

    if (isMockAuthEnabled()) {
      try {
        const headerList = await headers();
        userId = headerList.get('x-mock-user-id');
      } catch {
        // Ignore if headers() is called outside request context
      }
    }

    if (!userId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      }
    }

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

    if (!userId) return null;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (profile && (profile.status === 'SUSPENDED' || profile.status === 'BANNED')) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error('[getAuthenticatedUserId] Error:', error);
    return null;
  }
}
