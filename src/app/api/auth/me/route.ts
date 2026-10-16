import { NextResponse } from 'next/server';
import { ensureProfile, getAuthenticatedUserId, getSessionUser, hasVerifiedEmail } from '@/lib/server-auth';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/me
 *
 * The signed-in user's profile, read from the database (the only source of
 * role and status), plus `emailVerified` from Supabase.
 *
 * Returns `{ authenticated: false }` (200) when there is no session, and adds
 * `suspended: true` when the session belongs to a suspended or banned account.
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (sessionUser) {
      const profile = await ensureProfile(sessionUser);
      if (profile.status === 'SUSPENDED' || profile.status === 'BANNED') {
        return NextResponse.json({ authenticated: false, suspended: true }, { status: 200 });
      }
      return NextResponse.json({
        authenticated: true,
        profile: { ...profile, emailVerified: hasVerifiedEmail(sessionUser) },
      });
    }

    if (isMockAuthEnabled()) {
      const userId = await getAuthenticatedUserId();
      const profile = userId ? await prisma.profile.findUnique({ where: { id: userId } }) : null;
      if (profile) {
        return NextResponse.json({ authenticated: true, profile: { ...profile, emailVerified: true } });
      }
    }

    return NextResponse.json({ authenticated: false }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
