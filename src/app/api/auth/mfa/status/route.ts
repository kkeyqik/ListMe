import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { hasVerifiedMfaCookie, isMfaEnrolled, loadMfaAdmin } from '@/lib/admin-mfa';

/**
 * GET /api/auth/mfa/status
 *
 * Two-step verification state for the signed-in admin:
 *   { enrolled, verified }
 * verified = this browser passed the check in the last 12 hours.
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const admin = await loadMfaAdmin(userId);
    if (!admin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const enrolled = isMfaEnrolled(admin.roleMetadata);
    const verified = enrolled && (await hasVerifiedMfaCookie(userId));
    return NextResponse.json(
      { enrolled, verified },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[GET /api/auth/mfa/status] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
