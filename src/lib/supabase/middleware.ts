import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { safeRedirectPath } from '@/lib/safe-redirect';

/** Cookie set by the old custom session system; cleared wherever it is still found. */
const LEGACY_SESSION_COOKIE = 'listme-session';

/**
 * Refreshes the Supabase session cookies and keeps signed-out visitors out of
 * /dashboard and /admin.
 *
 * Only "is someone signed in" is decided here. Whether they are an admin is
 * decided by the admin layout and the admin APIs, which read the role from
 * the database.
 */
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

  let signedIn = false;

  try {
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  } catch (err) {
    console.warn('[Middleware] Supabase getUser error:', err);
  }

  // Dev-only: mock user cookie (ENABLE_MOCK_AUTH in a non-production runtime)
  if (!signedIn && isMockAuthEnabled() && request.cookies.get('sb-mock-user-id')?.value) {
    signedIn = true;
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  let response: NextResponse = supabaseResponse;

  if (!signedIn && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    response = NextResponse.redirect(url);
  } else if (signedIn && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    const target = safeRedirectPath(request.nextUrl.searchParams.get('redirect'));
    response = NextResponse.redirect(new URL(target, request.url));
  }

  if (response !== supabaseResponse) {
    // Keep any refreshed Supabase cookies on redirects too.
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  }

  if (request.cookies.get(LEGACY_SESSION_COOKIE)) {
    response.cookies.set(LEGACY_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  }

  return response;
}
