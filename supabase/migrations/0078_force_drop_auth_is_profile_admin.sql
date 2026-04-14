-- Force-drop + recreate auth_is_profile_admin() to eliminate any lingering
-- recursive definition/state.

drop function if exists public.auth_is_profile_admin();

create function public.auth_is_profile_admin()
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

grant execute on function public.auth_is_profile_admin() to authenticated;

