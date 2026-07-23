import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone, validateEmail, validateName } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // Rate limiting: 3 attempts per hour per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 3) }
    );
  }

  try {
    const { name, phone, email } = await request.json();

    // Validate required fields
    if (!name || !phone || !email) {
      return NextResponse.json(
        { message: 'Name, phone, and email are required' },
        { status: 400 }
      );
    }

    // Validate name
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      return NextResponse.json({ message: nameResult.error }, { status: 400 });
    }

    // Validate phone
    const phoneResult = validatePhone(phone);
    if (!phoneResult.valid) {
      return NextResponse.json({ message: phoneResult.error }, { status: 400 });
    }

    // Validate email
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return NextResponse.json({ message: emailResult.error }, { status: 400 });
    }

    const formattedPhone = phoneResult.normalized;

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
