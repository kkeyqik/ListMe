import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { InterestStatus } from '@prisma/client';
import { logUserActivity } from '@/lib/activity-logger';

// 1. GET - Fetch user's expressed/received interests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'expressed'; // 'expressed', 'received', or 'all'

    if (mode === 'all') {
      const userProfile = await prisma.profile.findUnique({
        where: { id: user.id },
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
          listing: {
            ownerId: user.id,
          },
        },
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
          userId: user.id,
        },
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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 2. POST - Express Interest in a Listing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, connectionStatus = 'Call Initiated' } = body;

    if (!listingId) {
      return NextResponse.json({ message: 'Listing ID is required' }, { status: 400 });
    }

    // 1. Verify user profile exists and phone is verified
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
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
    if (listing.ownerId === user.id) {
      return NextResponse.json(
        { message: 'You cannot express interest in your own property listing' },
        { status: 400 }
      );
    }

    // 3. Check for existing interest
    const existingInterest = await prisma.interest.findFirst({
      where: {
        userId: user.id,
        listingId,
      },
    });

    if (existingInterest) {
      return NextResponse.json(
        { message: 'You have already expressed interest in this property' },
        { status: 400 }
      );
    }

    // 4. Create the expression of interest
    const newInterest = await prisma.interest.create({
      data: {
        userId: user.id,
        listingId,
        status: InterestStatus.NEW,
      },
    });

    // 5. Create notification for the property owner
    await prisma.notification.create({
      data: {
        userId: listing.ownerId,
        title: 'New Interest in Your Property',
        message: `${profile.name || 'A user'} expressed interest in your property "${listing.title}". View details to connect!`,
        link: `/dashboard/interests`,
      },
    });

    // 6. Log the user activity
    await logUserActivity({
      userId: user.id,
      action: 'EXPRESS_INTEREST',
      entityId: newInterest.id,
      request,
      metadata: {
        listingId,
        connectionStatus,
      },
    });

    return NextResponse.json({
      message: 'Interest expressed successfully',
      interest: newInterest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
