-- Fix "permission denied for table users" when any policy subquery touches public.profiles.
-- Migration 0079 inlined `select from auth.users` in profiles policies; the `authenticated`
-- role cannot read auth.users in Supabase, so RLS evaluation fails (e.g. vendor brand catalog).
-- Use SECURITY DEFINER public.auth_is_profile_admin() instead.

do $fix$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    raise notice '0101: public.auth_is_profile_admin() missing — skip profiles policy fix';
    return;
  end if;

  drop policy if exists profiles_admin_select on public.profiles;
  create policy profiles_admin_select
    on public.profiles for select
    using (public.auth_is_profile_admin());

  drop policy if exists profiles_vendor_select_order_customers on public.profiles;
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
          public.auth_is_profile_admin()
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
        using (public.auth_is_profile_admin());
    $pol$;
  end if;
end $fix$;
