import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { InterestStatus, Prisma } from '@prisma/client';
import { isUuid } from '@/lib/ids';
import { hasAdminAccess } from '@/lib/admin-permissions';
import { logAdminActivity, logUserActivity } from '@/lib/activity-logger';

// commission_amount is Decimal(12,2).
const MAX_COMMISSION = new Prisma.Decimal('9999999999.99');
const DEFAULT_COMMISSION_PERCENT = 2;
const MAX_ADMIN_NOTES = 5000;

/** The admin-configured commission rate (System Settings), falling back to 2%. */
async function getCommissionPercent(): Promise<Prisma.Decimal> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'commissionPercentage' } });
    const value = setting?.value?.replace('%', '').trim();
    const parsed = value ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
      return new Prisma.Decimal(value!);
    }
  } catch (err) {
    console.error('[interests/[id]] could not read commissionPercentage:', err);
  }
  return new Prisma.Decimal(DEFAULT_COMMISSION_PERCENT);
}

// PUT - Update Interest Status / Admin Notes (Owner or Admin)
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
      return NextResponse.json({ message: 'Interest record not found' }, { status: 404 });
    }

    // Fetch the interest details
    const interest = await prisma.interest.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            ownerId: true,
            askingPrice: true,
            title: true,
          },
        },
      },
    });

    if (!interest) {
      return NextResponse.json({ message: 'Interest record not found' }, { status: 404 });
    }

    // Query database profile to check requester's role and module permissions
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, name: true, roleMetadata: true },
    });

    const isAdmin = hasAdminAccess(profile, 'interests');
    const isListingOwner = interest.listing.ownerId === userId;
    const isSeeker = interest.userId === userId;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const { status, adminNotes, soldPrice } = body;

    const updateData: Prisma.InterestUpdateInput = {};
    let deactivateListing = false;
    let parsedStatus: InterestStatus | null = null;

    if (status) {
      const candidate = String(status).toUpperCase();
      if (!(Object.values(InterestStatus) as string[]).includes(candidate)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
      parsedStatus = candidate as InterestStatus;

      // Permission check:
      // Admins and listing owners can set any status. Seekers can set CLOSED.
      if (!isAdmin && !isListingOwner && !(isSeeker && parsedStatus === InterestStatus.CLOSED)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      updateData.status = parsedStatus;

      // Handle deal closed / SOLD:
      if (parsedStatus === InterestStatus.SOLD) {
        // One sale per listing: a second SOLD lead would double-count the commission.
        const otherSold = await prisma.interest.count({
          where: { listingId: interest.listingId, status: InterestStatus.SOLD, id: { not: id } },
        });
        if (otherSold > 0) {
          return NextResponse.json(
            { message: 'Another lead on this listing is already marked as sold' },
            { status: 409 }
          );
        }

        const rawPrice = (soldPrice !== undefined && soldPrice !== null && soldPrice !== '')
          ? soldPrice
          : interest.listing.askingPrice;

        const priceText = String(rawPrice).trim();
        const closingPrice = Number(priceText);
        if (!Number.isFinite(closingPrice) || closingPrice <= 0) {
          return NextResponse.json(
            { message: 'A valid sold/closing price is required to mark a deal as closed' },
            { status: 400 }
          );
        }

        // Decimal math (no float rounding), at the rate configured in admin settings.
        const percent = await getCommissionPercent();
        const commission = new Prisma.Decimal(priceText).mul(percent).div(100).toDecimalPlaces(2);
        if (commission.gt(MAX_COMMISSION)) {
          return NextResponse.json(
            { message: 'A valid sold/closing price is required to mark a deal as closed' },
            { status: 400 }
          );
        }

        updateData.commissionAmount = commission;
        deactivateListing = true;
      }
    } else if (!isAdmin && !isListingOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (adminNotes !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { message: 'Only admins can add administrative notes' },
          { status: 403 }
        );
      }
      if (adminNotes !== null && (typeof adminNotes !== 'string' || adminNotes.length > MAX_ADMIN_NOTES)) {
        return NextResponse.json(
          { message: `Admin notes must be text of at most ${MAX_ADMIN_NOTES} characters` },
          { status: 400 }
        );
      }
      updateData.adminNotes = adminNotes;
    }

    // Execute update. A sold deal also takes the listing offline; do both or neither.
    const updatedInterest = deactivateListing
      ? (await prisma.$transaction([
          prisma.interest.update({ where: { id }, data: updateData }),
          prisma.listing.update({
            where: { id: interest.listingId },
            data: { status: 'DEACTIVATED' },
          }),
        ]))[0]
      : await prisma.interest.update({
          where: { id },
          data: updateData,
        });

    // Audit trail for pipeline and commission changes, and tell the owner when
    // someone else moved one of their leads.
    const statusChanged = parsedStatus !== null && parsedStatus !== interest.status;
    if (statusChanged || adminNotes !== undefined) {
      const auditMetadata = {
        listingId: interest.listingId,
        from: interest.status,
        to: updatedInterest.status,
        soldPrice: parsedStatus === InterestStatus.SOLD ? String(soldPrice ?? interest.listing.askingPrice) : undefined,
        commissionAmount: parsedStatus === InterestStatus.SOLD ? updatedInterest.commissionAmount?.toString() : undefined,
        notesChanged: adminNotes !== undefined ? true : undefined,
      };
      after(async () => {
        if (isAdmin) {
          await logAdminActivity({
            adminId: userId,
            action: statusChanged
              ? `${profile?.name || 'Admin'} changed Interest ${id} from ${interest.status} to ${updatedInterest.status}`
              : `${profile?.name || 'Admin'} updated notes on Interest ${id}`,
            entityType: 'INTEREST',
            entityId: id,
            metadata: auditMetadata,
          });
        } else {
          await logUserActivity({
            userId,
            action: 'UPDATE_INTEREST_STATUS',
            entityId: id,
            request,
            metadata: auditMetadata,
          });
        }

        if (statusChanged && !isListingOwner) {
          try {
            await prisma.notification.create({
              data: {
                userId: interest.listing.ownerId,
                title: 'Lead status updated',
                message: `A lead on "${interest.listing.title}" is now ${updatedInterest.status.replace('_', ' ').toLowerCase()}.`,
                link: '/dashboard/interests',
              },
            });
          } catch (err) {
            console.error('[interests/[id]] owner notification failed:', err);
          }
        }
      });
    }

    let interestBody: Partial<typeof updatedInterest> = updatedInterest;
    if (!isAdmin) {
      const { adminNotes: _notes, commissionAmount: _commission, ...rest } = updatedInterest;
      interestBody = rest;
    }
    return NextResponse.json({
      message: 'Interest record updated successfully',
      interest: interestBody,
    });
  } catch (error: unknown) {
    console.error('[interests/[id]] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
