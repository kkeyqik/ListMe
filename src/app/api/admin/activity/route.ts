import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
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

    // Fetch email logs
    const emailLogs = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      userLogs: userLogsWithProfiles,
      adminLogs,
      emailLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
