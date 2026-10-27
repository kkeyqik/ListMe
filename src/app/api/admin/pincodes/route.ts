import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminModule } from '@/lib/admin-auth';

interface PincodeRow {
  pinCode: string;
  city: string;
  locality: string;
  totalListings: number;
  activeListings: number;
  /** Average asking price of ACTIVE sale listings (0 when none). */
  avgAskingPrice: number;
  /** Average monthly rent of ACTIVE rent listings (0 when none). */
  avgMonthlyRent: number;
  totalInterests: number;
}

/** Most frequent value, so a pin code spanning spellings shows one name. */
function mostCommon(counts: Map<string, number>): string {
  let best = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export async function GET() {
  try {
    const gate = await requireAdminModule('listings');
    if (!gate.ok) return gate.response;

    // One query for everything, grouped by pin code in memory. The old version
    // grouped by pin+city+locality (duplicate rows for the same pin) and then
    // ran two extra queries per group.
    const listings = await prisma.listing.findMany({
      select: {
        pinCode: true,
        city: true,
        locality: true,
        status: true,
        listingFor: true,
        askingPrice: true,
        _count: { select: { interests: true } },
      },
    });

    const groups = new Map<
      string,
      {
        cities: Map<string, number>;
        localities: Map<string, number>;
        total: number;
        active: number;
        saleSum: number;
        saleCount: number;
        rentSum: number;
        rentCount: number;
        interests: number;
      }
    >();

    for (const l of listings) {
      const key = l.pinCode.trim();
      let g = groups.get(key);
      if (!g) {
        g = {
          cities: new Map(),
          localities: new Map(),
          total: 0,
          active: 0,
          saleSum: 0,
          saleCount: 0,
          rentSum: 0,
          rentCount: 0,
          interests: 0,
        };
        groups.set(key, g);
      }
      g.cities.set(l.city, (g.cities.get(l.city) || 0) + 1);
      g.localities.set(l.locality, (g.localities.get(l.locality) || 0) + 1);
      g.total += 1;
      g.interests += l._count.interests;
      if (l.status === 'ACTIVE') {
        g.active += 1;
        const price = Number(l.askingPrice.toString());
        if (l.listingFor === 'SALE') {
          g.saleSum += price;
          g.saleCount += 1;
        } else {
          g.rentSum += price;
          g.rentCount += 1;
        }
      }
    }

    const result: PincodeRow[] = Array.from(groups, ([pinCode, g]) => ({
      pinCode,
      city: mostCommon(g.cities),
      locality: mostCommon(g.localities),
      totalListings: g.total,
      activeListings: g.active,
      avgAskingPrice: g.saleCount ? Math.round(g.saleSum / g.saleCount) : 0,
      avgMonthlyRent: g.rentCount ? Math.round(g.rentSum / g.rentCount) : 0,
      totalInterests: g.interests,
    })).sort((a, b) => b.totalListings - a.totalListings);

    return NextResponse.json({ pincodes: result });
  } catch (error: unknown) {
    console.error('[admin/pincodes] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
