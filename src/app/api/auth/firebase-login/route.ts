import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSecurePassword } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone, sanitizeInput, maskPhoneForLog } from '@/lib/validation';
import { verifyFirebasePhoneToken } from '@/lib/firebase/verify-id-token';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { createClient } from '@/lib/supabase/server';
import { logUserActivity } from '@/lib/activity-logger';

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
    const { idToken, phone: claimedPhone, name } = await request.json();

    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY;

    // The phone number must come from a source the server can verify, never from
    // the request body: a Firebase ID token issued after SMS OTP, or an existing
    // Supabase session whose phone Supabase itself confirmed.
    let formattedPhone: string | null = null;
    let verifiedEmail: string | null = null;

    if (idToken) {
      formattedPhone = await verifyFirebasePhoneToken(idToken);
      if (!formattedPhone) {
        return NextResponse.json({ message: 'Phone verification failed. Please request a new OTP.' }, { status: 401 });
      }
    } else if (!isPlaceholder) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.phone && user.phone_confirmed_at) {
        const result = validatePhone(user.phone);
        if (result.valid) formattedPhone = result.normalized;
        verifiedEmail = user.email_confirmed_at ? user.email ?? null : null;
      }
    }

    if (!formattedPhone && isMockAuthEnabled() && isPlaceholder && typeof claimedPhone === 'string') {
      // Local development only: trust the claimed test number.
      const result = validatePhone(claimedPhone);
      if (result.valid) formattedPhone = result.normalized;
    }

    if (!formattedPhone) {
      return NextResponse.json({ message: 'Phone verification is required' }, { status: 401 });
    }

    const sanitizedName = typeof name === 'string' && name.trim() ? sanitizeInput(name) : null;

    let suUserId: string | null = null;
    let existingProfile = null;

    const resolvedEmail = verifiedEmail || `phone_${formattedPhone.replace(/\D/g, '')}@listme.com`;

    // 1. DB-First: Try to find existing profile in Prisma database
    existingProfile = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
    });

    // A profile that merely typed this number in (never verified it) must not
    // capture the real owner's login. Release the number and treat the
    // verified caller as a new user.
    if (existingProfile && !existingProfile.phoneVerified) {
      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: { phone: null },
      });
      existingProfile = null;
    }

    if (existingProfile) {
      suUserId = existingProfile.id;

      // Check if account is suspended or banned
      if (existingProfile.status === 'SUSPENDED' || existingProfile.status === 'BANNED') {
        await logUserActivity({
          userId: existingProfile.id,
          action: 'FAILED_LOGIN',
          request,
          metadata: { method: 'phone_otp', reason: 'Account suspended or banned', phone: maskPhoneForLog(formattedPhone), ip },
        });
        return NextResponse.json(
          { message: 'Your account has been suspended. Please contact support.' },
          { status: 403 }
        );
      }
    }

    // 2. Dev-only: Mock test accounts (gated behind ENABLE_MOCK_AUTH)
    if (isMockAuthEnabled() && isPlaceholder) {
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
        // Do NOT overwrite existing user passwords on OTP login. Proving a phone
        // number says nothing about the email on the profile, so the email is
        // neither changed nor marked as confirmed here.
        await supabaseAdmin.auth.admin.updateUserById(suUserId!, {
          phone_confirm: true,
        });
      } catch (err) {
        console.warn('Failed to update existing user in Supabase:', err);
      }
    } else {
      if (!suUserId) {
        suUserId = crypto.randomUUID();
      }

      // A profile must always belong to a real Supabase Auth user, otherwise the
      // account can never use a password, reset it, or be cleaned up. Only mint
      // a session once the auth user is known to exist.
      let authUserReady = false;
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
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const phoneDigits = formattedPhone.replace(/\D/g, '');
            const matchedUser = listData?.users.find((u) => (u.phone || '').replace(/\D/g, '') === phoneDigits);
            if (matchedUser) {
              suUserId = matchedUser.id;
              authUserReady = true;
            }
          } else {
            throw createError;
          }
        } else if (createData?.user) {
          suUserId = createData.user.id;
          authUserReady = true;
        }
      } catch (err: any) {
        console.error('Supabase admin create user error:', err);
      }

      if (!authUserReady) {
        return NextResponse.json(
          { message: 'We could not set up your account right now. Please try again or contact support.' },
          { status: 503 }
        );
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
        await logUserActivity({
          userId: existingProfile.id,
          action: 'LOGIN',
          request,
          metadata: {
            method: 'phone_otp',
            phone: maskPhoneForLog(formattedPhone),
            ip
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
    console.error('[firebase-login] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
