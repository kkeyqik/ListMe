import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

export async function createClient() {
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');
  const allowMockAuth =
    isPlaceholder || (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true');
  let mockUserId: string | null = null;

  if (allowMockAuth) {
    try {
      const headersList = await headers();
      mockUserId = headersList.get('x-mock-user-id');
    } catch {
      // ignore: headers() might throw outside request context
    }
    if (!mockUserId) {
      try {
        const cookieStore = await cookies();
        mockUserId = cookieStore.get('sb-mock-user-id')?.value || null;
      } catch {
        // ignore
      }
    }
  }

  if (mockUserId) {
    return {
      auth: {
        getUser: async () => {
          return {
            data: {
              user: {
                id: mockUserId,
                email: mockUserId === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6' ? 'admin@test.com' : 'user@test.com',
              }
            },
            error: null
          };
        }
      }
    } as unknown as SupabaseClient;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
