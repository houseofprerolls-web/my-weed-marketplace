-- Avoid RLS recursion on `public.profiles` by removing calls to
-- public.auth_is_profile_admin() from policies.
--
-- The recursion error was triggered while evaluating select policies on
-- public.profiles. These policies previously referenced auth_is_profile_admin()
-- which (directly or indirectly) caused recursive policy evaluation.

-- Recreate profiles_admin_select (admin reads all profile rows)
drop policy if exists profiles_admin_select on public.profiles;

create policy profiles_admin_select
  on public.profiles for select
  using (
    exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = lower('houseofprerolls@gmail.com')
    )
  );

-- Recreate profiles_vendor_select_order_customers (vendor staff can read
-- order-consumers; admins can always read)
drop policy if exists profiles_vendor_select_order_customers on public.profiles;

create policy profiles_vendor_select_order_customers
  on public.profiles for select
  using (
    exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = lower('houseofprerolls@gmail.com')
    )
    or exists (
      select 1
      from public.orders o
      where o.consumer_id = id
        and public.vendor_staff_may_manage(o.vendor_id)
    )
  );

