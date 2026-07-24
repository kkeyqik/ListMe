import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus, ListingFor, PropertyType, Furnishing, Possession, Ownership, Parking } from '@prisma/client';
import { logUserActivity, logAdminActivity } from '@/lib/activity-logger';

// 1. GET - Fetch Individual Listing Detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch user session to determine privacy clearance
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the listing with relations
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        videos: true,
        documents: true,
        amenities: {
          include: { amenity: true },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true, // we fetch it, but will strip it if public
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Log the property view activity
    await logUserActivity({
      userId: user?.id,
      action: 'VIEW_PROPERTY',
      entityId: id,
      request,
    });

    // Determine authorization level
    let isOwnerOrAdmin = false;
    let canViewPrivateDetails = false;

    if (user) {
      if (user.id === listing.ownerId) {
        isOwnerOrAdmin = true;
        canViewPrivateDetails = true;
      } else {
        // Query database profile to check admin status
        const requesterProfile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
          isOwnerOrAdmin = true;
          canViewPrivateDetails = true;
        } else {
          const interest = await prisma.interest.findFirst({
            where: {
              userId: user.id,
              listingId: id,
            },
            select: { id: true },
          });
          canViewPrivateDetails = !!interest;
        }
      }
    }

    // Increment view count if public viewing active listing
    if (!isOwnerOrAdmin && listing.status === ListingStatus.ACTIVE) {
      await prisma.listing.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    // Enforce privacy restrictions
    if (!canViewPrivateDetails) {
      if (listing.status !== ListingStatus.ACTIVE) {
        return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
      }

      // 1. Obfuscate exact full address
      listing.fullAddress = '[Private Address - Express Interest to Connect]';
      
      // 2. Hide owner phone number (crucial requirement)
      if (listing.owner) {
        listing.owner.email = '[Hidden - Click Interested to Contact]';
        listing.owner.phone = '[Hidden - Click Interested to Contact]';
      }
      
      // 3. Clear document list URLs (only show names or hide entirely)
      listing.documents = listing.documents.map((doc) => ({
        ...doc,
        docUrl: '#', // Hide direct PDF link
      }));
    }

    return NextResponse.json({ listing, isOwnerOrAdmin });
  } catch (error: any) {
    console.error('[listings/id GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. PUT - Update Listing (Owner or Admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch original listing to verify ownership
    const listing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Verify if user is owner or admin
    let isAuthorized = false;
    let isAdmin = false;
    let requesterProfile = null;

    if (user.id === listing.ownerId) {
      isAuthorized = true;
      // Fetch profile to verify if owner is also admin
      requesterProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true, name: true },
      });
      if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
        isAdmin = true;
      }
    } else {
      requesterProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true, name: true },
      });
      if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
        isAuthorized = true;
        isAdmin = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
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

    // Compile update payload
    const updateData: any = {
      title,
      description,
      keyHighlights,
      subLocality,
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
    };

    if (body.rejectionReason !== undefined) {
      updateData.rejectionReason = body.rejectionReason;
    }

    // If core details change, reset status back to PENDING_REVIEW (unless updated by admin)
    if (!isAdmin) {
      const coreChanged = 
        (listingFor && listingFor.toUpperCase() !== listing.listingFor) ||
        (propertyType && propertyType.toUpperCase() !== listing.propertyType) ||
        (askingPrice && parseFloat(askingPrice) !== parseFloat(listing.askingPrice.toString())) ||
        (city && city !== listing.city) ||
        (locality && locality !== listing.locality) ||
        (pinCode && pinCode !== listing.pinCode) ||
        (fullAddress && fullAddress !== listing.fullAddress);

      if (coreChanged) {
        updateData.status = ListingStatus.PENDING_REVIEW;
      }
      
      if (listingFor) updateData.listingFor = listingFor.toUpperCase() as ListingFor;
      if (propertyType) updateData.propertyType = propertyType.toUpperCase() as PropertyType;
      if (askingPrice) updateData.askingPrice = parseFloat(askingPrice);
      if (pricePerSqft) updateData.pricePerSqft = parseFloat(pricePerSqft);
      if (maintenanceCharges) updateData.maintenanceCharges = parseFloat(maintenanceCharges);
      if (securityDeposit) updateData.securityDeposit = parseFloat(securityDeposit);
      if (city) updateData.city = city;
      if (locality) updateData.locality = locality;
      if (pinCode) updateData.pinCode = pinCode;
      if (fullAddress) updateData.fullAddress = fullAddress;
    } else {
      // Admins can update status and core values without review resets
      if (body.status) {
        const newStatus = body.status.toUpperCase() as ListingStatus;
        updateData.status = newStatus;
        if (newStatus !== listing.status) {
          const adminName = requesterProfile?.name || 'Admin';
          const reason = body.rejectionReason || 'No reason specified';
          const actionText = newStatus === ListingStatus.ACTIVE
            ? `${adminName} approved Listing ${id}`
            : `${adminName} rejected Listing ${id} with reason ${reason}`;

          await logAdminActivity({
            adminId: user.id,
            action: actionText,
            entityType: 'LISTING',
            entityId: id,
            metadata: {
              status: newStatus,
              reason: newStatus === ListingStatus.REJECTED ? reason : undefined,
            },
          });
        }
      }
      if (listingFor) updateData.listingFor = listingFor.toUpperCase() as ListingFor;
      if (propertyType) updateData.propertyType = propertyType.toUpperCase() as PropertyType;
      if (askingPrice) updateData.askingPrice = parseFloat(askingPrice);
      if (pricePerSqft) updateData.pricePerSqft = parseFloat(pricePerSqft);
      if (maintenanceCharges) updateData.maintenanceCharges = parseFloat(maintenanceCharges);
      if (securityDeposit) updateData.securityDeposit = parseFloat(securityDeposit);
      if (city) updateData.city = city;
      if (locality) updateData.locality = locality;
      if (pinCode) updateData.pinCode = pinCode;
      if (fullAddress) updateData.fullAddress = fullAddress;
    }

    // Sync amenities if provided
    if (amenities) {
      // Remove old amenities
      await prisma.listingAmenity.deleteMany({
        where: { listingId: id },
      });
      // Add new amenities
      updateData.amenities = {
        create: amenities.map((amenityId: string) => ({
          amenity: { connect: { id: amenityId } },
        })),
      };
    }

    // Execute update
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Listing updated successfully',
      listing: updatedListing,
    });
  } catch (error: any) {
    console.error('[listings/id PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 3. DELETE - Delete Listing (Owner or Admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch listing
    const listing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Verify if owner or admin
    let isAuthorized = false;

    if (user.id === listing.ownerId) {
      isAuthorized = true;
    } else {
      const requesterProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Delete listing
    await prisma.listing.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Listing deleted successfully' });
  } catch (error: any) {
    console.error('[listings/id DELETE] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
