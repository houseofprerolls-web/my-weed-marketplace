-- Let dispensary owners manage their row + catalog + orders when vendors.user_id = auth.uid(),
-- even if profiles.role is still consumer/customer (Saferock / master QA).
-- Optionally promote master email to profiles.role = vendor for UI flags.

-- ---------------------------------------------------------------------------
-- profiles: master QA account should see vendor dashboard flags
-- ---------------------------------------------------------------------------
update public.profiles p
set role = 'vendor'
from auth.users u
where p.id = u.id
  and lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
  and p.role in ('consumer', 'customer');

-- ---------------------------------------------------------------------------
-- vendors: owner can update own row without requiring profiles.role = vendor
-- ---------------------------------------------------------------------------
drop policy if exists vendors_vendor_write on public.vendors;
create policy vendors_vendor_write
  on public.vendors for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- products / deals / locations / orders / unit costs: owner = vendors.user_id match only
-- ---------------------------------------------------------------------------
do $products_vendor_rls_0046$
begin
  if to_regclass('public.products') is null then
    raise notice
      '0046: public.products does not exist — skipped products_vendor_write. Apply 0041 or 0001_init, then re-run 0046 if needed.';
    return;
  end if;

  drop policy if exists products_vendor_write on public.products;
  create policy products_vendor_write
    on public.products for all
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    );
end;
$products_vendor_rls_0046$;

do $deals_vendor_rls_0046$
begin
  if to_regclass('public.deals') is null then
    raise notice
      '0046: public.deals does not exist — skipped deals_vendor_write. Apply migration 0047_create_deals_table_if_missing.sql (or 0001_init), then re-run 0046 or refresh policies.';
    return;
  end if;

  drop policy if exists deals_vendor_write on public.deals;
  create policy deals_vendor_write
    on public.deals for all
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    );
end;
$deals_vendor_rls_0046$;

do $vendor_locations_vendor_rls_0046$
begin
  if to_regclass('public.vendor_locations') is null then
    raise notice
      '0046: public.vendor_locations does not exist — skipped vendor_locations_vendor_write. Apply 0048_create_vendor_locations_table_if_missing.sql (or 0001_init), then re-run 0046 if needed.';
    return;
  end if;

  drop policy if exists vendor_locations_vendor_write on public.vendor_locations;
  create policy vendor_locations_vendor_write
    on public.vendor_locations for all
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    );
end;
$vendor_locations_vendor_rls_0046$;

do $orders_vendor_rls_0046$
begin
  if to_regclass('public.orders') is null then
    raise notice
      '0046: public.orders does not exist — skipped orders_vendor_update. Apply 0045 or 0001_init, then re-run 0046 if needed.';
    return;
  end if;

  drop policy if exists orders_vendor_update on public.orders;
  create policy orders_vendor_update
    on public.orders for update
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    )
    with check (true);
end;
$orders_vendor_rls_0046$;

do $costs_rls$
begin
  if to_regclass('public.product_unit_costs') is null then
    return;
  end if;

  drop policy if exists product_unit_costs_vendor_all on public.product_unit_costs;
  create policy product_unit_costs_vendor_all
    on public.product_unit_costs for all
    to authenticated
    using (
      exists (
        select 1
        from public.products p
        join public.vendors v on v.id = p.vendor_id
        where p.id = product_unit_costs.product_id
          and v.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.products p
        join public.vendors v on v.id = p.vendor_id
        where p.id = product_unit_costs.product_id
          and v.user_id = auth.uid()
      )
    );
end;
$costs_rls$;
