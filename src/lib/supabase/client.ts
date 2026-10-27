import { createBrowserClient } from '@supabase/ssr';

// Placeholders let `next build` prerender pages (the AuthProvider creates a
// client during render) when Supabase env vars are absent, e.g. in CI.
// A deployment without real values cannot sign anyone in either way.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY
  );
