import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  // Prevent open redirect: only allow relative paths, block protocol-relative URLs
  const redirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

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

    // Sync with database — find existing profile or create new one
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ]
      }
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: user.id,
          email: user.email || null,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatarUrl: user.user_metadata?.avatar_url || null,
          role: 'USER',
          status: 'ACTIVE',
        }
      });
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
