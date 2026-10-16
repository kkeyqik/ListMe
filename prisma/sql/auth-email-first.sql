-- Email-first login (run once in the Supabase SQL editor; safe to re-run).
--
-- 1. rate_limits: shared counters for API rate limiting. Vercel runs many
--    server instances, so in-memory counters never held; this table does.
-- 2. handle_new_auth_user: creates the profiles row the moment Supabase
--    creates an auth user (email sign-up, email code, Google), so the app no
--    longer needs "self-heal" code to patch up users without a profile.

begin;

-- 1. Rate limits ------------------------------------------------------------

create table if not exists public.rate_limits (
  key        text primary key,
  count      integer     not null,
  reset_at   timestamptz not null
);

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- Server-only table: block the public REST API, like every other table.
alter table public.rate_limits enable row level security;

-- 2. Profile row for every new auth user --------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_name    text  := nullif(trim(coalesce(meta->>'name', meta->>'full_name', '')), '');
  new_email   text  := lower(new.email);
  new_phone   text  := nullif(trim(coalesce(meta->>'phone', '')), '');
  new_city    text  := nullif(trim(coalesce(meta->>'city', '')), '');
begin
  -- Email and phone are unique on profiles. An older profile may already hold
  -- them (for example a legacy row), so only claim values that are free.
  if new_email is not null and exists (select 1 from public.profiles where lower(email) = new_email) then
    new_email := null;
  end if;
  if new_phone is not null and exists (select 1 from public.profiles where phone = new_phone) then
    new_phone := null;
  end if;

  insert into public.profiles (id, name, email, phone, phone_verified, avatar_url, city, updated_at)
  values (
    new.id,
    coalesce(new_name, split_part(coalesce(new.email, ''), '@', 1), 'User'),
    new_email,
    new_phone,
    false,
    meta->>'avatar_url',
    new_city,
    now()
  )
  on conflict do nothing;

  return new;
exception when others then
  -- Never block a sign-up because of the profile row; the app creates it on
  -- first request if this failed.
  raise warning 'handle_new_auth_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;

-- Check: how many phone-only accounts exist (they keep phone login).
select count(*) as phone_only_accounts from public.profiles where email like 'phone\_%@listme.com';
