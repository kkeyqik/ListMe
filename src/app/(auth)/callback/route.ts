import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';
import { safeRedirectPath } from '@/lib/safe-redirect';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = safeRedirectPath(searchParams.get('redirect'));

  if (!code) {
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('[OAuth Callback] Auth error:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    const user = data.user;

    // Sync with database. Match by auth user id only: matching by email could
    // bind this session to a different profile that merely claims the same
    // address.
    let profile = await prisma.profile.findUnique({ where: { id: user.id } });

    if (!profile) {
      const email = user.email ? user.email.toLowerCase() : null;
      const emailOwner = email
        ? await prisma.profile.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true },
          })
        : null;
      if (emailOwner) {
        console.warn('[OAuth Callback] Email already belongs to another profile; creating profile without email');
      }

      profile = await prisma.profile.create({
        data: {
          id: user.id,
          email: emailOwner ? null : email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatarUrl: user.user_metadata?.avatar_url || null,
          role: 'USER',
          status: 'ACTIVE',
        }
      });
    }

    if (profile.status === 'SUSPENDED' || profile.status === 'BANNED') {
      const blocked = NextResponse.redirect(new URL('/login?error=suspended', request.url));
      // Drop the Supabase session cookies that exchangeCodeForSession just set.
      for (const cookie of response.cookies.getAll()) {
        blocked.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
      }
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-') || cookie.name === SESSION_COOKIE_NAME) {
          blocked.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
        }
      }
      return blocked;
    }

    // Set signed session cookie
    const sessionToken = createSessionToken(profile.id, profile.role);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    // Log activity
    try {
      await prisma.userActivityLog.create({
        data: {
          userId: profile.id,
          action: 'LOGIN',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            method: 'google_oauth',
            email: user.email,
          },
        },
      });
    } catch (logErr) {
      console.warn('[OAuth Callback] Activity log error:', logErr);
    }

    return response;
  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
