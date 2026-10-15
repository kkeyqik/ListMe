-- Run AFTER the server-signed upload change (POST /api/listings/[id]/upload-url)
-- is deployed to production. Uploads then go through signed URLs that the
-- server issues only to the listing owner or an admin, so logged-out uploads
-- are no longer needed.
drop policy if exists "anonymous upload into an existing listing (temporary)" on storage.objects;
drop function if exists public.storage_listing_exists(text);

-- Check: no policy should list the anon role any more.
select policyname, cmd, roles from pg_policies where schemaname = 'storage' order by policyname;
