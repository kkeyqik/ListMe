import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus, InterestStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

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
      prisma.interest.findMany({
        where: { status: InterestStatus.SOLD },
        select: { commissionAmount: true },
      }),
    ]);

    // Calculate total earned commission
    const totalCommissionEarned = soldInterests.reduce((sum, item) => {
      return sum + parseFloat(item.commissionAmount?.toString() || '0');
    }, 0);

    // Calculate potential pipeline commission from active listings that have active interests
    const activeInterestsWithListings = await prisma.interest.findMany({
      where: {
        status: { in: [InterestStatus.NEW, InterestStatus.ADMIN_CONTACTED, InterestStatus.IN_PROGRESS] },
      },
      select: {
        listing: {
          select: { askingPrice: true },
        },
      },
    });

    const potentialPipeline = activeInterestsWithListings.reduce((sum, item) => {
      const price = parseFloat(item.listing.askingPrice.toString());
      return sum + (price * 0.02); // 2% potential commission
    }, 0);

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
        },
        finance: {
          commissionEarned: totalCommissionEarned,
          pipelinePotential: potentialPipeline,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
