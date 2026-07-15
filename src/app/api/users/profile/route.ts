import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const formatIndiaPhone = (phone: string) => (phone.startsWith('+') ? phone : `+91${phone}`);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone, city } = await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json(
        { message: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatIndiaPhone(phone);

    const [phoneOwner, emailOwner] = await Promise.all([
      prisma.profile.findUnique({ where: { phone: formattedPhone }, select: { id: true } }),
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
        name,
        email,
        phone: formattedPhone,
        phoneVerified: true,
        city: city || null,
      },
      create: {
        id: user.id,
        name,
        email,
        phone: formattedPhone,
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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
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

    const body = await request.json();
    const { name, address } = body;

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;

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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
