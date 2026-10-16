-- Locks every ListMe table against direct access through Supabase's public
-- REST/GraphQL API (which anyone can call with the anon key shipped to browsers).
--
-- The app never reads these tables with supabase-js; all data access goes
-- through Next.js API routes using Prisma, which connects as the table owner
-- and is not affected by RLS. Enabling RLS with no policies therefore blocks
-- the public API without changing app behaviour.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.profiles              enable row level security;
alter table public.listings              enable row level security;
alter table public.listing_images        enable row level security;
alter table public.listing_videos        enable row level security;
alter table public.listing_documents     enable row level security;
alter table public.amenities             enable row level security;
alter table public.listing_amenities     enable row level security;
alter table public.furnishing_items      enable row level security;
alter table public.interests             enable row level security;
alter table public.shortlists            enable row level security;
alter table public.saved_searches        enable row level security;
alter table public.notifications         enable row level security;
alter table public.admin_activity_log    enable row level security;
alter table public.cities                enable row level security;
alter table public.localities            enable row level security;
alter table public.system_settings       enable row level security;
alter table public.user_activity_log     enable row level security;
alter table public.email_logs            enable row level security;
alter table public.password_reset_tokens enable row level security;

-- Check: every row below should show rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
