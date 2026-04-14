-- Fix: "infinite recursion in policy for relation \"orders\""
-- Root cause: orders policies were checking admin status via
-- `exists (select 1 from public.profiles ...)`, which triggers `public.profiles`
-- RLS evaluation. Some profiles policies depend on orders/vendor access, creating
-- an orders -> profiles -> orders recursion loop.
--
-- Replace those profile subqueries with `public.auth_is_profile_admin()`, which
-- checks `auth.users.email` directly (no RLS reads on public.profiles).

do $$
begin
  if to_regclass('public.orders') is null then
    return;
  end if;

  -- Consumer can see their own orders, vendor staff can see their vendor's
  -- orders, admins can see all.
  drop policy if exists orders_consumer_select on public.orders;
  create policy orders_consumer_select
    on public.orders for select
    using (
      consumer_id = auth.uid()
      or public.vendor_staff_may_manage(orders.vendor_id)
      or public.auth_is_profile_admin()
    );

  -- Admin can select/update/cancel all orders.
  drop policy if exists orders_admin_all on public.orders;
  create policy orders_admin_all
    on public.orders for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end;
$$;

