import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { REDACTED_EMAIL_BODY } from '@/lib/email';
import { requireAdminModule, logAdminDataAccess } from '@/lib/admin-auth';

const USER_LOG_LIMIT = 500;
const ADMIN_LOG_LIMIT = 500;
const EMAIL_LOG_LIMIT = 200;
const ERROR_LOG_LIMIT = 200;
const ACTION_RE = /^[A-Z_]{1,40}$/;

function parseDay(value: string | null, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setUTCHours(23, 59, 59, 999);
  else d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/admin/activity (Super Admin only)
 *
 * Query (all optional):
 * - startDate, endDate (YYYY-MM-DD): applied in the database, so older
 *   history is reachable instead of only the newest 500 rows.
 * - userAction: one user-activity action (e.g. LOGIN, SEARCH) to filter on.
 * - entityType: one admin-log entity type to filter on.
 *
 * System errors are fetched with their own query, so a burst of other
 * activity cannot push them out of view. Totals are returned so the page can
 * say when it is showing only part of the matching rows.
 */
export async function GET(request: NextRequest) {
  try {
    // Activity and email logs hold every user's IP, user agent and email
    // contents, so they are Super Admin only (matches the sidebar).
    const gate = await requireAdminModule('super');
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const from = parseDay(searchParams.get('startDate'), false);
    const to = parseDay(searchParams.get('endDate'), true);
    const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
    const userActionParam = searchParams.get('userAction');
    const userAction = userActionParam && ACTION_RE.test(userActionParam) ? userActionParam : undefined;
    const entityTypeParam = searchParams.get('entityType');
    const entityType = entityTypeParam && ACTION_RE.test(entityTypeParam) ? entityTypeParam : undefined;

    const userWhere: Prisma.UserActivityLogWhereInput = {
      ...(createdAt ? { createdAt } : {}),
      ...(userAction ? { action: userAction } : {}),
    };
    const errorWhere: Prisma.UserActivityLogWhereInput = {
      ...(createdAt ? { createdAt } : {}),
      action: 'SYSTEM_ERROR',
    };
    const adminWhere: Prisma.AdminActivityLogWhereInput = {
      ...(createdAt ? { createdAt } : {}),
      ...(entityType ? { entityType } : {}),
    };
    const emailWhere: Prisma.EmailLogWhereInput = createdAt ? { createdAt } : {};

    const [
      userLogs,
      userLogTotal,
      errorLogsRaw,
      errorTotal,
      adminLogs,
      adminLogTotal,
      emailLogsRaw,
      emailLogTotal,
      userActionGroups,
      entityTypeGroups,
    ] = await Promise.all([
      prisma.userActivityLog.findMany({ where: userWhere, orderBy: { createdAt: 'desc' }, take: USER_LOG_LIMIT }),
      prisma.userActivityLog.count({ where: userWhere }),
      prisma.userActivityLog.findMany({ where: errorWhere, orderBy: { createdAt: 'desc' }, take: ERROR_LOG_LIMIT }),
      prisma.userActivityLog.count({ where: errorWhere }),
      prisma.adminActivityLog.findMany({
        where: adminWhere,
        include: {
          admin: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: ADMIN_LOG_LIMIT,
      }),
      prisma.adminActivityLog.count({ where: adminWhere }),
      prisma.emailLog.findMany({ where: emailWhere, orderBy: { createdAt: 'desc' }, take: EMAIL_LOG_LIMIT }),
      prisma.emailLog.count({ where: emailWhere }),
      // Every action / entity type present, so the filters are not limited to
      // a hard-coded list.
      prisma.userActivityLog.groupBy({ by: ['action'], _count: { _all: true } }),
      prisma.adminActivityLog.groupBy({ by: ['entityType'], _count: { _all: true } }),
    ]);

    // Resolve user profiles for the user and error logs to display seeker info
    const userIds = Array.from(
      new Set([...userLogs, ...errorLogsRaw].map((log) => log.userId).filter(Boolean))
    ) as string[];
    const userProfiles = userIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, avatarUrl: true },
        })
      : [];
    const profileMap = new Map(userProfiles.map((p) => [p.id, p]));
    const withProfile = <T extends { userId: string | null }>(log: T) => ({
      ...log,
      user: log.userId ? profileMap.get(log.userId) || null : null,
    });

    // Reset-code emails logged before bodies were redacted at send time still
    // contain the code, so hide them here as well.
    const emailLogs = emailLogsRaw.map((log) =>
      (log.metadata as { type?: string } | null)?.type === 'PASSWORD_RESET_OTP'
        ? { ...log, body: REDACTED_EMAIL_BODY }
        : log
    );

    await logAdminDataAccess({
      admin: gate.admin,
      action: 'Viewed activity and email logs',
      entityType: 'DATA_ACCESS_ACTIVITY_LOGS',
      rowCount: userLogs.length + adminLogs.length + emailLogs.length + errorLogsRaw.length,
      request,
      metadata: {
        startDate: searchParams.get('startDate') || null,
        endDate: searchParams.get('endDate') || null,
        userAction: userAction || null,
        entityType: entityType || null,
      },
    });

    return NextResponse.json({
      userLogs: userLogs.map(withProfile),
      adminLogs,
      emailLogs,
      errorLogs: errorLogsRaw.map(withProfile),
      totals: {
        userLogs: userLogTotal,
        adminLogs: adminLogTotal,
        emailLogs: emailLogTotal,
        errorLogs: errorTotal,
      },
      limits: {
        userLogs: USER_LOG_LIMIT,
        adminLogs: ADMIN_LOG_LIMIT,
        emailLogs: EMAIL_LOG_LIMIT,
        errorLogs: ERROR_LOG_LIMIT,
      },
      userActions: userActionGroups.map((g) => g.action).sort(),
      entityTypes: entityTypeGroups.map((g) => g.entityType).filter(Boolean).sort(),
    });
  } catch (error: unknown) {
    console.error('[admin/activity] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
