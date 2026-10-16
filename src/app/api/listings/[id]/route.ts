import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Prisma, ListingStatus, ListingFor, PropertyType, Furnishing, Possession, Ownership, Parking } from '@prisma/client';
import { logUserActivity, logAdminActivity } from '@/lib/activity-logger';

// 1. GET - Fetch Individual Listing Detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch user session to determine privacy clearance
    const userId = await getAuthenticatedUserId();
    const user = userId ? { id: userId } : null;

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
            phoneVerified: true,
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
      if (userId === listing.ownerId) {
        isOwnerOrAdmin = true;
        canViewPrivateDetails = true;
      } else {
        // Query database profile to check admin status
        const requesterProfile = await prisma.profile.findUnique({
          where: { id: userId! },
          select: { role: true },
        });
        if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
          isOwnerOrAdmin = true;
          canViewPrivateDetails = true;
        } else {
          const interest = await prisma.interest.findFirst({
            where: {
              userId: userId!,
              listingId: id,
            },
            select: { id: true },
          });
          // Interested seekers may see the address and owner contact of a live
          // listing, but never its ownership documents.
          canViewPrivateDetails = !!interest && listing.status === ListingStatus.ACTIVE;
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
      
      // 3. Hide the exact map pin
      listing.latitude = null;
      listing.longitude = null;
    }

    // Ownership documents are for the owner and admins only
    if (!isOwnerOrAdmin) {
      listing.documents = listing.documents.map((doc) => ({ ...doc, docUrl: '#' }));
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
    const userId = await getAuthenticatedUserId();
    if (!userId) {
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

    if (userId === listing.ownerId) {
      isAuthorized = true;
      // Fetch profile to verify if owner is also admin
      requesterProfile = await prisma.profile.findUnique({
        where: { id: userId! },
        select: { role: true, name: true },
      });
      if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
        isAdmin = true;
      }
    } else {
      requesterProfile = await prisma.profile.findUnique({
        where: { id: userId! },
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

    // Only touch fields the caller actually sent. Moderation calls send just
    // { status, rejectionReason }, and must not wipe the rest of the listing.
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const toFloat = (v: unknown) => (v === null || v === '' || v === undefined ? null : Number.isFinite(parseFloat(String(v))) ? parseFloat(String(v)) : null);
    const toInt = (v: unknown) => (v === null || v === '' || v === undefined ? null : Number.isFinite(parseInt(String(v), 10)) ? parseInt(String(v), 10) : null);
    const toEnum = <T extends Record<string, string>>(enumObj: T, v: unknown): T[keyof T] | null => {
      if (typeof v !== 'string' || !v) return null;
      const upper = v.toUpperCase() === 'POWER_OF_ATTORNEY' ? 'POA' : v.toUpperCase();
      return (Object.values(enumObj) as string[]).includes(upper) ? (upper as T[keyof T]) : null;
    };

    const updateData: Prisma.ListingUpdateInput = {};
    if (has('title') && title) updateData.title = String(title);
    if (has('description')) updateData.description = description ?? '';
    if (has('keyHighlights') && Array.isArray(keyHighlights)) updateData.keyHighlights = keyHighlights.map(String);
    if (has('subLocality')) updateData.subLocality = subLocality;
    if (has('landmark')) updateData.landmark = landmark;
    if (has('latitude')) updateData.latitude = toFloat(latitude);
    if (has('longitude')) updateData.longitude = toFloat(longitude);
    if (has('bedrooms')) updateData.bedrooms = toInt(bedrooms);
    if (has('bathrooms')) updateData.bathrooms = toInt(bathrooms);
    if (has('balconies')) updateData.balconies = toInt(balconies);
    if (has('carpetArea')) updateData.carpetArea = toFloat(carpetArea);
    if (has('builtUpArea')) updateData.builtUpArea = toFloat(builtUpArea);
    if (has('superBuiltUpArea')) updateData.superBuiltUpArea = toFloat(superBuiltUpArea);
    if (has('plotArea')) updateData.plotArea = toFloat(plotArea);
    if (has('priceNegotiable')) updateData.priceNegotiable = !!priceNegotiable;
    if (has('furnishing')) updateData.furnishing = toEnum(Furnishing, furnishing);
    if (has('facing')) updateData.facing = facing;
    if (has('floorNumber')) updateData.floorNumber = toInt(floorNumber);
    if (has('totalFloors')) updateData.totalFloors = toInt(totalFloors);
    if (has('possession')) updateData.possession = toEnum(Possession, possession);
    if (has('possessionDate')) updateData.possessionDate = possessionDate;
    if (has('ageOfProperty')) updateData.ageOfProperty = ageOfProperty;
    if (has('ownership')) updateData.ownership = toEnum(Ownership, ownership);
    if (has('parking')) updateData.parking = toEnum(Parking, parking);
    if (has('parkingCount')) updateData.parkingCount = toInt(parkingCount);
    if (has('waterSupply')) updateData.waterSupply = waterSupply;
    if (has('powerBackup')) updateData.powerBackup = powerBackup;
    if (has('reraNumber')) updateData.reraNumber = reraNumber;

    if (isAdmin && body.rejectionReason !== undefined) {
      updateData.rejectionReason = body.rejectionReason;
    }

    const applyCoreFields = () => {
      const listingForValue = toEnum(ListingFor, listingFor);
      const propertyTypeValue = toEnum(PropertyType, propertyType);
      if (listingForValue) updateData.listingFor = listingForValue;
      if (propertyTypeValue) updateData.propertyType = propertyTypeValue;
      const price = toFloat(askingPrice);
      if (price !== null && price > 0) updateData.askingPrice = price;
      if (has('pricePerSqft')) updateData.pricePerSqft = toFloat(pricePerSqft);
      if (has('maintenanceCharges')) updateData.maintenanceCharges = toFloat(maintenanceCharges);
      if (has('securityDeposit')) updateData.securityDeposit = toFloat(securityDeposit);
      if (city) updateData.city = city;
      if (locality) updateData.locality = locality;
      if (pinCode) updateData.pinCode = pinCode;
      if (fullAddress) updateData.fullAddress = fullAddress;
    };

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
      
      applyCoreFields();
    } else {
      // Admins can update status and core values without review resets
      const newStatus = toEnum(ListingStatus, body.status);
      if (has('status') && !newStatus) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
      if (newStatus) {
        updateData.status = newStatus;
        if (newStatus !== listing.status) {
          const adminName = requesterProfile?.name || 'Admin';
          const reason = body.rejectionReason || 'No reason specified';
          const actionText = newStatus === ListingStatus.ACTIVE
            ? `${adminName} approved Listing ${id}`
            : `${adminName} rejected Listing ${id} with reason ${reason}`;

          await logAdminActivity({
            adminId: userId,
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
      applyCoreFields();
    }

    // Sync amenities if provided
    if (Array.isArray(amenities)) {
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

    // Log user activity if the owner made the edit (admins are logged separately above)
    if (!isAdmin && isAuthorized) {
      await logUserActivity({
        userId,
        action: 'EDIT_LISTING',
        entityId: id,
        request,
      });
    }

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
    const userId = await getAuthenticatedUserId();
    if (!userId) {
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

    if (userId === listing.ownerId) {
      isAuthorized = true;
    } else {
      const requesterProfile = await prisma.profile.findUnique({
        where: { id: userId! },
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

    // Log deletion activity
    await logUserActivity({
      userId,
      action: 'DELETE_LISTING',
      entityId: id,
      request,
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
