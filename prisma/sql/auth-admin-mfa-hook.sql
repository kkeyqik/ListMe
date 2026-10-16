-- Admin two-factor login: puts the ListMe role into each Supabase access
-- token as the `user_role` claim, so the app's proxy can require a second
-- factor (aal2) from admins on every admin page and API call.
--
-- The claim is only used to decide WHEN to ask for the second factor. What
-- an account may do is still read from public.profiles on every request.
--
-- 1. Run this once in the Supabase SQL editor (safe to re-run).
-- 2. Supabase → Authentication → Hooks → "Customize Access Token (JWT)
--    Claims" → Postgres function public.custom_access_token_hook → Enable.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb := event->'claims';
  user_role text;
begin
  select role::text into user_role from public.profiles where id = (event->>'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(user_role, 'USER')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- The hook runs as supabase_auth_admin, which must be able to read roles
-- even though RLS is on for profiles.
grant select on table public.profiles to supabase_auth_admin;
drop policy if exists "auth admin reads roles for token hook" on public.profiles;
create policy "auth admin reads roles for token hook" on public.profiles
  as permissive for select to supabase_auth_admin using (true);
