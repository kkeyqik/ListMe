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

    const { name, email, phone } = await request.json();

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

    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        name,
        email,
        phone: formattedPhone,
        phoneVerified: true,
      },
      create: {
        id: user.id,
        name,
        email,
        phone: formattedPhone,
        phoneVerified: true,
      },
    });

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
