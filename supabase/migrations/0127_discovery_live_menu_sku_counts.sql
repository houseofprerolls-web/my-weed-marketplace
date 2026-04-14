-- Count in-stock SKUs per vendor for Discover "live menu" strip (approved, live, online menu on).

create or replace function public.discovery_live_menu_sku_counts()
returns table (vendor_id uuid, sku_count bigint)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    p.vendor_id,
    count(*)::bigint as sku_count
  from public.products p
  inner join public.vendors v on v.id = p.vendor_id
  where coalesce(p.in_stock, false) = true
    and v.is_live = true
    and v.license_status = 'approved'
    and coalesce(v.online_menu_enabled, true) = true
  group by p.vendor_id;
$$;

comment on function public.discovery_live_menu_sku_counts() is
  'Discover: in-stock product rows per approved live vendor with online ordering enabled.';

revoke all on function public.discovery_live_menu_sku_counts() from public;
grant execute on function public.discovery_live_menu_sku_counts() to anon;
grant execute on function public.discovery_live_menu_sku_counts() to authenticated;
grant execute on function public.discovery_live_menu_sku_counts() to service_role;
