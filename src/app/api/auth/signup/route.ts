import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email } = await request.json();

    if (!name || !phone || !email) {
      return NextResponse.json(
        { message: 'Name, phone, and email are required' },
        { status: 400 }
      );
    }

    // Format phone to match Supabase storage style (+91 prefix for India)
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // 1. Check if phone is already registered
    const existingPhone = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { message: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    // 2. Check if email is already registered
    const existingEmail = await prisma.profile.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: 'This email address is already registered' },
        { status: 400 }
      );
    }

    // Success - details are unique and valid to proceed to OTP
    return NextResponse.json({ message: 'Signup details validated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
