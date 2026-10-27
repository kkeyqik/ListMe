import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus, ListingFor, PropertyType, Furnishing, Possession, Ownership, Parking } from '@prisma/client';
import { logUserActivity } from '@/lib/activity-logger';

function asEnum<T extends Record<string, string>>(enumObj: T, value: string | null | undefined): T[keyof T] | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (Object.values(enumObj) as string[]).includes(upper) ? (upper as T[keyof T]) : undefined;
}

const COMMERCIAL_TYPES: PropertyType[] = [
  PropertyType.OFFICE,
  PropertyType.SHOP,
  PropertyType.WAREHOUSE,
  PropertyType.COMMERCIAL_LAND,
];

// 1. GET - Fetch / Search Listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
    const skip = (page - 1) * limit;

    // Filters
    const type = searchParams.get('type'); // sale | rent | commercial
    const propertyType = searchParams.get('property_type');
    const city = searchParams.get('city');
    const locality = searchParams.get('locality');
    const pinCode = searchParams.get('pincode');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const bhk = searchParams.get('bhk');
    const furnishing = searchParams.get('furnishing');
    const query = searchParams.get('query');
    const propertyTypes = searchParams.get('property_types');
    const possessionParam = searchParams.get('possession');
    const postedBy = searchParams.get('posted_by')?.toLowerCase();
    const minAreaParam = searchParams.get('min_area');
    const maxAreaParam = searchParams.get('max_area');
    // Background fetches (e.g. the home page's featured strip) aren't user searches
    const source = searchParams.get('source');

    // Sort & Date parameters
    const sort = searchParams.get('sort') || 'newest';
    const startDate = searchParams.get('startDate') || searchParams.get('start_date');
    const endDate = searchParams.get('endDate') || searchParams.get('end_date');

    // Build Prisma query condition block
    const where: any = {};

    const ownerOnly = searchParams.get('owner') === 'true';
    const adminOnly = searchParams.get('admin') === 'true';

    if (ownerOnly) {
      const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
      where.ownerId = userId;
      
      // Optional status filter in owner mode
      const statusFilter = asEnum(ListingStatus, searchParams.get('status'));
      if (statusFilter) {
        where.status = statusFilter;
      }
    } else {
      if (adminOnly) {
        const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

        const userProfile = await prisma.profile.findUnique({
          where: { id: userId },
        });

        if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const statusFilter = asEnum(ListingStatus, searchParams.get('status'));
        if (statusFilter) {
          where.status = statusFilter;
        }
      } else {
        // By default, public search only shows ACTIVE listings
        where.status = ListingStatus.ACTIVE;
      }
    }

    // Filter by listing_for parameter (sale | rent)
    const listingForParam = searchParams.get('listing_for') || searchParams.get('listingFor');
    if (listingForParam && listingForParam !== 'ALL') {
      if (listingForParam.toLowerCase() === 'sale') {
        where.listingFor = ListingFor.SALE;
      } else if (listingForParam.toLowerCase() === 'rent') {
        where.listingFor = ListingFor.RENT;
      }
    }

    // Filter by transaction type
    if (type) {
      if (type === 'sale') {
        where.listingFor = ListingFor.SALE;
      } else if (type === 'rent') {
        where.listingFor = ListingFor.RENT;
      } else if (type === 'project') {
        // "Projects" = properties for sale that are new / under construction,
        // unless the user explicitly asked to include ready-to-move ones.
        where.listingFor = ListingFor.SALE;
        const statuses = (searchParams.get('project_statuses') || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const wantsReady = statuses.some((s) => s.startsWith('ready'));
        const wantsUnderConstruction = statuses.length === 0
          || statuses.some((s) => s.includes('construction') || s.includes('launch'));
        if (wantsUnderConstruction && !wantsReady) {
          where.possession = Possession.UNDER_CONSTRUCTION;
        } else if (wantsReady && !wantsUnderConstruction) {
          where.possession = Possession.READY;
        }
        const projectClass = searchParams.get('project_class');
        if (projectClass === 'commercial') {
          where.propertyType = { in: COMMERCIAL_TYPES };
        } else if (projectClass === 'residential') {
          where.propertyType = { notIn: COMMERCIAL_TYPES };
        }
      } else if (type === 'commercial') {
        where.propertyType = { in: COMMERCIAL_TYPES };
        const commercialTrade = searchParams.get('commercial_trade');
        if (commercialTrade === 'lease' || commercialTrade === 'rent') {
          where.listingFor = ListingFor.RENT;
        } else if (commercialTrade === 'buy' || commercialTrade === 'sale' || commercialTrade === 'invest') {
          where.listingFor = ListingFor.SALE;
        }
      }
    }

    // Filter by specific property type, or a comma-separated list (property_types=HOUSE,VILLA)
    const propertyTypeFilter = asEnum(PropertyType, propertyType);
    const propertyTypesFilter = (propertyTypes || '')
      .split(',')
      .map((t) => asEnum(PropertyType, t.trim()))
      .filter((t): t is PropertyType => !!t);
    if (propertyTypeFilter) {
      where.propertyType = propertyTypeFilter;
    } else if (propertyTypesFilter.length > 0) {
      where.propertyType = { in: propertyTypesFilter };
    }

    // Construction / possession status (ready | under_construction)
    const possessionFilter = asEnum(Possession, possessionParam);
    if (possessionFilter) {
      where.possession = possessionFilter;
    }

    // Posted by: every ListMe listing is posted directly by its owner, so
    // dealer/builder filters honestly return nothing rather than everything.
    if (postedBy && postedBy !== 'owner' && postedBy !== 'any') {
      where.id = { in: [] };
    }

    // Area range (sq ft): matches carpet area, or plot area for land
    const minArea = minAreaParam ? parseFloat(minAreaParam) : NaN;
    const maxArea = maxAreaParam ? parseFloat(maxAreaParam) : NaN;
    if (Number.isFinite(minArea) || Number.isFinite(maxArea)) {
      const range: { gte?: number; lte?: number } = {};
      if (Number.isFinite(minArea)) range.gte = minArea;
      if (Number.isFinite(maxArea)) range.lte = maxArea;
      where.AND = [
        ...(where.AND || []),
        { OR: [{ carpetArea: range }, { carpetArea: null, plotArea: range }] },
      ];
    }

    if (city) {
      if (city.toLowerCase() === 'delhi' || city.toLowerCase() === 'delhi ncr') {
        where.city = { contains: 'Delhi', mode: 'insensitive' };
      } else {
        where.city = { contains: city.trim(), mode: 'insensitive' };
      }
    }
    if (locality) {
      where.locality = { contains: locality, mode: 'insensitive' };
    }
    if (pinCode) {
      where.pinCode = pinCode;
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          dateFilter.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    // Pricing filters
    if (minPrice || maxPrice) {
      where.askingPrice = {};
      const min = minPrice ? parseFloat(minPrice) : NaN;
      const max = maxPrice ? parseFloat(maxPrice) : NaN;
      if (Number.isFinite(min)) {
        where.askingPrice.gte = min;
      }
      if (Number.isFinite(max)) {
        where.askingPrice.lte = max;
      }
    }

    // Configuration / BHK
    if (bhk) {
      const bhkVal = parseInt(bhk, 10);
      if (bhkVal >= 5) {
        where.bedrooms = { gte: 5 };
      } else if (Number.isFinite(bhkVal)) {
        where.bedrooms = bhkVal;
      }
    }

    // Furnishing status
    const furnishingFilter = asEnum(Furnishing, furnishing);
    if (furnishingFilter) {
      where.furnishing = furnishingFilter;
    }

    // Text search query (across title, description, city, locality)
    if (query) {
      const cleanTerms = query
        .trim()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && !['in', 'at', 'near', 'and', 'the', 'for', 'of'].includes(t.toLowerCase()));

      const termsToSearch = cleanTerms.length > 0 ? cleanTerms : [query.trim()];

      where.AND = [
        ...(where.AND || []),
        ...termsToSearch.map((term) => ({
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
            { locality: { contains: term, mode: 'insensitive' } },
          ],
        })),
      ];
    }

    // Log the search activity if filters are used
    // Owner/admin dashboards and background fetches are not searches.
    const hasFilters = !!(type || propertyType || propertyTypes || city || locality || pinCode || minPrice || maxPrice || bhk || furnishing || query || possessionParam);
    if (hasFilters && !ownerOnly && !adminOnly && !source) {
      // Log after the response is sent so search results aren't delayed.
      after(async () => {
        let loggedInUserId: string | undefined;
        try {
          loggedInUserId = (await getAuthenticatedUserId()) || undefined;
        } catch {
          // Ignore errors extracting user details for public search logging
        }

        await logUserActivity({
          userId: loggedInUserId,
          action: 'SEARCH',
          request,
          metadata: {
            type,
            propertyType,
            propertyTypes,
            city,
            locality,
            pinCode,
            minPrice,
            maxPrice,
            bhk,
            furnishing,
            possession: possessionParam,
            query,
          },
        });
      });
    }

    // Sort order definition
    let orderBy: any = { createdAt: 'desc' }; // default
    const sortNorm = (sort || '').toLowerCase();
    if (sortNorm === 'newest' || sortNorm === 'latest') {
      orderBy = { createdAt: 'desc' };
    } else if (sortNorm === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortNorm === 'price_asc') {
      orderBy = { askingPrice: 'asc' };
    } else if (sortNorm === 'price_desc') {
      orderBy = { askingPrice: 'desc' };
    } else if (sortNorm === 'area_desc') {
      // Listings without an area go last instead of first (Postgres DESC = NULLS FIRST)
      orderBy = [{ carpetArea: { sort: 'desc', nulls: 'last' } }, { plotArea: { sort: 'desc', nulls: 'last' } }];
    }

    // Execute queries in parallel
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        // The exact address and map pin are private until the seeker expresses
        // interest (see /api/listings/[id]); only owners and admins get them here.
        omit: ownerOnly || adminOnly ? undefined : { fullAddress: true, latitude: true, longitude: true },
        include: {
          images: {
            orderBy: { displayOrder: 'asc' },
            take: adminOnly ? 20 : 1, // Full image count for admin cards, primary for public
          },
          ...(adminOnly ? { owner: { select: { id: true, name: true, email: true, phone: true } } } : {}),
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[listings GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. POST - Create Listing (Protected Route)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify user profile, status, and phone verification
    const userProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { phoneVerified: true, status: true, phone: true },
    });

    if (!userProfile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (userProfile.status === 'SUSPENDED' || userProfile.status === 'BANNED') {
      return NextResponse.json({ message: 'Your account has been suspended or banned' }, { status: 403 });
    }

    if (!userProfile.phoneVerified) {
      return NextResponse.json(
        { message: 'Your mobile phone number must be verified before posting a property listing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Deconstruct and validate payload details
    const {
      listingFor,
      propertyType,
      title,
      description,
      keyHighlights,
      city,
      locality,
      subLocality,
      pinCode,
      fullAddress,
      landmark,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      balconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      plotArea,
      askingPrice,
      pricePerSqft,
      maintenanceCharges,
      securityDeposit,
      priceNegotiable,
      furnishing,
      facing,
      floorNumber,
      totalFloors,
      possession,
      possessionDate,
      ageOfProperty,
      ownership,
      parking,
      parkingCount,
      waterSupply,
      powerBackup,
      reraNumber,
      amenities, // array of amenity IDs
    } = body;

    // Basic required validation
    if (!listingFor || !propertyType || !title || !city || !locality || !pinCode || !fullAddress || !askingPrice) {
      return NextResponse.json(
        { message: 'Missing required property details' },
        { status: 400 }
      );
    }

    // Insert new listing inside database
    const newListing = await prisma.listing.create({
      data: {
        ownerId: userId,
        listingFor: listingFor.toUpperCase() as ListingFor,
        propertyType: propertyType.toUpperCase() as PropertyType,
        title,
        description: description || '',
        keyHighlights: keyHighlights || [],
        city,
        locality,
        subLocality,
        pinCode,
        fullAddress,
        landmark,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        balconies: balconies ? parseInt(balconies, 10) : null,
        carpetArea: carpetArea ? parseFloat(carpetArea) : null,
        builtUpArea: builtUpArea ? parseFloat(builtUpArea) : null,
        superBuiltUpArea: superBuiltUpArea ? parseFloat(superBuiltUpArea) : null,
        plotArea: plotArea ? parseFloat(plotArea) : null,
        askingPrice: parseFloat(askingPrice),
        pricePerSqft: pricePerSqft ? parseFloat(pricePerSqft) : null,
        maintenanceCharges: maintenanceCharges ? parseFloat(maintenanceCharges) : null,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        priceNegotiable: !!priceNegotiable,
        furnishing: furnishing ? (furnishing.toUpperCase() as Furnishing) : null,
        facing,
        floorNumber: floorNumber ? parseInt(floorNumber, 10) : null,
        totalFloors: totalFloors ? parseInt(totalFloors, 10) : null,
        possession: possession ? (possession.toUpperCase() as Possession) : null,
        possessionDate,
        ageOfProperty,
        ownership: ownership ? (ownership.toUpperCase() === 'POWER_OF_ATTORNEY' ? 'POA' : ownership.toUpperCase() as Ownership) : null,
        parking: parking ? (parking.toUpperCase() as Parking) : null,
        parkingCount: parkingCount ? parseInt(parkingCount, 10) : null,
        waterSupply,
        powerBackup,
        reraNumber,
        status: ListingStatus.PENDING_REVIEW, // goes to admin review queue
        
        // Connect amenities if provided
        amenities: amenities && amenities.length > 0 ? {
          create: amenities.map((amenityId: string) => ({
            amenity: { connect: { id: amenityId } }
          }))
        } : undefined
      },
    });

    // Create system notification for listing submit success
    await prisma.notification.create({
      data: {
        userId: userId,
        title: 'Listing Submitted Successfully',
        message: `Your property listing "${title}" has been submitted for review. An admin will verify it shortly.`,
        link: `/dashboard/listings/${newListing.id}`,
      }
    });

    // Log property creation
    await logUserActivity({
      userId,
      action: 'CREATE_LISTING',
      entityId: newListing.id,
      request,
      metadata: {
        title,
        propertyType,
        listingFor,
        city,
      },
    });

    return NextResponse.json({
      message: 'Listing created successfully and sent for review',
      listing: newListing,
    });
  } catch (error: any) {
    console.error('[listings POST] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
