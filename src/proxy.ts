import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // API routes resolve the user themselves (getAuthenticatedUserId) and can
    // refresh Supabase cookies on their own, so running the proxy for them only
    // doubled the Supabase Auth round-trips. Metadata files need no auth either.
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
