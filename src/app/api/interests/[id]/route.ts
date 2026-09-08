import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { InterestStatus } from '@prisma/client';

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

    if (status) {
      const parsedStatus = status.toUpperCase() as InterestStatus;

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

        if (!Number.isFinite(closingPrice) || closingPrice <= 0) {
          return NextResponse.json(
            { message: 'A valid sold/closing price is required to mark a deal as closed' },
            { status: 400 }
          );
        }

        updateData.commissionAmount = closingPrice * 0.02;

        // Auto de-activate the listing as it is sold
        await prisma.listing.update({
          where: { id: interest.listingId },
          data: { status: 'DEACTIVATED' },
        });
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

    // Execute update
    const updatedInterest = await prisma.interest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Interest record updated successfully',
      interest: updatedInterest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
