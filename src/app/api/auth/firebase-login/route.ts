import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rate-limiter';
import { validatePhone } from '@/lib/validation';
import { verifyFirebasePhoneToken } from '@/lib/firebase/verify-id-token';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { logUserActivity } from '@/lib/activity-logger';

const LIMIT = 10;

/**
 * POST /api/auth/firebase-login  { idToken }
 *
 * Phone sign-in for accounts that already have a verified phone number
 * (people who signed up before login became email-first). New accounts are
 * created with email only.
 *
 * The phone number comes from the Firebase ID token, checked on the server,
 * never from the request body. On success the user gets a normal Supabase
 * session, the same as an email sign-in.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit(`firebase-login:${ip}`, LIMIT, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Too many sign-in attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(limit, LIMIT) }
    );
  }

  try {
    const { idToken, phone: claimedPhone } = await request.json();

    let phone = await verifyFirebasePhoneToken(idToken);
    if (!phone && isMockAuthEnabled() && typeof claimedPhone === 'string') {
      // Local development only: trust the claimed test number.
      const result = validatePhone(claimedPhone);
      if (result.valid) phone = result.normalized;
    }
    if (!phone) {
      return NextResponse.json({ message: 'Phone verification failed. Please request a new code.' }, { status: 401 });
    }

    const profile = await prisma.profile.findFirst({
      where: { phone, phoneVerified: true },
    });

    if (!profile) {
      return NextResponse.json(
        { code: 'no_account', message: 'No account uses this number. Sign up with your email instead.' },
        { status: 404 }
      );
    }

    if (profile.status === 'SUSPENDED' || profile.status === 'BANNED') {
      await logUserActivity({
        userId: profile.id,
        action: 'FAILED_LOGIN',
        request,
        metadata: { method: 'phone_otp', reason: 'Account suspended or banned', ip },
      });
      return NextResponse.json({ code: 'suspended', message: 'Your account has been suspended. Please contact support.' }, { status: 403 });
    }

    if (isMockAuthEnabled() && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const cookieStore = await cookies();
      cookieStore.set('sb-mock-user-id', profile.id, { path: '/', httpOnly: true, sameSite: 'lax' });
      return NextResponse.json({ success: true });
    }

    // Issue a Supabase session for this account: generate a one-time sign-in
    // token server-side (nothing is emailed) and redeem it straight away,
    // which sets the session cookies on this response.
    const admin = createAdminClient();
    const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(profile.id);
    if (getUserError || !authUser.user) {
      console.error('[firebase-login] No Supabase user for profile', profile.id, getUserError?.message);
      return NextResponse.json({ message: 'We could not sign you in. Please contact support.' }, { status: 500 });
    }

    let email = authUser.user.email;
    if (!email) {
      email = profile.email || `phone_${phone.replace(/\D/g, '')}@listme.com`;
      await admin.auth.admin.updateUserById(profile.id, { email, email_confirm: true });
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError || !link.properties?.hashed_token) {
      throw linkError || new Error('No sign-in token returned');
    }

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    });
    if (verifyError) throw verifyError;

    await logUserActivity({
      userId: profile.id,
      action: 'LOGIN',
      request,
      metadata: { method: 'phone_otp', ip },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[firebase-login] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
