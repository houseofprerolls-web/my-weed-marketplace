-- Fix RLS recursion by removing any dependency on public.profiles inside
-- auth_is_profile_admin().
--
-- The original auth_is_profile_admin() queried public.profiles, and when that
-- function is referenced by RLS policies on public.profiles Postgres can throw:
-- "infinite recursion in policy for relation \"profiles\"".
--
-- Admin role in this app is derived from auth.users.email (see
-- sync_profile_role_from_auth_email()), so we can safely check auth.users.

create or replace function public.auth_is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = lower('houseofprerolls@gmail.com')
  );
$$;

