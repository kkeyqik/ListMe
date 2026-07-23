import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus, ListingFor, PropertyType, Furnishing, Possession, Ownership, Parking } from '@prisma/client';
import { logUserActivity } from '@/lib/activity-logger';

// 1. GET - Fetch / Search Listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
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
    
    // Sort
    const sort = searchParams.get('sort') || 'newest';

    // Build Prisma query condition block
    const where: any = {};

    const ownerOnly = searchParams.get('owner') === 'true';
    if (ownerOnly) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      where.ownerId = user.id;
      
      // Optional status filter in owner mode
      const statusFilter = searchParams.get('status');
      if (statusFilter) {
        where.status = statusFilter.toUpperCase() as ListingStatus;
      }
    } else {
      const adminOnly = searchParams.get('admin') === 'true';
      if (adminOnly) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userProfile = await prisma.profile.findUnique({
          where: { id: user.id },
        });

        if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const statusFilter = searchParams.get('status');
        if (statusFilter && statusFilter !== 'ALL') {
          where.status = statusFilter.toUpperCase() as ListingStatus;
        }
      } else {
        // By default, public search only shows ACTIVE listings
        where.status = ListingStatus.ACTIVE;
      }
    }

    // Filter by transaction type
    if (type) {
      if (type === 'sale') {
        where.listingFor = ListingFor.SALE;
      } else if (type === 'rent') {
        where.listingFor = ListingFor.RENT;
      } else if (type === 'commercial') {
        where.propertyType = {
          in: [PropertyType.OFFICE, PropertyType.SHOP, PropertyType.WAREHOUSE, PropertyType.COMMERCIAL_LAND],
        };
        const commercialTrade = searchParams.get('commercial_trade');
        if (commercialTrade === 'lease' || commercialTrade === 'rent') {
          where.listingFor = ListingFor.RENT;
        } else if (commercialTrade === 'buy' || commercialTrade === 'sale' || commercialTrade === 'invest') {
          where.listingFor = ListingFor.SALE;
        }
      }
    }

    // Filter by specific property type
    if (propertyType) {
      where.propertyType = propertyType.toUpperCase() as PropertyType;
    }

    if (city) {
      if (city.toLowerCase() === 'delhi' || city.toLowerCase() === 'delhi ncr') {
        where.city = { contains: 'Delhi', mode: 'insensitive' };
      } else {
        where.city = { equals: city, mode: 'insensitive' };
      }
    }
    if (locality) {
      where.locality = { contains: locality, mode: 'insensitive' };
    }
    if (pinCode) {
      where.pinCode = pinCode;
    }

    // Pricing filters
    if (minPrice || maxPrice) {
      where.askingPrice = {};
      if (minPrice) {
        where.askingPrice.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.askingPrice.lte = parseFloat(maxPrice);
      }
    }

    // Configuration / BHK
    if (bhk) {
      const bhkVal = parseInt(bhk, 10);
      if (bhkVal >= 5) {
        where.bedrooms = { gte: 5 };
      } else {
        where.bedrooms = bhkVal;
      }
    }

    // Furnishing status
    if (furnishing) {
      where.furnishing = furnishing.toUpperCase() as Furnishing;
    }

    // Text search query (across title, description, city, locality)
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { locality: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Log the search activity if filters are used
    const hasFilters = !!(type || propertyType || city || locality || pinCode || minPrice || maxPrice || bhk || furnishing || query);
    if (hasFilters) {
      let loggedInUser = null;
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        loggedInUser = data?.user || null;
      } catch (err) {
        // Ignore errors extracting user details for public search logging
      }

      await logUserActivity({
        userId: loggedInUser?.id,
        action: 'SEARCH',
        request,
        metadata: {
          type,
          propertyType,
          city,
          locality,
          pinCode,
          minPrice,
          maxPrice,
          bhk,
          furnishing,
          query,
        },
      });
    }

    // Sort order definition
    let orderBy: any = { created_at: 'desc' }; // default
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'price_asc') {
      orderBy = { askingPrice: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { askingPrice: 'desc' };
    } else if (sort === 'area_desc') {
      orderBy = { carpetArea: 'desc' };
    }

    // Execute queries in parallel
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            orderBy: { displayOrder: 'asc' },
            take: 1, // Only return the primary image for lists
          },
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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. POST - Create Listing (Protected Route)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify user profile, status, and phone verification
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { phoneVerified: true, status: true, phone: true },
    });

    if (!userProfile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (userProfile.status === 'SUSPENDED' || userProfile.status === 'BANNED') {
      return NextResponse.json({ message: 'Your account has been suspended or banned' }, { status: 403 });
    }

    if (!userProfile.phoneVerified && !userProfile.phone) {
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
        ownerId: user.id,
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
        ownership: ownership ? (ownership.toUpperCase() as Ownership) : null,
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
        userId: user.id,
        title: 'Listing Submitted Successfully',
        message: `Your property listing "${title}" has been submitted for review. An admin will verify it shortly.`,
        link: `/dashboard/listings/${newListing.id}`,
      }
    });

    return NextResponse.json({
      message: 'Listing created successfully and sent for review',
      listing: newListing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
