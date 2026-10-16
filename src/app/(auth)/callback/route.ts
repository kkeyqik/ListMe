import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureProfile } from '@/lib/server-auth';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { logUserActivity } from '@/lib/activity-logger';

/**
 * Lands every emailed link and the Google sign-in:
 *  - `?code=`                 Google OAuth and PKCE email links
 *  - `?token_hash=&type=`     email links using the token-hash template
 * and turns them into a Supabase session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type') as EmailOtpType | null;
  const redirect = safeRedirectPath(searchParams.get('redirect'));

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const response = NextResponse.redirect(new URL(redirect, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    let user: User | null = null;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('[Auth Callback] Code exchange failed:', error.message);
      user = data.user;
    } else if (tokenHash && otpType) {
      const { data, error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
      if (error) console.error('[Auth Callback] Link verification failed:', error.message);
      user = data.user;
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url));
    }

    const profile = await ensureProfile(user);

    if (profile.status === 'SUSPENDED' || profile.status === 'BANNED') {
      await supabase.auth.signOut({ scope: 'local' });
      const blocked = NextResponse.redirect(new URL('/login?error=suspended', request.url));
      response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
      return blocked;
    }

    await logUserActivity({
      userId: profile.id,
      action: 'LOGIN',
      request,
      metadata: { method: code ? (user.app_metadata?.provider === 'google' ? 'google_oauth' : 'email_link') : `email_${otpType}` },
    }).catch(() => {});

    return response;
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
