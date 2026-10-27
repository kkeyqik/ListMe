import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus, PropertyType, UserStatus } from '@prisma/client';
import { listingCityWhere } from '@/lib/city-aliases';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityParam = (searchParams.get('city') || 'bangalore').slice(0, 100);
    const cityName = cityParam.toLowerCase();

    // 1. Live counts, in one grouped query: only public (ACTIVE) listings of
    // active owners, with city aliases ("Delhi NCR" covers Noida, Gurgaon, ...).
    const grouped = await prisma.listing.groupBy({
      by: ['propertyType'],
      where: {
        ...listingCityWhere(cityParam),
        status: ListingStatus.ACTIVE,
        owner: { status: UserStatus.ACTIVE },
      },
      _count: { _all: true },
    });
    const countOf = (...types: PropertyType[]) =>
      grouped.filter((g) => types.includes(g.propertyType)).reduce((sum, g) => sum + g._count._all, 0);

    const apartmentsCount = countOf(PropertyType.APARTMENT);
    const builderFloorsCount = countOf(PropertyType.BUILDER_FLOOR);
    const plotsCount = countOf(PropertyType.PLOT);
    const villasCount = countOf(PropertyType.HOUSE, PropertyType.VILLA);
    const studiosCount = countOf(PropertyType.STUDIO);
    // There is no serviced-apartment type; the "serviced" card is fed by penthouses,
    // which is the premium category the card has always shown. Also returned as `penthouses`.
    const penthousesCount = countOf(PropertyType.PENTHOUSE);
    const farmhousesCount = countOf(PropertyType.FARM_HOUSE);

    // 2. Define city-specific real estate market statistics (Popular localities & Price trends)
    let localitiesDemand: any[] = [];
    let priceTrends: any[] = [];

    if (cityName.includes('mumbai')) {
      localitiesDemand = [
        { name: 'Andheri West', percentage: 40, type: 'Apartment' },
        { name: 'Bandra West', percentage: 35, type: 'Apartment' },
        { name: 'Thane West', percentage: 25, type: 'Apartment' }
      ];
      priceTrends = [
        { locality: 'Andheri West', rate: '₹26,500/sqft', yoy: '+8.4%', sparkline: [10, 15, 12, 18, 20, 25] },
        { locality: 'Bandra West', rate: '₹48,000/sqft', yoy: '+10.2%', sparkline: [20, 25, 22, 28, 30, 35] },
        { locality: 'Thane West', rate: '₹12,800/sqft', yoy: '+14.6%', sparkline: [8, 12, 10, 15, 18, 22] }
      ];
    } else if (cityName.includes('delhi') || cityName.includes('ncr') || cityName.includes('ghaziabad')) {
      localitiesDemand = [
        { name: 'Indirapuram', percentage: 45, type: 'Apartment' },
        { name: 'Noida Sector 150', percentage: 35, type: 'Apartment' },
        { name: 'Raj Nagar Extension', percentage: 20, type: 'Builder Floor' }
      ];
      priceTrends = [
        { locality: 'Indirapuram', rate: '₹6,950/sqft', yoy: '+15.1%', sparkline: [10, 12, 15, 13, 18, 22] },
        { locality: 'Noida Sector 150', rate: '₹7,200/sqft', yoy: '+19.6%', sparkline: [8, 10, 14, 16, 20, 26] },
        { locality: 'Raj Nagar Extension', rate: '₹4,350/sqft', yoy: '+12.6%', sparkline: [12, 11, 13, 12, 15, 18] }
      ];
    } else if (cityName.includes('pune')) {
      localitiesDemand = [
        { name: 'Hinjewadi', percentage: 50, type: 'Apartment' },
        { name: 'Baner', percentage: 30, type: 'Apartment' },
        { name: 'Koregaon Park', percentage: 20, type: 'Villa' }
      ];
      priceTrends = [
        { locality: 'Hinjewadi', rate: '₹7,100/sqft', yoy: '+16.2%', sparkline: [8, 10, 12, 15, 17, 22] },
        { locality: 'Baner', rate: '₹9,400/sqft', yoy: '+13.8%', sparkline: [10, 12, 15, 14, 18, 20] },
        { locality: 'Koregaon Park', rate: '₹18,500/sqft', yoy: '+9.2%', sparkline: [15, 17, 16, 19, 18, 21] }
      ];
    } else {
      // Default: Bangalore and fallback
      localitiesDemand = [
        { name: 'Whitefield', percentage: 45, type: 'Apartment' },
        { name: 'Indiranagar', percentage: 30, type: 'Apartment' },
        { name: 'Electronic City', percentage: 25, type: 'Apartment' }
      ];
      priceTrends = [
        { locality: 'Whitefield', rate: '₹8,500/sqft', yoy: '+18.2%', sparkline: [10, 14, 12, 18, 20, 25] },
        { locality: 'Indiranagar', rate: '₹15,200/sqft', yoy: '+12.4%', sparkline: [15, 18, 17, 20, 22, 26] },
        { locality: 'Electronic City', rate: '₹5,800/sqft', yoy: '+15.8%', sparkline: [8, 10, 12, 14, 16, 20] }
      ];
    }

    return NextResponse.json({
      city: cityParam,
      counts: {
        apartments: apartmentsCount,
        builderFloors: builderFloorsCount,
        plots: plotsCount,
        villas: villasCount,
        studios: studiosCount,
        serviced: penthousesCount,
        penthouses: penthousesCount,
        farmhouses: farmhousesCount,
      },
      localitiesDemand,
      priceTrends
    });
  } catch (error: any) {
    console.error('[cities/trends] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
