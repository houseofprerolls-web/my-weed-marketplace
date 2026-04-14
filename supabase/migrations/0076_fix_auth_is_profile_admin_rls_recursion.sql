-- Fix Postgres "infinite recursion in policy for relation profiles" by
-- making auth_is_profile_admin() bypass RLS when it checks profiles.role.
--
-- The original function queried `public.profiles` and was used inside RLS
-- policies on `public.profiles`, which can cause recursive policy evaluation.

create or replace function public.auth_is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

