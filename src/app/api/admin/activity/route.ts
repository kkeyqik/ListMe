import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { REDACTED_EMAIL_BODY } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Fetch user activity logs
    const userLogs = await prisma.userActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500, // Fetch a reasonable history size
    });

    // Fetch admin activity logs (operations audit trail)
    const adminLogs = await prisma.adminActivityLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Resolve user profiles for the user logs to display seeker info
    const userIds = Array.from(new Set(userLogs.map((log) => log.userId).filter(Boolean))) as string[];
    const userProfiles = await prisma.profile.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

    const userLogsWithProfiles = userLogs.map((log) => ({
      ...log,
      user: log.userId ? profileMap.get(log.userId) || null : null,
    }));

    // Fetch email logs. Reset-code emails logged before bodies were redacted at
    // send time still contain the code, so hide them here as well.
    const emailLogs = (
      await prisma.emailLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    ).map((log) =>
      (log.metadata as { type?: string } | null)?.type === 'PASSWORD_RESET_OTP'
        ? { ...log, body: REDACTED_EMAIL_BODY }
        : log
    );

    return NextResponse.json({
      userLogs: userLogsWithProfiles,
      adminLogs,
      emailLogs,
    });
  } catch (error: any) {
    console.error('[admin/activity] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
