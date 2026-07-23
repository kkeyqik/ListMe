import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

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
  let user: any = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.warn('[Middleware] Supabase getUser error:', err);
  }

  // 2. Fallback: Check signed session cookie (set by firebase-login and OAuth callback)
  if (!user) {
    const sessionCookie = request.cookies.get('listme-session')?.value;
    if (sessionCookie) {
      const sessionData = verifySessionToken(sessionCookie);
      if (sessionData) {
        user = {
          id: sessionData.userId,
          app_metadata: { role: sessionData.role },
        };
      }
    }
  }

  // 3. Dev-only: Check mock user ID cookie (ONLY in development with explicit opt-in)
  if (!user && process.env.ENABLE_MOCK_AUTH === 'true') {
    const mockUserIdCookie = request.cookies.get('sb-mock-user-id')?.value;
    if (mockUserIdCookie) {
      const mockAdminId = process.env.MOCK_ADMIN_ID;
      const isAdminMock = mockAdminId && mockUserIdCookie === mockAdminId;
      user = {
        id: isAdminMock ? mockAdminId : mockUserIdCookie,
        phone: isAdminMock ? '+917777777777' : '+919876543210',
        email: isAdminMock ? 'admin@test.com' : 'user@test.com',
        app_metadata: { role: isAdminMock ? 'ADMIN' : 'USER' },
      };
    }
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isAdminPath = pathname.startsWith('/admin');

  // 4. Unauthenticated user accessing protected routes → redirect to login
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 5. Authenticated user checks — role from metadata only, no hardcoded values
  if (user) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role || 'USER';
    const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // Admin route protection: Require ADMIN or SUPER_ADMIN role
    if (isAdminPath && !isAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
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
