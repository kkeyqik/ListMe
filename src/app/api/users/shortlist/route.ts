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

    const shortlists = await prisma.shortlist.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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

    if (!listingId) {
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
