import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { REDACTED_EMAIL_BODY } from '@/lib/email';
import { requireAdminModule, logAdminDataAccess } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Activity and email logs hold every user's IP, user agent and email
    // contents, so they are Super Admin only (matches the sidebar).
    const gate = await requireAdminModule('super');
    if (!gate.ok) return gate.response;

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

    await logAdminDataAccess({
      admin: gate.admin,
      action: 'Viewed activity and email logs',
      entityType: 'DATA_ACCESS_ACTIVITY_LOGS',
      rowCount: userLogs.length + adminLogs.length + emailLogs.length,
      request,
    });

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
