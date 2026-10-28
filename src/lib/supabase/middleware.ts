import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { hasAdminAccess, isAdminRole, requiredAccessForAdminPath } from '@/lib/admin-permissions';
import { MFA_COOKIE_NAME, verifyMfaCookieToken } from '@/lib/mfa-cookie';

const ADMIN_VERIFY_PATH = '/admin-verify';

/**
 * Reads the current role, status and module permissions from the database
 * for /dashboard and /admin page requests, so access follows Role Manager changes
 * immediately and works for logins that carry no role in a cookie or in
 * app_metadata (e.g. email + password). Returns undefined if the lookup
 * fails, in which case the caller falls back to the cookie role.
 */
async function loadAdminProfile(userId: string) {
  try {
    const { prisma } = await import('@/lib/prisma');
    return await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, status: true, roleMetadata: true },
    });
  } catch (err) {
    console.warn('[Middleware] Admin role lookup failed, falling back to session role:', err);
    return undefined;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Resolve active user session — check Supabase first
  let user: { id: string; app_metadata?: Record<string, unknown> } | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.warn('[Middleware] Supabase getUser error:', err);
  }

  // 2. Check signed session cookie (set by firebase-login, phone-password, and OAuth callback)
  let sessionRole: string | undefined;
  const sessionCookie = request.cookies.get('listme-session')?.value;
  if (sessionCookie) {
    const sessionData = verifySessionToken(sessionCookie);
    if (sessionData) {
      sessionRole = sessionData.role;
      if (!user) {
        user = {
          id: sessionData.userId,
          app_metadata: { role: sessionData.role },
        };
      }
    }
  }

  // 3. Dev-only: Check mock user ID cookie (ONLY in development with explicit opt-in)
  if (!user && isMockAuthEnabled()) {
    const mockUserIdCookie = request.cookies.get('sb-mock-user-id')?.value;
    if (mockUserIdCookie) {
      const mockAdminId = process.env.MOCK_ADMIN_ID;
      const isAdminMock = Boolean(mockAdminId && mockUserIdCookie === mockAdminId);
      user = {
        id: mockUserIdCookie,
        app_metadata: { role: isAdminMock ? 'ADMIN' : 'USER' },
      };
    }
  }

  const pathname = request.nextUrl.pathname;
  // /admin-verify (two-step verification page) sits outside /admin so the
  // admin layout does not wrap it and the MFA check below cannot loop on it.
  const isAdminVerifyPath = pathname === ADMIN_VERIFY_PATH || pathname.startsWith(`${ADMIN_VERIFY_PATH}/`);
  const isAdminPath = !isAdminVerifyPath && (pathname === '/admin' || pathname.startsWith('/admin/'));
  const isProtectedPath = pathname.startsWith('/dashboard') || isAdminPath || isAdminVerifyPath;

  // 4. Unauthenticated user accessing protected routes → redirect to login
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 5. Authenticated user checks — role from database/session metadata only, no hardcoded values
  if (user) {
    // Look the profile up once for protected pages: it decides admin access
    // below and stops suspended or banned accounts, whichever way they signed
    // in (Google, email + password, email OTP, or the signed cookie).
    const dbProfile = isProtectedPath ? await loadAdminProfile(user.id) : undefined;

    if (dbProfile && (dbProfile.status === 'SUSPENDED' || dbProfile.status === 'BANNED')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('error', 'suspended');
      const response = NextResponse.redirect(url);
      // End the session so /login does not bounce the user straight back.
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name === 'listme-session' || cookie.name === MFA_COOKIE_NAME || cookie.name.startsWith('sb-')) {
          response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
        }
      }
      return response;
    }

    // user_metadata is writable by the user themselves via the Supabase client,
    // so it must never decide access. app_metadata and the signed session are server-set.
    const userRole = (user.app_metadata?.role as string | undefined) || sessionRole || 'USER';
    const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';

    // Admin route protection: Require ADMIN or SUPER_ADMIN role, checked
    // against the database, plus the module permission for the section.
    if (isAdminPath) {
      if (dbProfile !== undefined) {
        if (!dbProfile || !isAdminRole(dbProfile.role) || dbProfile.status !== 'ACTIVE') {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          url.search = '';
          return NextResponse.redirect(url);
        }
        const access = requiredAccessForAdminPath(pathname);
        if (access && !hasAdminAccess(dbProfile, access)) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          url.search = '';
          return NextResponse.redirect(url);
        }
      } else if (!isAdminUser) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      // Two-step verification: admin pages need a valid verified cookie
      // for this exact user, otherwise go to /admin-verify first.
      if (!verifyMfaCookieToken(request.cookies.get(MFA_COOKIE_NAME)?.value, user.id)) {
        const url = request.nextUrl.clone();
        url.pathname = ADMIN_VERIFY_PATH;
        url.search = '';
        url.searchParams.set('redirect', pathname + request.nextUrl.search);
        return NextResponse.redirect(url);
      }
    }

    // The verify page is only for admins.
    if (isAdminVerifyPath) {
      const isActiveAdmin =
        dbProfile !== undefined
          ? Boolean(dbProfile && isAdminRole(dbProfile.role) && dbProfile.status === 'ACTIVE')
          : isAdminUser;
      if (!isActiveAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }

    // Redirect logged-in user away from /login & /signup
    const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/signup');
    if (isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = isAdminUser ? '/admin' : '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
