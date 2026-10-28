import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { logAdminActivity } from '@/lib/activity-logger';
import { hasAdminAccess, isAdminRole, isSuperAdminRole, type AdminAccess } from '@/lib/admin-permissions';
import { hasVerifiedMfaCookie, mfaRequiredResponse } from '@/lib/admin-mfa';

export interface AdminRequester {
  id: string;
  name: string | null;
  role: Role;
  roleMetadata: unknown;
  isSuper: boolean;
}

type AdminCheck =
  | { ok: true; admin: AdminRequester }
  | { ok: false; response: NextResponse };

/**
 * Server-side admin gate for API routes. Reads the requester's role and
 * roleMetadata.permissions from the database on every call (never from the
 * cookie), so Role Manager changes apply immediately.
 *
 *   const gate = await requireAdminModule('users');
 *   if (!gate.ok) return gate.response;
 *
 * Pass null to require only "is an admin", or 'super' for SUPER_ADMIN only.
 * SUPER_ADMIN always passes.
 */
export async function requireAdminModule(access: AdminAccess | null): Promise<AdminCheck> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, roleMetadata: true },
  });

  if (!profile || !isAdminRole(profile.role)) {
    return { ok: false, response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }

  if (access && !hasAdminAccess(profile, access)) {
    const message =
      access === 'super'
        ? 'Forbidden: Super Admin only'
        : `Forbidden: your admin account does not have the '${access}' permission`;
    return { ok: false, response: NextResponse.json({ message }, { status: 403 }) };
  }

  // Two-step verification (authenticator app) is required for every admin
  // API call. The cookie is set by /api/auth/mfa/verify and bound to this user.
  if (!(await hasVerifiedMfaCookie(profile.id))) {
    return { ok: false, response: mfaRequiredResponse() };
  }

  return {
    ok: true,
    admin: {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      roleMetadata: profile.roleMetadata,
      isSuper: isSuperAdminRole(profile.role),
    },
  };
}

/** Minutes within which repeated identical list reads by one admin are logged once. */
const READ_LOG_WINDOW_MINUTES = 10;

function requestIp(request?: NextRequest | null): string | null {
  if (!request) return null;
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

/**
 * Records that an admin read a list of personal data (users, logs, leads).
 * Identical reads by the same admin are collapsed to one row per 10 minutes
 * so page reloads do not flood the audit log. Never throws.
 */
export async function logAdminDataAccess(params: {
  admin: AdminRequester;
  action: string;
  entityType: string;
  rowCount: number;
  request?: NextRequest | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const since = new Date(Date.now() - READ_LOG_WINDOW_MINUTES * 60 * 1000);
    const recent = await prisma.adminActivityLog.findFirst({
      where: {
        adminId: params.admin.id,
        entityType: params.entityType,
        action: { startsWith: params.action },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (recent) return;

    await logAdminActivity({
      adminId: params.admin.id,
      action: `${params.action} by ${params.admin.name || 'Admin'} (${params.rowCount} rows)`,
      entityType: params.entityType,
      metadata: {
        rowCount: params.rowCount,
        ip: requestIp(params.request),
        userAgent: params.request?.headers.get('user-agent') || null,
        ...(params.metadata || {}),
      },
    });
  } catch (error) {
    console.error('[logAdminDataAccess] Error:', error);
  }
}

/**
 * Number of ACTIVE super admins other than `excludeId`. Used to refuse any
 * change that would leave the platform without a super admin.
 */
export async function countOtherActiveSuperAdmins(excludeId: string): Promise<number> {
  return prisma.profile.count({
    where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { not: excludeId } },
  });
}

export { requestIp as getRequestIp };
