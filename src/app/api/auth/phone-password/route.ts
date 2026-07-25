import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`phone-login:${ip}`, 5, 15 * 60 * 1000);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
    );
  }

  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ message: 'Phone and password are required' }, { status: 400 });
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ message: phoneValidation.error }, { status: 400 });
    }
    const formattedPhone = phoneValidation.normalized;

    // 1. Look up user by phone
    const profile = await prisma.profile.findFirst({
      where: { phone: formattedPhone }
    });

    if (!profile) {
      return NextResponse.json({ message: 'Invalid phone number or password' }, { status: 401 });
    }

    if (!profile.email) {
      return NextResponse.json({ 
        message: 'Your account does not have a password set up. Please login with OTP.' 
      }, { status: 400 });
    }

    // 2. Validate password via Supabase using their email
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Invalid phone number or password' }, { status: 401 });
    }

    // 3. Set our hybrid session token
    const sessionToken = createSessionToken(profile.id, profile.role);
    
    // Create response
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: profile.id,
        name: profile.name,
        role: profile.role,
      } 
    });

    // We must manually attach the cookie to the NextResponse
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions);

    // Log Activity
    try {
      await prisma.userActivityLog.create({
        data: {
          userId: profile.id,
          action: 'LOGIN',
          metadata: { method: 'phone_password', ip },
        },
      });
    } catch (logErr) {}

    return response;

  } catch (error: any) {
    console.error('Phone+Password Login API Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
