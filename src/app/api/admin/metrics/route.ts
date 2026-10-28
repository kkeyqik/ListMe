import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminModule } from '@/lib/admin-auth';
import { ListingStatus, InterestStatus } from '@prisma/client';

export async function GET() {
  try {
    // Aggregate counts only (no personal data), shown on the overview every admin sees.
    const gate = await requireAdminModule(null);
    if (!gate.ok) return gate.response;

    // Execute aggregation queries
    const [
      activeListingsCount,
      pendingListingsCount,
      rejectedListingsCount,
      deactivatedListingsCount,
      totalUsersCount,
      totalInterestsCount,
      soldInterests,
    ] = await Promise.all([
      prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
      prisma.listing.count({ where: { status: ListingStatus.REJECTED } }),
      prisma.listing.count({ where: { status: ListingStatus.DEACTIVATED } }),
      prisma.profile.count({ where: { role: 'USER' } }),
      prisma.interest.count(),
      prisma.interest.aggregate({
        where: { status: InterestStatus.SOLD },
        _sum: { commissionAmount: true },
      }),
    ]);

    // Calculate total earned commission
    const totalCommissionEarned = Number(soldInterests._sum.commissionAmount?.toString() || '0');

    // Open leads (no amounts: the old "pipeline" estimate loaded every open
    // lead with its listing price and was never shown).
    const openInterestsCount = await prisma.interest.count({
      where: {
        status: { in: [InterestStatus.NEW, InterestStatus.ADMIN_CONTACTED, InterestStatus.IN_PROGRESS] },
      },
    });

    return NextResponse.json({
      metrics: {
        listings: {
          active: activeListingsCount,
          pending: pendingListingsCount,
          rejected: rejectedListingsCount,
          deactivated: deactivatedListingsCount,
          total: activeListingsCount + pendingListingsCount + rejectedListingsCount + deactivatedListingsCount,
        },
        users: {
          total: totalUsersCount,
        },
        interests: {
          total: totalInterestsCount,
          open: openInterestsCount,
        },
        finance: {
          commissionEarned: totalCommissionEarned,
        },
      },
    });
  } catch (error: any) {
    console.error('[admin/metrics] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
