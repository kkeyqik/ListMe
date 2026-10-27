import { NextRequest, NextResponse } from 'next/server';
import { requireAdminModule, getRequestIp } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import type { AdminAccess } from '@/lib/admin-permissions';

/**
 * POST /api/admin/exports
 *
 * Admin CSV exports are generated in the browser from data the admin already
 * loaded. Each export first calls this endpoint, which checks the admin still
 * holds the module permission for that data and writes an audit row
 * (who, what, how many rows, which filters). The page refuses to download if
 * this call fails.
 */
const EXPORT_ACCESS: Record<string, AdminAccess> = {
  USERS: 'users',
  ADMINS: 'super',
  ACTIVITY_LOGS: 'super',
  LISTINGS: 'listings',
  PINCODES: 'listings',
};

export async function POST(request: NextRequest) {
  try {
    let body: { exportType?: unknown; rowCount?: unknown; filters?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const exportType = typeof body.exportType === 'string' ? body.exportType : '';
    const access = EXPORT_ACCESS[exportType];
    if (!access) {
      return NextResponse.json({ message: 'Unknown export type' }, { status: 400 });
    }

    const gate = await requireAdminModule(access);
    if (!gate.ok) return gate.response;

    const rowCount =
      typeof body.rowCount === 'number' && Number.isFinite(body.rowCount) && body.rowCount >= 0
        ? Math.floor(body.rowCount)
        : 0;

    // Keep the stored filter summary small and flat.
    let filters: Record<string, string> = {};
    if (body.filters && typeof body.filters === 'object' && !Array.isArray(body.filters)) {
      filters = Object.fromEntries(
        Object.entries(body.filters as Record<string, unknown>)
          .slice(0, 20)
          .map(([k, v]) => [k.slice(0, 40), String(v ?? '').slice(0, 200)])
      );
    }

    // Written directly (not via logAdminActivity, which swallows errors) so a
    // failed audit write fails the request and blocks the download.
    await prisma.adminActivityLog.create({
      data: {
        adminId: gate.admin.id,
        action: `${gate.admin.name || 'Admin'} exported ${exportType} CSV (${rowCount} rows)`,
        entityType: 'DATA_EXPORT',
        metadata: {
          exportType,
          rowCount,
          filters,
          ip: getRequestIp(request),
          userAgent: request.headers.get('user-agent') || null,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[admin/exports POST] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
