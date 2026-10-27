import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { InterestStatus } from '@prisma/client';
import { logUserActivity } from '@/lib/activity-logger';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { isUuid } from '@/lib/ids';

// Each new interest unlocks one owner's phone number, so cap how many a single
// account can express. The daily cap is counted in the database, so it holds
// across serverless instances; the burst limit is a cheap per-instance guard.
const INTEREST_DAILY_LIMIT = 15;
const INTEREST_BURST_LIMIT = 5;
const INTEREST_BURST_WINDOW_MS = 60_000;

// Admin notes and commission are internal; owners and seekers never see them.
const PUBLIC_INTEREST_FIELDS = { adminNotes: true, commissionAmount: true } as const;

// 1. GET - Fetch user's expressed/received interests
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'expressed'; // 'expressed', 'received', or 'all'
    // Optional: only the interests on one listing (owner detail page, property page).
    const listingIdParam = searchParams.get('listingId');
    if (listingIdParam !== null && !isUuid(listingIdParam)) {
      return NextResponse.json({ interests: [] });
    }
    const listingFilter = listingIdParam ? { listingId: listingIdParam } : {};

    if (mode === 'all') {
      const userProfile = await prisma.profile.findUnique({
        where: { id: userId },
      });
      if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const allInterests = await prisma.interest.findMany({
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              askingPrice: true,
              city: true,
              locality: true,
              pinCode: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ interests: allInterests });
    } else if (mode === 'received') {
      // Fetch interests received on properties owned by the current user
      const received = await prisma.interest.findMany({
        where: {
          ...listingFilter,
          listing: {
            ownerId: userId,
          },
        },
        omit: PUBLIC_INTEREST_FIELDS,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              askingPrice: true,
              city: true,
              locality: true,
              pinCode: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              phone: true, // Show phone number to the owner since they need to connect!
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      return NextResponse.json({ interests: received });
    } else {
      // Fetch interests expressed by the current user on other listings
      const expressed = await prisma.interest.findMany({
        where: {
          ...listingFilter,
          userId: userId,
        },
        omit: PUBLIC_INTEREST_FIELDS,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              askingPrice: true,
              city: true,
              locality: true,
              pinCode: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      return NextResponse.json({ interests: expressed });
    }
  } catch (error: any) {
    console.error('[interests] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. POST - Express Interest in a Listing
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, connectionStatus = 'Call Initiated' } = body;

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ message: 'Listing ID is required' }, { status: 400 });
    }
    if (!isUuid(listingId)) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    const burst = rateLimit(`interest:${userId}`, INTEREST_BURST_LIMIT, INTEREST_BURST_WINDOW_MS);
    if (!burst.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please wait a minute and try again.' },
        { status: 429, headers: getRateLimitHeaders(burst, INTEREST_BURST_LIMIT) }
      );
    }

    // 1. Verify user profile exists and phone is verified
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { phoneVerified: true, name: true, phone: true },
    });

    if (!profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (!profile.phoneVerified) {
      return NextResponse.json(
        { message: 'Your phone number must be verified to express interest' },
        { status: 400 }
      );
    }

    // 2. Verify listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true, title: true, status: true },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'You can only express interest in active listings' },
        { status: 400 }
      );
    }

    // Owners cannot express interest in their own listings
    if (listing.ownerId === userId) {
      return NextResponse.json(
        { message: 'You cannot express interest in your own property listing' },
        { status: 400 }
      );
    }

    // 3. Check for existing interest
    const existingInterest = await prisma.interest.findFirst({
      where: {
        userId: userId,
        listingId,
      },
    });

    if (existingInterest) {
      return NextResponse.json(
        { message: 'You have already expressed interest in this property' },
        { status: 400 }
      );
    }

    // 4. Daily cap (rolling 24 hours) to stop bulk harvesting of owner contacts
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.interest.count({
      where: { userId, createdAt: { gte: dayAgo } },
    });
    if (recentCount >= INTEREST_DAILY_LIMIT) {
      await logUserActivity({
        userId,
        action: 'INTEREST_LIMIT_REACHED',
        entityId: listingId,
        request,
        metadata: { recentCount, limit: INTEREST_DAILY_LIMIT },
      });
      return NextResponse.json(
        {
          message: `You can contact up to ${INTEREST_DAILY_LIMIT} owners a day. Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    // 5. Create the expression of interest
    const newInterest = await prisma.interest.create({
      data: {
        userId: userId,
        listingId,
        status: InterestStatus.NEW,
      },
    });

    // 6. Create notification for the property owner
    await prisma.notification.create({
      data: {
        userId: listing.ownerId,
        title: 'New Interest in Your Property',
        message: `${profile.name || 'A user'} expressed interest in your property "${listing.title}". View details to connect!`,
        link: `/dashboard/interests`,
      },
    });

    // 7. Log the user activity
    await logUserActivity({
      userId: userId,
      action: 'EXPRESS_INTEREST',
      entityId: newInterest.id,
      request,
      metadata: {
        listingId,
        connectionStatus,
      },
    });

    const { adminNotes: _notes, commissionAmount: _commission, ...interest } = newInterest;
    return NextResponse.json({
      message: 'Interest expressed successfully',
      interest,
    });
  } catch (error: any) {
    console.error('[interests] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
