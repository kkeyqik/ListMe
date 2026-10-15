import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone } from '@/lib/validation';
import { verifyFirebasePhoneToken } from '@/lib/firebase/verify-id-token';
import { isMockAuthEnabled } from '@/lib/mock-auth';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

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

    const { idToken, phone } = await request.json();

    // The verified number comes from Firebase, never from the request body.
    let formattedPhone = await verifyFirebasePhoneToken(idToken);

    if (!formattedPhone && isMockAuthEnabled()) {
      const result = typeof phone === 'string' ? validatePhone(phone) : null;
      formattedPhone = result?.valid ? result.normalized : null;
    }

    if (!formattedPhone) {
      return NextResponse.json({ message: 'Phone verification failed. Please request a new OTP.' }, { status: 401 });
    }

    // Check if phone is already owned by another user
    const existingOwner = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
      select: { id: true, phoneVerified: true },
    });

    if (existingOwner && existingOwner.id !== userId) {
      if (existingOwner.phoneVerified) {
        return NextResponse.json(
          { message: 'This phone number is already registered to another account' },
          { status: 400 }
        );
      }
      // Another account only typed this number in; the verified owner takes it.
      await prisma.profile.update({
        where: { id: existingOwner.id },
        data: { phone: null },
      });
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
