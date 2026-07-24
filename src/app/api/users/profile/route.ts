import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validateName, validatePhone, validateEmail } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 5 profile creations per hour per user
    const rateLimitResult = rateLimit(`profile-create:${user.id}`, 5, 60 * 60 * 1000);
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
    const formattedPhone = validatePhone(phone).normalized || phone;

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

    const [phoneOwner, emailOwner] = await Promise.all([
      prisma.profile.findUnique({ where: { phone: normalizedPhone }, select: { id: true } }),
      prisma.profile.findUnique({ where: { email }, select: { id: true } }),
    ]);

    if (phoneOwner && phoneOwner.id !== user.id) {
      return NextResponse.json(
        { message: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    if (emailOwner && emailOwner.id !== user.id) {
      return NextResponse.json(
        { message: 'This email address is already registered' },
        { status: 400 }
      );
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        name: sanitizedName,
        email,
        phone: normalizedPhone,
        phoneVerified: true,
        city: city || null,
      },
      create: {
        id: user.id,
        name: sanitizedName,
        email,
        phone: normalizedPhone,
        phoneVerified: true,
        city: city || null,
      },
    });

    if (!existingProfile) {
      const { sendEmail } = await import('@/lib/email');
      try {
        await sendEmail({
          to: email,
          subject: `Welcome to ${process.env.SMTP_FROM?.split('<')[0]?.trim() || 'ListMe'}!`,
          text: `Hi ${name},\n\nWelcome to ListMe! Your account has been successfully created.\n\nNow you can explore properties, list yours for free, and connect directly with verified owners with no middlemen and no brokerage fees.\n\nHappy searching,\nThe ListMe Team`,
          metadata: { type: 'WELCOME_EMAIL', trigger: 'SIGNUP_FORM' },
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email upon signup:', emailErr);
      }
    }

    return NextResponse.json({
      message: 'Profile created successfully',
      profile,
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 profile updates per hour per user
    const rateLimitResult = rateLimit(`profile-update:${user.id}`, 10, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult, 10) }
      );
    }

    const body = await request.json();
    const { name, address } = body;

    // Build update data with validation
    const updateData: any = {};
    if (name !== undefined) {
      const nameResult = validateName(name);
      if (!nameResult.valid) {
        return NextResponse.json({ message: nameResult.error }, { status: 400 });
      }
      updateData.name = nameResult.sanitized;
    }
    if (address !== undefined) updateData.address = typeof address === 'string' ? address.trim() : address;

    // Update public profiles table
    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('[profile PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
