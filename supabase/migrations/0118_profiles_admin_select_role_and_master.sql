-- Let any platform admin (profiles.role = 'admin') read all profile rows, not only the master JWT.
--
-- 0078 narrowed public.auth_is_profile_admin() to master email only; 0101 wired profiles_admin_select
-- to that alone. Admins promoted via profiles.role then failed profiles bulk SELECT — dashboard user
-- counts stayed at 0 and vendor owner emails (profiles join) stayed empty while vendors RLS could
-- still allow listing via auth_profiles_role_is_admin() from 0116/0117.

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
  on public.profiles for select
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists profiles_vendor_select_order_customers on public.profiles;

do $profiles_vendor_select_0118$
begin
  if to_regclass('public.orders') is not null
     and exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'vendor_staff_may_manage' and p.pronargs = 1
     )
  then
    execute $pol$
      create policy profiles_vendor_select_order_customers
        on public.profiles for select
        using (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or exists (
            select 1
            from public.orders o
            where o.consumer_id = id
              and public.vendor_staff_may_manage(o.vendor_id)
          )
        );
    $pol$;
  else
    execute $pol$
      create policy profiles_vendor_select_order_customers
        on public.profiles for select
        using (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
        );
    $pol$;
  end if;
end
$profiles_vendor_select_0118$;
