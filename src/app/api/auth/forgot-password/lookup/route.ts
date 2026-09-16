import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone, validateEmail } from '@/lib/validation';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const visibleStart = local.slice(0, 2);
  return `${visibleStart}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const last4 = digits.slice(-4);
  const first2 = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '+91 ';
  return `${first2}••••• ••${last4}`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`forgot-lookup:${ip}`, 15, 15 * 60 * 1000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 15) }
    );
  }

  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json({ message: 'Email or phone number is required' }, { status: 400 });
    }

    const trimmed = identifier.trim();
    let profile = null;

    // Check if identifier is email
    const emailValidation = validateEmail(trimmed);
    if (emailValidation.valid) {
      profile = await prisma.profile.findFirst({
        where: { email: { equals: trimmed, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, phone: true },
      });
    } else {
      // Check as phone number
      const cleanDigits = trimmed.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length === 10) {
        profile = await prisma.profile.findFirst({
          where: {
            OR: [
              { phone: cleanDigits },
              { phone: `+91${cleanDigits}` },
              { phone: `91${cleanDigits}` },
            ],
          },
          select: { id: true, name: true, email: true, phone: true },
        });
      }
    }

    if (!profile) {
      return NextResponse.json({
        exists: false,
        message: 'No registered account found with this email or mobile number.',
      });
    }

    const hasEmail = Boolean(profile.email);
    const hasPhone = Boolean(profile.phone);

    return NextResponse.json({
      exists: true,
      name: profile.name,
      hasEmail,
      maskedEmail: profile.email ? maskEmail(profile.email) : null,
      hasPhone,
      maskedPhone: profile.phone ? maskPhone(profile.phone) : null,
      primaryChannel: hasPhone ? 'sms' : 'email',
    });
  } catch (error: any) {
    console.error('[forgot-password/lookup] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
