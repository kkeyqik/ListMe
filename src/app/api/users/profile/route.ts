import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validateName, validatePhone, validateEmail, isPlaceholderEmail } from '@/lib/validation';
import { toPublicProfile } from '@/lib/admin-mfa';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 5 profile creations per hour per user
    const rateLimitResult = rateLimit(`profile-create:${userId}`, 5, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
      );
    }

    const { name, email, phone, city } = await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { message: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }
    // Validate inputs
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      return NextResponse.json({ message: nameResult.error }, { status: 400 });
    }

    const phoneResult = validatePhone(phone);
    if (!phoneResult.valid) {
      return NextResponse.json({ message: phoneResult.error }, { status: 400 });
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return NextResponse.json({ message: emailResult.error }, { status: 400 });
    }

    const sanitizedName = nameResult.sanitized;
    const normalizedPhone = phoneResult.normalized;

    // The email comes from the signed-in auth identity, never from the request
    // body alone, so nobody can claim (and lock out) someone else's address.
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authEmail = authUser?.id === userId && authUser.email ? authUser.email.toLowerCase() : null;
    if (authEmail && authEmail !== String(email).trim().toLowerCase()) {
      return NextResponse.json(
        { message: 'This email does not match the account you are signed in with' },
        { status: 400 }
      );
    }
    const profileEmail = authEmail;

    const [phoneOwner, emailOwner] = await Promise.all([
      prisma.profile.findUnique({ where: { phone: normalizedPhone }, select: { id: true } }),
      profileEmail
        ? prisma.profile.findFirst({ where: { email: { equals: profileEmail, mode: 'insensitive' } }, select: { id: true } })
        : null,
    ]);

    if (phoneOwner && phoneOwner.id !== userId) {
      return NextResponse.json(
        { message: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    if (emailOwner && emailOwner.id !== userId) {
      return NextResponse.json(
        { message: 'This email address is already registered' },
        { status: 400 }
      );
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });

    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {
        name: sanitizedName,
        // An existing email is changed only through the auth provider, never here
        ...(existingProfile?.email || !profileEmail ? {} : { email: profileEmail }),
        ...(existingProfile?.phone === normalizedPhone ? {} : { phone: normalizedPhone, phoneVerified: false }),
        city: city || null,
      },
      create: {
        id: userId,
        name: sanitizedName,
        email: profileEmail,
        phone: normalizedPhone,
        phoneVerified: false,
        city: city || null,
      },
    });

    if (!existingProfile && profileEmail && !isPlaceholderEmail(profileEmail)) {
      const { sendEmail } = await import('@/lib/email');
      try {
        await sendEmail({
          to: profileEmail,
          subject: `Welcome to ${process.env.SMTP_FROM?.split('<')[0]?.trim() || 'ListMe'}!`,
          text: `Hi ${sanitizedName},\n\nWelcome to ListMe! Your account has been successfully created.\n\nNow you can explore properties, list yours for free, and connect directly with verified owners with no middlemen and no brokerage fees.\n\nHappy searching,\nThe ListMe Team`,
          metadata: { type: 'WELCOME_EMAIL', trigger: 'SIGNUP_FORM' },
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email upon signup:', emailErr);
      }
    }

    return NextResponse.json({
      message: 'Profile created successfully',
      profile: toPublicProfile(profile),
    });
  } catch (error: any) {
    console.error('[profile POST] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 profile updates per hour per user
    const rateLimitResult = rateLimit(`profile-update:${userId}`, 10, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 10) }
      );
    }

    const body = await request.json();
    // phoneVerified is deliberately ignored: only /api/users/verify-phone and
    // admins may mark a number as verified.
    const { name, address, phone } = body;

    const currentProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    // Build update data with validation
    const updateData: any = {};
    if (name !== undefined) {
      const nameResult = validateName(name);
      if (!nameResult.valid) {
        return NextResponse.json({ message: nameResult.error }, { status: 400 });
      }
      updateData.name = nameResult.sanitized;
    }
    if (address !== undefined) updateData.address = typeof address === 'string' ? address.trim().slice(0, 500) : null;
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneResult = validatePhone(phone);
      if (!phoneResult.valid) {
        return NextResponse.json({ message: phoneResult.error }, { status: 400 });
      }
      const existingPhone = await prisma.profile.findUnique({
        where: { phone: phoneResult.normalized },
        select: { id: true },
      });
      if (existingPhone && existingPhone.id !== userId) {
        return NextResponse.json(
          { message: 'This phone number is already registered' },
          { status: 400 }
        );
      }
      if (phoneResult.normalized !== currentProfile?.phone) {
        updateData.phone = phoneResult.normalized;
        updateData.phoneVerified = false;
      }
    }

    // Update public profiles table
    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: toPublicProfile(updatedProfile),
    });
  } catch (error: any) {
    console.error('[profile PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: toPublicProfile(profile) });
  } catch (error: any) {
    console.error('[profile GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

