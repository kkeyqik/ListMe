import { NextRequest, NextResponse } from 'next/server';
import { InterestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminModule, logAdminDataAccess } from '@/lib/admin-auth';

const MAX_PAGE_SIZE = 100;

/**
 * GET /api/admin/interests
 *
 * Admin lead log, gated by the 'interests' module permission (SUPER_ADMIN
 * always passes). Unlike /api/interests?mode=all this is paginated, filters
 * by status on the server and returns summary counts computed in SQL, so the
 * overview can ask for just the 5 most recent leads.
 *
 * Query: status (InterestStatus, optional), page (1-based), limit (1-100).
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminModule('interests');
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50)
    );
    const statusParam = (searchParams.get('status') || '').toUpperCase();
    const status = (Object.values(InterestStatus) as string[]).includes(statusParam)
      ? (statusParam as InterestStatus)
      : undefined;
    const where = status ? { status } : {};

    const [interests, filteredTotal, byStatus, commission] = await Promise.all([
      prisma.interest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              askingPrice: true,
              listingFor: true,
              city: true,
              locality: true,
              pinCode: true,
              status: true,
            },
          },
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.interest.count({ where }),
      prisma.interest.groupBy({ by: ['status'], _count: { _all: true } }),
      // Only SOLD deals count as earned commission (same rule as /api/admin/metrics).
      prisma.interest.aggregate({
        where: { status: InterestStatus.SOLD },
        _sum: { commissionAmount: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row.status] = row._count._all;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const sold = counts[InterestStatus.SOLD] || 0;
    const closed = counts[InterestStatus.CLOSED] || 0;

    await logAdminDataAccess({
      admin: gate.admin,
      action: 'Viewed interest log',
      entityType: 'DATA_ACCESS_INTERESTS',
      rowCount: interests.length,
      request,
      metadata: { status: status || 'ALL', page },
    });

    return NextResponse.json({
      interests,
      meta: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
      },
      summary: {
        total,
        closedDeals: sold,
        activeLeads: total - sold - closed,
        commissionEarned: Number(commission._sum.commissionAmount?.toString() || '0'),
        byStatus: counts,
      },
    });
  } catch (error: unknown) {
    console.error('[admin/interests GET] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
