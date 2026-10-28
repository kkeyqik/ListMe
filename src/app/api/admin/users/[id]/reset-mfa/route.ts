import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminModule, getRequestIp } from '@/lib/admin-auth';
import { logAdminActivity } from '@/lib/activity-logger';
import { isMfaEnrolled, readMfa, writeMfa } from '@/lib/admin-mfa';

/**
 * POST /api/admin/users/[id]/reset-mfa
 *
 * SUPER_ADMIN only. Removes another admin's two-step verification (e.g. they
 * lost their phone and their backup codes), so they set it up again on the
 * next sign-in. A super admin cannot reset their own here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdminModule('super');
    if (!gate.ok) return gate.response;

    const { id } = await params;
    if (id === gate.admin.id) {
      return NextResponse.json(
        { message: 'You cannot reset your own two-step verification' },
        { status: 400 },
      );
    }

    const target = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, roleMetadata: true, updatedAt: true },
    });
    if (!target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const mfa = readMfa(target.roleMetadata);
    if (!isMfaEnrolled(target.roleMetadata) && !mfa.pendingSecretEnc) {
      return NextResponse.json({ message: 'Two-step verification is not set up for this user' }, { status: 400 });
    }

    const ok = await writeMfa(target.id, target, null);
    if (!ok) {
      return NextResponse.json({ message: 'The user was just updated. Please try again.' }, { status: 409 });
    }

    await logAdminActivity({
      adminId: gate.admin.id,
      action: `${gate.admin.name || 'Super Admin'} reset two-step verification for ${target.name || target.id}`,
      entityType: 'ADMIN_MFA',
      entityId: target.id,
      metadata: {
        event: 'reset',
        targetRole: target.role,
        wasEnabled: isMfaEnrolled(target.roleMetadata),
        ip: getRequestIp(request),
      },
    });

    return NextResponse.json({ message: 'Two-step verification reset' });
  } catch (error) {
    console.error('[POST /api/admin/users/[id]/reset-mfa] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
