import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { InterestStatus } from '@prisma/client';
import { isUuid } from '@/lib/ids';

// Keeps 2% of the price inside commission_amount Decimal(12,2).
const MAX_CLOSING_PRICE = 100_000_000_000; // ₹10,000 crore

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

    // Query database profile to check requester's role
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN');
    const isListingOwner = interest.listing.ownerId === userId;
    const isSeeker = interest.userId === userId;

    const body = await request.json();
    const { status, adminNotes, soldPrice } = body;

    const updateData: any = {};
    let deactivateListing = false;

    if (status) {
      const parsedStatus = String(status).toUpperCase() as InterestStatus;
      if (!(Object.values(InterestStatus) as string[]).includes(parsedStatus)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }

      // Permission check:
      // Admins and listing owners can set any status. Seekers can set CLOSED.
      if (!isAdmin && !isListingOwner && !(isSeeker && parsedStatus === InterestStatus.CLOSED)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      updateData.status = parsedStatus;

      // Handle deal closed / SOLD:
      if (parsedStatus === InterestStatus.SOLD) {
        const rawPrice = (soldPrice !== undefined && soldPrice !== null && soldPrice !== '')
          ? soldPrice
          : interest.listing.askingPrice;

        const closingPrice = parseFloat(String(rawPrice));

        // commission_amount is Decimal(12,2); a larger price would overflow it.
        if (!Number.isFinite(closingPrice) || closingPrice <= 0 || closingPrice > MAX_CLOSING_PRICE) {
          return NextResponse.json(
            { message: 'A valid sold/closing price is required to mark a deal as closed' },
            { status: 400 }
          );
        }

        updateData.commissionAmount = Math.round(closingPrice * 0.02 * 100) / 100;
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

    let interestBody: Partial<typeof updatedInterest> = updatedInterest;
    if (!isAdmin) {
      const { adminNotes: _notes, commissionAmount: _commission, ...rest } = updatedInterest;
      interestBody = rest;
    }
    return NextResponse.json({
      message: 'Interest record updated successfully',
      interest: interestBody,
    });
  } catch (error: any) {
    console.error('[interests/[id]] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
