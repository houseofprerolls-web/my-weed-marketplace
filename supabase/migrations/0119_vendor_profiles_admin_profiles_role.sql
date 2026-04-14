-- Bolt-style `vendor_profiles` (when present) allowed admin ALL only via `user_roles`.
-- Platform admins promoted in `public.profiles.role` could not list or edit shops.
-- Add a parallel policy using auth_profiles_role_is_admin() (same idea as vendors / 0117).

do $vp$
begin
  if to_regclass('public.vendor_profiles') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'auth_profiles_role_is_admin' and p.pronargs = 0
  ) then
    raise notice '0119: auth_profiles_role_is_admin() missing — apply 0116 first.';
    return;
  end if;

  drop policy if exists vendor_profiles_admin_platform_role on public.vendor_profiles;

  create policy vendor_profiles_admin_platform_role
    on public.vendor_profiles for all
    to authenticated
    using (public.auth_profiles_role_is_admin())
    with check (public.auth_profiles_role_is_admin());
end
$vp$;
