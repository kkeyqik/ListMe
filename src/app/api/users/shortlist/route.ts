import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only live listings: pending, rejected or deactivated ones (and their
    // moderation notes) are not public. Bounded, with just the cover image.
    const shortlists = await prisma.shortlist.findMany({
      where: { userId, listing: { status: 'ACTIVE' } },
      include: {
        listing: {
          // Same privacy as public search: no exact address or map pin
          omit: { fullAddress: true, latitude: true, longitude: true, rejectionReason: true },
          include: {
            images: { orderBy: { displayOrder: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ shortlists });
  } catch (error: any) {
    console.error('[shortlist GET] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId } = body;

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ message: 'listingId is required' }, { status: 400 });
    }

    // If it's a mock or static ID (e.g. static-1), gracefully return OK
    if (!UUID_REGEX.test(listingId)) {
      return NextResponse.json({ message: 'Static item shortlisted locally' }, { status: 200 });
    }

    // Check if already shortlisted
    const existing = await prisma.shortlist.findFirst({
      where: {
        userId,
        listingId,
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already in shortlist', shortlist: existing }, { status: 200 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    if (!listing || listing.status !== 'ACTIVE') {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    const shortlist = await prisma.shortlist.create({
      data: {
        userId,
        listingId,
      },
    });

    return NextResponse.json({ message: 'Added to shortlist', shortlist }, { status: 200 });
  } catch (error: any) {
    console.error('[shortlist POST] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ message: 'listingId is required' }, { status: 400 });
    }

    if (!UUID_REGEX.test(listingId)) {
      return NextResponse.json({ message: 'Static item removed locally' }, { status: 200 });
    }

    await prisma.shortlist.deleteMany({
      where: {
        userId,
        listingId,
      },
    });

    return NextResponse.json({ message: 'Removed from shortlist' }, { status: 200 });
  } catch (error: any) {
    console.error('[shortlist DELETE] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
