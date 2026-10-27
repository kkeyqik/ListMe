import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { Prisma, ListingStatus, InterestStatus, ListingFor, PropertyType, Furnishing, Possession, Ownership, Parking } from '@prisma/client';
import { logUserActivity, logAdminActivity } from '@/lib/activity-logger';
import { isUuid, isSyntheticEmail } from '@/lib/ids';
import { sendEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { LISTING_IMAGES_BUCKET, LISTING_DOCUMENTS_BUCKET, LISTING_VIDEOS_BUCKET } from '@/lib/upload-rules';

// Statuses an owner may move their own listing to, keyed by the current status.
// Everything else (approve, reject, expire) is an admin decision.
const OWNER_STATUS_TRANSITIONS: Partial<Record<ListingStatus, ListingStatus[]>> = {
  [ListingStatus.ACTIVE]: [ListingStatus.DEACTIVATED],
  [ListingStatus.PENDING_REVIEW]: [ListingStatus.DEACTIVATED],
  [ListingStatus.REJECTED]: [ListingStatus.PENDING_REVIEW],
  [ListingStatus.DEACTIVATED]: [ListingStatus.PENDING_REVIEW],
  [ListingStatus.EXPIRED]: [ListingStatus.PENDING_REVIEW],
};

/** Tell the owner about a moderation decision (in-app, plus email when we have a real address). */
async function notifyOwnerOfModeration(
  listing: { id: string; title: string; ownerId: string },
  newStatus: ListingStatus,
  reason: string | null
) {
  let title: string;
  let message: string;
  if (newStatus === ListingStatus.ACTIVE) {
    title = 'Your listing is live';
    message = `"${listing.title}" was approved and is now visible to seekers.`;
  } else if (newStatus === ListingStatus.REJECTED) {
    title = 'Your listing needs changes';
    message = `"${listing.title}" was not approved.${reason ? ` Reason: ${reason}.` : ''} Edit the listing to fix it, then resubmit it for review.`;
  } else if (newStatus === ListingStatus.DEACTIVATED) {
    title = 'Your listing was deactivated';
    message = `"${listing.title}" is no longer visible to seekers.${reason ? ` Reason: ${reason}.` : ''}`;
  } else {
    return;
  }

  try {
    await prisma.notification.create({
      data: {
        userId: listing.ownerId,
        title,
        message,
        link: `/dashboard/listings/${listing.id}`,
      },
    });
  } catch (err) {
    console.error('[listings/id] owner notification failed:', err);
  }

  if (newStatus === ListingStatus.DEACTIVATED) return;
  try {
    const owner = await prisma.profile.findUnique({
      where: { id: listing.ownerId },
      select: { email: true, name: true },
    });
    if (owner?.email && !isSyntheticEmail(owner.email)) {
      await sendEmail({
        to: owner.email,
        subject: `ListMe: ${title}`,
        text: `Hi ${owner.name || 'there'},\n\n${message}\n\nManage your listing from your ListMe dashboard (My Properties).\n\n- Team ListMe`,
        metadata: { type: 'LISTING_MODERATION', listingId: listing.id, status: newStatus },
      });
    }
  } catch (err) {
    console.error('[listings/id] owner moderation email failed:', err);
  }
}

/** Best-effort removal of a hard-deleted listing's files from Storage. */
async function removeListingFiles(listingId: string) {
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[listings/id DELETE] storage cleanup skipped:', err);
    return;
  }
  const folders: Array<[string, string]> = [
    [LISTING_IMAGES_BUCKET, 'images'],
    [LISTING_DOCUMENTS_BUCKET, 'documents'],
    [LISTING_VIDEOS_BUCKET, 'videos'],
  ];
  for (const [bucket, kind] of folders) {
    const prefix = `properties/${listingId}/${kind}`;
    try {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) throw error;
      const paths = (data || []).filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
        if (removeError) throw removeError;
      }
    } catch (err) {
      console.error(`[listings/id DELETE] storage cleanup failed for ${bucket}/${prefix}:`, err);
    }
  }
}

