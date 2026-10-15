-- Storage hardening for ListMe (run once in the Supabase SQL Editor).
--
-- Object paths are `properties/<listingId>/{images|documents|videos}/<file>`,
-- so (storage.foldername(name))[2] is the listing id. Ownership is checked
-- against public.listings.owner_id = auth.uid().
--
-- What this changes:
--   1. listing-documents becomes PRIVATE. Ownership papers are no longer
--      downloadable or listable by anyone; only the listing owner and admins
--      can read them. The app never displays documents, so nothing breaks.
--   2. Update/delete of any listing file is limited to that listing's owner
--      (or an admin). Before, any signed-in user could delete or overwrite
--      every other user's photos, videos and documents.
--   3. Signed-in uploads must go into a listing the uploader owns.
--   4. The anonymous upload policy is kept for now (phone-login users have no
--      Supabase browser session yet) but only into a listing that exists.
--      Remove it once uploads move to server-issued signed upload URLs.
--   5. Each bucket only accepts the file types and sizes the app allows.

begin;

-- 1. Documents bucket private
update storage.buckets set public = false where id = 'listing-documents';

-- 5. File type and size limits (mirror src/lib/upload.ts)
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
       file_size_limit = 5242880
 where id = 'listing-images';
update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'],
       file_size_limit = 10485760
 where id = 'listing-documents';
update storage.buckets
   set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'],
       file_size_limit = 52428800
 where id = 'listing-videos';

-- Helpers
create or replace function public.storage_owns_listing(object_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.listings l
     where l.id::text = (storage.foldername(object_name))[2]
       and l.owner_id = auth.uid()
  );
$$;

create or replace function public.storage_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.storage_listing_exists(object_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.listings l
     where l.id::text = (storage.foldername(object_name))[2]
  );
$$;

-- Drop the old, too-broad policies
drop policy if exists "Public Access for Listing Media" on storage.objects;
drop policy if exists "Public upload for listing media" on storage.objects;
drop policy if exists "Authenticated users can upload listing media" on storage.objects;
drop policy if exists "Authenticated users can update listing media" on storage.objects;
drop policy if exists "Authenticated users can delete listing media" on storage.objects;
drop policy if exists "Allow public read access to listing videos" on storage.objects;
drop policy if exists "Allow authenticated users to upload listing videos" on storage.objects;
drop policy if exists "Allow authenticated users to update/delete their listing videos" on storage.objects;

-- Read
create policy "listing photos and videos are public"
  on storage.objects for select to public
  using (bucket_id in ('listing-images', 'listing-videos'));

create policy "documents readable by owner or admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-documents'
         and (public.storage_owns_listing(name) or public.storage_is_admin()));

-- Upload
create policy "owners upload to their own listing"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-images', 'listing-documents', 'listing-videos')
              and (storage.foldername(name))[1] = 'properties'
              and (public.storage_owns_listing(name) or public.storage_is_admin()));

-- TEMPORARY: phone-login users upload without a Supabase session.
create policy "anonymous upload into an existing listing (temporary)"
  on storage.objects for insert to anon
  with check (bucket_id in ('listing-images', 'listing-documents')
              and (storage.foldername(name))[1] = 'properties'
              and public.storage_listing_exists(name));

-- Change / delete
create policy "owners update their listing files"
  on storage.objects for update to authenticated
  using (bucket_id in ('listing-images', 'listing-documents', 'listing-videos')
         and (public.storage_owns_listing(name) or public.storage_is_admin()));

create policy "owners delete their listing files"
  on storage.objects for delete to authenticated
  using (bucket_id in ('listing-images', 'listing-documents', 'listing-videos')
         and (public.storage_owns_listing(name) or public.storage_is_admin()));

commit;

-- Check: should show listing-documents public = false and the six new policies.
select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;
select policyname, cmd, roles from pg_policies where schemaname = 'storage' order by policyname;
