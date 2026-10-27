# Round 3: proposed schema and SQL changes (NOT applied)

These changes came out of the round-3 audit fixes. None of them has been run.
The local `.env` points at production, so apply them only through a reviewed
migration against a staging copy first. Check for existing duplicates before
adding any unique constraint (queries included).

## 1. Unique lead per seeker and listing (data-13, dashboard-33, api-23)

The API now serialises interest creation per user with `pg_advisory_xact_lock`,
but the database should enforce it too.

```sql
-- Find duplicates first; keep the oldest row of each pair (resolve SOLD rows by hand).
SELECT user_id, listing_id, count(*) FROM interests GROUP BY 1, 2 HAVING count(*) > 1;
SELECT user_id, listing_id, count(*) FROM shortlists GROUP BY 1, 2 HAVING count(*) > 1;

CREATE UNIQUE INDEX CONCURRENTLY interests_user_listing_key ON interests (user_id, listing_id);
CREATE UNIQUE INDEX CONCURRENTLY shortlists_user_listing_key ON shortlists (user_id, listing_id);
```

```prisma
model Interest  { /* ... */ @@unique([userId, listingId]) }
model Shortlist { /* ... */ @@unique([userId, listingId]) }
```

## 2. Indexes for the hot query patterns (data-3, api-23)

```sql
CREATE INDEX CONCURRENTLY listings_status_created_idx ON listings (status, created_at DESC);
CREATE INDEX CONCURRENTLY listings_owner_idx          ON listings (owner_id);
CREATE INDEX CONCURRENTLY listings_city_lower_idx     ON listings (lower(city));
CREATE INDEX CONCURRENTLY listing_images_listing_idx  ON listing_images (listing_id, display_order);
CREATE INDEX CONCURRENTLY listing_documents_listing_idx ON listing_documents (listing_id);
CREATE INDEX CONCURRENTLY listing_videos_listing_idx  ON listing_videos (listing_id);
CREATE INDEX CONCURRENTLY interests_listing_idx       ON interests (listing_id, status);
CREATE INDEX CONCURRENTLY interests_user_created_idx  ON interests (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY notifications_user_idx      ON notifications (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY notifications_user_unread_idx ON notifications (user_id) WHERE is_read = false;
CREATE INDEX CONCURRENTLY user_activity_log_created_idx ON user_activity_log (created_at DESC);
CREATE INDEX CONCURRENTLY user_activity_log_action_idx  ON user_activity_log (action, created_at DESC);
CREATE INDEX CONCURRENTLY admin_activity_log_created_idx ON admin_activity_log (created_at DESC);
```

`contains` searches (`ILIKE '%term%'`) on title/description need `pg_trgm` GIN
indexes if search gets slow:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY listings_title_trgm_idx ON listings USING gin (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY listings_locality_trgm_idx ON listings USING gin (locality gin_trgm_ops);
```

## 3. Leads must survive a listing delete (data-2, api-3, gap-privacydpdp-10)

The API already refuses to hard-delete a listing that has a SOLD lead and archives
(DEACTIVATED) owner deletes that have any lead. The FK still cascades, so an admin
delete of a listing with non-SOLD leads, or a user delete, still erases leads.

```sql
ALTER TABLE interests DROP CONSTRAINT interests_listing_id_fkey,
  ADD CONSTRAINT interests_listing_id_fkey FOREIGN KEY (listing_id)
  REFERENCES listings(id) ON DELETE RESTRICT;
```

```prisma
listing Listing @relation(fields: [listingId], references: [id], onDelete: Restrict)
```

(Requires the admin user-delete route to archive instead of delete when a user
owns listings with leads; that route is outside this round's files.)

## 4. Admin audit trail must survive deleting the admin (admin-12, data-18)

```sql
ALTER TABLE admin_activity_log ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE admin_activity_log ADD COLUMN admin_name text;
ALTER TABLE admin_activity_log DROP CONSTRAINT admin_activity_log_admin_id_fkey,
  ADD CONSTRAINT admin_activity_log_admin_id_fkey FOREIGN KEY (admin_id)
  REFERENCES profiles(id) ON DELETE SET NULL;
```

```prisma
model AdminActivityLog {
  adminId   String?  @map("admin_id") @db.Uuid
  adminName String?  @map("admin_name")
  admin     Profile? @relation(fields: [adminId], references: [id], onDelete: SetNull)
}
```

## 5. Newsletter subscribers (api-13, public-22, data-30)

The API now rate-limits and de-duplicates sign-ups, but they still live in
`user_activity_log`. A real table enables double opt-in and unsubscribe.

```prisma
model NewsletterSubscriber {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email           String    @unique
  status          String    @default("PENDING") // PENDING | CONFIRMED | UNSUBSCRIBED
  token           String    @unique             // confirm / unsubscribe link token (store a hash)
  source          String?
  consentAt       DateTime? @map("consent_at")
  confirmedAt     DateTime? @map("confirmed_at")
  unsubscribedAt  DateTime? @map("unsubscribed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  @@map("newsletter_subscribers")
}
```

Backfill: `INSERT ... SELECT DISTINCT lower(metadata->>'email') FROM user_activity_log WHERE action = 'NEWSLETTER_SUBSCRIBE'`.

## 6. View counting without touching updated_at (data-19)

Done in code: `recordListingView()` uses a raw `UPDATE ... SET view_count = view_count + 1`,
which leaves `updated_at` alone. Optional follow-up for accurate stats:

```prisma
model ListingView {
  listingId String   @map("listing_id") @db.Uuid
  day       DateTime @db.Date
  views     Int      @default(0)
  @@id([listingId, day])
  @@map("listing_views")
}
```

## 7. Storage policies (data-23) - edit and re-run `prisma/sql/storage-policies.sql`

Public buckets serve `/object/public/...` without any SELECT policy; the policy
below only enables anonymous *listing* of every listing's files.

```sql
DROP POLICY IF EXISTS "listing photos and videos are public" ON storage.objects;
-- Keep listing for owners/admins only, if the app needs it:
CREATE POLICY "owners and admins can list listing media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('listing-images','listing-videos')
         AND (public.storage_is_admin() OR public.storage_owns_listing(name)));

-- SECURITY DEFINER helpers are callable over PostgREST RPC: move them out of `public`.
CREATE SCHEMA IF NOT EXISTS private;
ALTER FUNCTION public.storage_is_admin() SET SCHEMA private;
ALTER FUNCTION public.storage_owns_listing(text) SET SCHEMA private;
REVOKE EXECUTE ON FUNCTION private.storage_is_admin() FROM anon, authenticated;
-- (then recreate the storage policies to reference private.*; check the exact
--  function signatures in prisma/sql/storage-policies.sql before running)
```

## 8. Normalised identities (data-8) - needs data clean-up first

```sql
SELECT lower(email), count(*) FROM profiles WHERE email IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX CONCURRENTLY profiles_email_lower_key ON profiles (lower(email));
```

## 9. Migration history (build-16, data-4, prs-21)

Baseline the live database with `prisma migrate diff --from-empty --to-schema-datamodel`
into `prisma/migrations/0_init`, mark it applied with `prisma migrate resolve --applied 0_init`
on each environment, and move the hand-run SQL in `prisma/sql/` into migrations.
