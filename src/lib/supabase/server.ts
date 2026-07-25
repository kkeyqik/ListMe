import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  // Dev-only: Mock auth fallback (gated behind explicit opt-in flag)
  if (process.env.ENABLE_MOCK_AUTH === 'true') {
    let mockUserId: string | null = null;

    try {
      const cookieStore = await cookies();
      mockUserId = cookieStore.get('sb-mock-user-id')?.value || null;
    } catch {
      // ignore: cookies() might throw outside request context
    }

    if (mockUserId) {
      const mockAdminId = process.env.MOCK_ADMIN_ID;
      const isAdmin = mockAdminId ? mockUserId === mockAdminId : false;
      const finalId = isAdmin ? mockAdminId! : mockUserId;

      return {
        auth: {
          getUser: async () => {
            return {
              data: {
                user: {
                  id: finalId,
                  phone: isAdmin ? '+917777777777' : '+919876543210',
                  email: isAdmin ? 'admin@test.com' : 'user@test.com',
                  user_metadata: {
                    name: isAdmin ? 'Kanha' : 'Standard User',
                    full_name: isAdmin ? 'Kanha' : 'Standard User',
                    role: isAdmin ? 'ADMIN' : 'USER',
                  },
                  app_metadata: {
                    role: isAdmin ? 'ADMIN' : 'USER',
                  },
                }
              },
              error: null
            };
          }
        }
      } as unknown as SupabaseClient;
    }
  }

  // Real Supabase client
  const cookieStore = await cookies();

  const client = createServerClient(
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
          }
        },
      },
    }
  );
  // Patch getUser to fallback to our custom session cookie
  // This ensures all backend routes implicitly support Firebase logins
  const originalGetUser = client.auth.getUser.bind(client.auth);
  // @ts-ignore
  client.auth.getUser = async (jwt?: string) => {
    const { data, error } = await originalGetUser(jwt);
    if (data.user) {
      return { data, error };
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { verifySessionToken, SESSION_COOKIE_NAME } = await import('@/lib/session');
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (sessionCookie?.value) {
        const session = verifySessionToken(sessionCookie.value);
        if (session) {
          return {
            data: {
              user: { id: session.userId, role: session.role } as any
            },
            error: null
          };
        }
      }
    } catch (e) {
      // ignore import/cookie errors
    }

    return { data, error };
  };

  return client;}
