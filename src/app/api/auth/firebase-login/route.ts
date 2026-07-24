import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSecurePassword } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone, sanitizeInput } from '@/lib/validation';

const formatIndiaPhone = (phone: string) => (phone.startsWith('+') ? phone : `+91${phone}`);

export async function POST(request: NextRequest) {
  // Rate limiting: 5 attempts per 15 minutes per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`firebase-login:${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
    );
  }

  try {
    const { phone, name, email } = await request.json();

    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Validate and normalize phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ message: phoneValidation.error }, { status: 400 });
    }

    const formattedPhone = phoneValidation.normalized;
    const sanitizedName = name ? sanitizeInput(name) : null;

    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY;

    let suUserId: string | null = null;
    let existingProfile = null;

    const resolvedEmail = email || `phone_${formattedPhone.replace(/\D/g, '')}@listme.com`;

    // 1. DB-First: Try to find existing profile in Prisma database
    existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { phone: formattedPhone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingProfile) {
      suUserId = existingProfile.id;

      // Check if account is suspended or banned
      if (existingProfile.status === 'SUSPENDED' || existingProfile.status === 'BANNED') {
        return NextResponse.json(
          { message: 'Your account has been suspended. Please contact support.' },
          { status: 403 }
        );
      }
    }

    // 2. Dev-only: Mock test accounts (gated behind ENABLE_MOCK_AUTH)
    if (process.env.ENABLE_MOCK_AUTH === 'true' && isPlaceholder) {
      if (!suUserId) {
        suUserId = crypto.randomUUID();
      }

      // Ensure profile exists in DB
      if (!existingProfile) {
        existingProfile = await prisma.profile.create({
          data: {
            id: suUserId,
            name: sanitizedName || 'User',
            phone: formattedPhone,
            email: resolvedEmail,
            phoneVerified: true,
            role: 'USER',
          },
        });
      }

      // Set mock cookie for dev session
      const cookieStore = await cookies();
      cookieStore.set('sb-mock-user-id', suUserId, { path: '/' });

      // Also set signed session
      const sessionToken = createSessionToken(suUserId, existingProfile.role);
      cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      // Return only essential fields — never leak internal metadata
      return NextResponse.json({
        success: true,
        profile: {
          id: existingProfile.id,
          name: existingProfile.name,
          role: existingProfile.role,
          phone: existingProfile.phone,
          email: existingProfile.email,
          status: existingProfile.status,
        },
        userId: suUserId,
      });
    }

    // 3. PRODUCTION: Real Supabase Auth
    if (isPlaceholder) {
      // Supabase not configured and mock auth not enabled — fail loudly
      return NextResponse.json(
        { message: 'Authentication service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const securePassword = getSecurePassword(formattedPhone);
    const supabaseAdmin = createAdminClient();

    if (existingProfile) {
      suUserId = existingProfile.id;
      try {
        await supabaseAdmin.auth.admin.updateUserById(suUserId!, {
          password: securePassword,
          phone_confirm: true,
          email: existingProfile.email || resolvedEmail,
          email_confirm: true,
        });
      } catch (err) {
        console.warn('Failed to update existing user password/email in Supabase:', err);
      }
    } else {
      if (!suUserId) {
        suUserId = crypto.randomUUID();
      }

      try {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: suUserId,
          email: resolvedEmail,
          phone: formattedPhone,
          password: securePassword,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { name: sanitizedName || 'User', email: resolvedEmail },
        });

        if (createError) {
          if (createError.message?.includes('already registered') || createError.status === 422) {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const matchedUser = listData?.users.find((u) => u.phone === formattedPhone || u.email === resolvedEmail);
            if (matchedUser) {
              suUserId = matchedUser.id;
            }
          } else {
            throw createError;
          }
        } else if (createData?.user) {
          suUserId = createData.user.id;
        }
      } catch (err: any) {
        console.error('Supabase admin create user error:', err);
      }
    }

    // 4. Upsert profile into Prisma
    if (suUserId) {
      existingProfile = await prisma.profile.upsert({
        where: { id: suUserId },
        update: {
          phoneVerified: true,
        },
        create: {
          id: suUserId,
          name: sanitizedName || 'User',
          phone: formattedPhone,
          email: resolvedEmail,
          phoneVerified: true,
          role: 'USER',
        },
      });
    }

    // 5. Set SIGNED session cookie (not the mock cookie)
    const cookieStore = await cookies();
    if (existingProfile) {
      const sessionToken = createSessionToken(existingProfile.id, existingProfile.role);
      cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    }

    // 6. Log login activity
    if (existingProfile) {
      try {
        await prisma.userActivityLog.create({
          data: {
            userId: existingProfile.id,
            action: 'LOGIN',
            ipAddress: ip,
            userAgent: request.headers.get('user-agent') || 'unknown',
            metadata: { 
              method: 'phone_otp', 
              phone: formattedPhone,
              details: `Phone login: ${formattedPhone}`
            },
          },
        });
      } catch (logErr) {
        console.warn('[firebase-login] Activity log error:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: existingProfile ? {
        id: existingProfile.id,
        name: existingProfile.name,
        role: existingProfile.role,
        phone: existingProfile.phone,
        email: existingProfile.email,
        status: existingProfile.status,
      } : null,
      userId: suUserId,
    });
  } catch (error: any) {
    return NextResponse.json({ message: `Internal server error: ${error.message || String(error)}` }, { status: 500 });
  }
}
