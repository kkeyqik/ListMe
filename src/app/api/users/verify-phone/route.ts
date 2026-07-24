import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone } from '@/lib/validation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Resolve user from Supabase session or signed cookie
    let userId: string | null = null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

    if (!userId) {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        if (sessionCookie) {
          const sessionData = verifySessionToken(sessionCookie);
          if (sessionData) {
            userId = sessionData.userId;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 3 phone verifications per hour per user
    const rateLimitResult = rateLimit(`verify-phone:${userId}`, 3, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 3) }
      );
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Validate and normalize phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ message: phoneValidation.error }, { status: 400 });
    }

    const formattedPhone = phoneValidation.normalized;

    // Check if phone is already owned by another user
    const existingOwner = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
      select: { id: true },
    });

    if (existingOwner && existingOwner.id !== userId) {
      return NextResponse.json(
        { message: 'This phone number is already registered to another account' },
        { status: 400 }
      );
    }

    // Update the profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: {
        phone: formattedPhone,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      message: 'Phone number verified successfully',
      profile: {
        id: updatedProfile.id,
        phone: updatedProfile.phone,
        phoneVerified: updatedProfile.phoneVerified,
      },
    });
  } catch (error: any) {
    console.error('[verify-phone] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
