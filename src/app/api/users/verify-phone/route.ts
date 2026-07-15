import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Format phone to India standard if missing country code
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // Update the profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        phone: formattedPhone,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      message: 'Phone number verified successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
