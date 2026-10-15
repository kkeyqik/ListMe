import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile.
 *
 * Resolution order:
 *  1. Supabase session (via supabase.auth.getUser())
 *  2. Signed listme-session cookie (HMAC-SHA256)
 *
 * Returns `{ authenticated: false }` (200) when no valid session exists,
 * rather than a 401, so the client can distinguish "not logged in" from
 * an actual error.
 */
export async function GET() {
  try {
    // Resolves Supabase session or signed cookie, and treats suspended users as signed out
    const userId = await getAuthenticatedUserId();

    // No valid session from either source.
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    // 3. Fetch the profile from the database.
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ authenticated: true, profile });
  } catch (error) {
    console.error('[GET /api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
