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

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Aggregate listing details grouped by pinCode
    const pinCodeAggregations = await prisma.listing.groupBy({
      by: ['pinCode', 'city', 'locality'],
      _count: {
        id: true,
      },
      _avg: {
        askingPrice: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // For each pincode group, count total interests expressed
    const result = await Promise.all(
      pinCodeAggregations.map(async (group) => {
        const totalInterests = await prisma.interest.count({
          where: {
            listing: {
              pinCode: group.pinCode,
            },
          },
        });

        const activeCount = await prisma.listing.count({
          where: {
            pinCode: group.pinCode,
            status: 'ACTIVE',
          },
        });

        return {
          pinCode: group.pinCode,
          city: group.city,
          locality: group.locality,
          totalListings: group._count.id,
          activeListings: activeCount,
          avgAskingPrice: group._avg.askingPrice ? parseFloat(group._avg.askingPrice.toString()) : 0,
          totalInterests,
        };
      })
    );

    return NextResponse.json({ pincodes: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
