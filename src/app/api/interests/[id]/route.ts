import { NextRequest, NextResponse } from 'next/server';
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
      where: { id: user.id },
      select: { role: true },
    });

    const isAdmin = profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN');
    const isListingOwner = interest.listing.ownerId === user.id;

    if (!isAdmin && !isListingOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminNotes, soldPrice } = body;

    const updateData: any = {};

    if (status) {
      const parsedStatus = status.toUpperCase() as InterestStatus;
      updateData.status = parsedStatus;

      // Calculate 2% commission if marked as SOLD by Admin
      if (parsedStatus === InterestStatus.SOLD) {
        if (!isAdmin) {
          return NextResponse.json(
            { message: 'Only admins can mark listings as Sold and log commissions' },
            { status: 403 }
          );
        }
        const closingPrice = soldPrice ? parseFloat(String(soldPrice)) : parseFloat(interest.listing.askingPrice.toString());

        if (!Number.isFinite(closingPrice) || closingPrice <= 0) {
          return NextResponse.json(
            { message: 'A valid sold price is required to mark a deal as sold' },
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