// 1. GET - Fetch Individual Listing Detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

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

    // Determine authorization level.
    // - Owner and admins see everything.
    // - A seeker with an open (not CLOSED) interest in a live listing may see the
    //   owner's phone so they can call directly. That is the point of the site.
    // - Nobody but the owner and admins sees the exact address, the map pin or
    //   the ownership documents: the listing form promises the address is
    //   "Visible only to Admin". Seekers get locality / city only.
    let isOwnerOrAdmin = false;
    let canViewOwnerContact = false;

    if (user) {
      if (userId === listing.ownerId) {
        isOwnerOrAdmin = true;
      } else {
        // Query database profile to check admin status
        const requesterProfile = await prisma.profile.findUnique({
          where: { id: userId! },
          select: { role: true },
        });
        if (requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN')) {
          isOwnerOrAdmin = true;
        } else if (listing.status === ListingStatus.ACTIVE) {
          const interest = await prisma.interest.findFirst({
            where: {
              userId: userId!,
              listingId: id,
              // A withdrawn or closed lead no longer unlocks the owner's contact.
              status: { not: InterestStatus.CLOSED },
            },
            select: { id: true },
          });
          canViewOwnerContact = !!interest;
        }
      }
    }

    if (!isOwnerOrAdmin && listing.status !== ListingStatus.ACTIVE) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Logging and view counting must not hold up the response.
    after(async () => {
      await logUserActivity({
        userId: user?.id,
        action: 'VIEW_PROPERTY',
        entityId: id,
        request,
      });
      if (!isOwnerOrAdmin && listing.status === ListingStatus.ACTIVE) {
        try {
          await prisma.listing.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
          });
        } catch (err) {
          console.error('[listings/id GET] viewCount update failed:', err);
        }
      }
    });

    if (isOwnerOrAdmin) {
      return NextResponse.json({ listing, isOwnerOrAdmin });
    }

    // Exact address and map pin stay with the owner and admins.
    listing.fullAddress = canViewOwnerContact
      ? '[Exact address is private - ask the owner when you call]'
      : '[Private Address - Express Interest to Connect]';
    listing.latitude = null;
    listing.longitude = null;

    // The owner's internal id is not needed by the public page.
    const { id: _ownerId, ...owner } = listing.owner;
    if (canViewOwnerContact) {
      // Placeholder addresses for phone sign-ups are not a real way to reach anyone.
      if (isSyntheticEmail(owner.email)) owner.email = null;
    } else {
      owner.email = '[Hidden - Click Interested to Contact]';
      owner.phone = '[Hidden - Click Interested to Contact]';
    }

    return NextResponse.json({
      listing: {
        ...listing,
        owner,
        // Ownership documents (including their file names) are for the owner and admins only.
        documents: [],
      },
      isOwnerOrAdmin,
    });
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
    if (!isUuid(id)) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
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
    if (has('keyHighlights') && Array.isArray(keyHighlights)) {
      // Drop blank entries so the public page doesn't render empty bullets.
      updateData.keyHighlights = keyHighlights.map((h: unknown) => String(h ?? '').trim()).filter(Boolean);
    }
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

    // Status changes requested in the body (owner lifecycle or admin moderation)
    const requestedStatus = has('status') ? toEnum(ListingStatus, body.status) : null;
    if (has('status') && body.status && !requestedStatus) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    let moderationChange: ListingStatus | null = null;

    if (!isAdmin) {
      // If core details change, reset status back to PENDING_REVIEW
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

      // Any owner edit of a rejected listing is a resubmission: put it back in the queue.
      if (listing.status === ListingStatus.REJECTED) {
        updateData.status = ListingStatus.PENDING_REVIEW;
      }

      // Explicit owner lifecycle actions: resubmit, deactivate.
      if (requestedStatus && requestedStatus !== listing.status) {
        const allowed = OWNER_STATUS_TRANSITIONS[listing.status] || [];
        if (!allowed.includes(requestedStatus)) {
          return NextResponse.json(
            { message: `A ${listing.status.replace('_', ' ').toLowerCase()} listing cannot be moved to ${requestedStatus.replace('_', ' ').toLowerCase()}` },
            { status: 400 }
          );
        }
        updateData.status = requestedStatus;
      }

      applyCoreFields();
    } else {
      // Admins can update status and core values without review resets
      if (requestedStatus) {
        updateData.status = requestedStatus;
        if (requestedStatus !== listing.status) {
          moderationChange = requestedStatus;
          const adminName = requesterProfile?.name || 'Admin';
          const reason = body.rejectionReason || 'No reason specified';
          let actionText: string;
          if (requestedStatus === ListingStatus.ACTIVE) {
            actionText = `${adminName} approved Listing ${id}`;
          } else if (requestedStatus === ListingStatus.REJECTED) {
            actionText = `${adminName} rejected Listing ${id} with reason ${reason}`;
          } else {
            actionText = `${adminName} changed Listing ${id} from ${listing.status} to ${requestedStatus}`;
          }

          await logAdminActivity({
            adminId: userId,
            action: actionText,
            entityType: 'LISTING',
            entityId: id,
            metadata: {
              from: listing.status,
              status: requestedStatus,
              reason: requestedStatus === ListingStatus.REJECTED ? reason : undefined,
            },
          });
        }
      }
      applyCoreFields();
    }

    // Sync amenities if provided. Replacing them inside the same update keeps it
    // atomic, so a bad amenity id can no longer wipe the listing's amenities.
    if (Array.isArray(amenities)) {
      const amenityIds = Array.from(new Set(amenities.filter(isUuid)));
      updateData.amenities = {
        deleteMany: {},
        create: amenityIds.map((amenityId) => ({
          amenity: { connect: { id: amenityId } },
        })),
      };
    }

    // Execute update
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
    });

    // Tell the owner about approve / reject / deactivate (not when admins edit their own listing).
    if (moderationChange && listing.ownerId !== userId) {
      const status = moderationChange;
      const reason = status === ListingStatus.ACTIVE ? null : (body.rejectionReason ? String(body.rejectionReason) : null);
      after(() => notifyOwnerOfModeration(
        { id, title: updatedListing.title, ownerId: listing.ownerId },
        status,
        reason
      ));
    }

    // Log user activity if the owner made the edit (admins are logged separately above)
    if (!isAdmin && isAuthorized) {
      await logUserActivity({
        userId,
        action: 'EDIT_LISTING',
        entityId: id,
        request,
      });
    }

    const sentForReview =
      updatedListing.status === ListingStatus.PENDING_REVIEW && listing.status !== ListingStatus.PENDING_REVIEW;
    return NextResponse.json({
      message: sentForReview
        ? 'Listing updated and sent for review. It will go live again once an admin approves it.'
        : 'Listing updated successfully',
      listing: updatedListing,
      sentForReview,
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
    if (!isUuid(id)) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Fetch listing
    const listing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    // Verify if owner or admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    });
    const isAdmin = !!requesterProfile && (requesterProfile.role === 'ADMIN' || requesterProfile.role === 'SUPER_ADMIN');
    const isOwner = userId === listing.ownerId;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Interests cascade-delete with the listing (schema: onDelete Cascade), and
    // they are the lead and commission records. Never let a delete erase them.
    const [interestCount, soldCount] = await Promise.all([
      prisma.interest.count({ where: { listingId: id } }),
      prisma.interest.count({ where: { listingId: id, status: InterestStatus.SOLD } }),
    ]);

    if (!isAdmin && interestCount > 0) {
      // Owners: archive instead of delete. The listing leaves search, the leads stay.
      if (listing.status !== ListingStatus.DEACTIVATED) {
        await prisma.listing.update({
          where: { id },
          data: { status: ListingStatus.DEACTIVATED },
        });
      }
      await logUserActivity({
        userId,
        action: 'ARCHIVE_LISTING',
        entityId: id,
        request,
        metadata: { reason: 'delete requested on a listing with enquiries', interestCount },
      });
      return NextResponse.json({
        message: 'This listing has enquiries, so it was deactivated (hidden from search) instead of deleted. Your enquiry history is kept.',
        archived: true,
        status: ListingStatus.DEACTIVATED,
      });
    }

    if (isAdmin && soldCount > 0) {
      return NextResponse.json(
        { message: 'This listing has a closed (SOLD) deal with a commission record and cannot be deleted. Deactivate it instead.' },
        { status: 409 }
      );
    }

    // Delete listing
    await prisma.listing.delete({
      where: { id },
    });

    // Remove its photos, videos and documents from Storage after responding.
    after(() => removeListingFiles(id));

    // Log deletion activity
    if (isAdmin && !isOwner) {
      await logAdminActivity({
        adminId: userId,
        action: `${requesterProfile?.name || 'Admin'} deleted Listing ${id}`,
        entityType: 'LISTING',
        entityId: id,
        metadata: { title: listing.title, ownerId: listing.ownerId, interestCount },
      });
    } else {
      await logUserActivity({
        userId,
        action: 'DELETE_LISTING',
        entityId: id,
        request,
      });
    }

    return NextResponse.json({ message: 'Listing deleted successfully' });
  } catch (error: any) {
    console.error('[listings/id DELETE] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
