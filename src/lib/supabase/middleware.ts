import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  // 1. Resolve active user session
  let user: any = null;
  const isPlaceholder = 
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === '';

  if (isPlaceholder) {
    const mockUserIdCookie = request.cookies.get('sb-mock-user-id')?.value;
    if (mockUserIdCookie) {
      user = {
        id: mockUserIdCookie,
        phone: mockUserIdCookie === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6' ? '+917777777777' : '+919876543210',
        email: mockUserIdCookie === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6' ? 'admin@test.com' : 'user@test.com',
      };
    }
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.warn('[Middleware] Supabase getUser error:', err);
    }
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isAdminPath = pathname.startsWith('/admin');

  // 2. Unauthenticated user accessing protected routes
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 3. Authenticated user checks
  if (user) {
    // Check DB profile for role and account status
    try {
      const dbProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true, status: true, phone: true, email: true },
      });

      // Account Suspended / Banned lockout
      if (dbProfile && (dbProfile.status === 'SUSPENDED' || dbProfile.status === 'BANNED')) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('error', 'suspended');
        const response = NextResponse.redirect(url);
        response.cookies.delete('sb-mock-user-id');
        return response;
      }

      // Admin route protection: Require ADMIN or SUPER_ADMIN role
      if (isAdminPath) {
        const role = dbProfile?.role || (
          user.phone === '+917777777777' || user.email === 'admin@test.com' || user.id === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6'
            ? 'ADMIN'
            : 'USER'
        );

        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      }
    } catch (err) {
      console.warn('[Middleware] Profile verification check error:', err);
    }

    // Redirect logged-in user away from /login & /signup
    const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/signup');
    if (isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
