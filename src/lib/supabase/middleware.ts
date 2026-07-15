import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Refresh auth token or resolve mock user
  let user = null;
  const isPlaceholder = 
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === '';

  if (isPlaceholder) {
    const mockUserIdCookie = request.cookies.get('sb-mock-user-id')?.value;
    if (mockUserIdCookie) {
      user = {
        id: mockUserIdCookie,
        email: mockUserIdCookie === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6' ? 'admin@test.com' : 'user@test.com',
      } as any;
    }
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.warn('Supabase middleware getUser error:', err);
    }
  }

  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/admin');

  // Redirect to login if user is not authenticated and trying to access dashboard/admin
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if logged-in user tries to access login or signup pages
  const isAuthPath = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/signup');
    
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
