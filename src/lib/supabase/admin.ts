import { createClient } from '@supabase/supabase-js';

/**
 * Creates a server-side Supabase client with admin privileges (using service role key).
 * MUST ONLY be called from secure server contexts (API routes, server actions).
 */
export const createAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in the environment variables');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
};
