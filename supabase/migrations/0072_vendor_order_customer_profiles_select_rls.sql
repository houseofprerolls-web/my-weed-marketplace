-- Vendors/managers need to view customer contact info (email/name/phone)
-- for order receipts and CSV exports. Profiles RLS is "self only", so we
-- add a narrow select policy scoped to order consumers for vendors the
-- current user can manage.

drop policy if exists profiles_vendor_select_order_customers on public.profiles;

create policy profiles_vendor_select_order_customers
  on public.profiles for select
  to authenticated
  using (
    public.auth_is_profile_admin()
    or exists (
      select 1
      from public.orders o
      where o.consumer_id = id
        and public.vendor_staff_may_manage(o.vendor_id)
    )
  );

