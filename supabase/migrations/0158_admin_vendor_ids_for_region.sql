-- Admin workspace: vendors tied to a coast by vendor_market_operations + listing_markets.region_key,
-- or by ZIP → market_zip_prefixes when they have no ops row yet.

create or replace function public.admin_vendor_ids_for_region(p_region text)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select distinct v.id
  from public.vendors v
  where lower(trim(p_region)) in ('ca', 'ny')
    and (
      exists (
        select 1
        from public.vendor_market_operations o
        join public.listing_markets lm on lm.id = o.market_id
        where o.vendor_id = v.id
          and lm.region_key = lower(trim(p_region))
      )
      or (
        length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 3
        and exists (
          select 1
          from public.market_zip_prefixes mzp
          join public.listing_markets lm on lm.id = mzp.market_id
          where lm.region_key = lower(trim(p_region))
            and mzp.prefix = left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3)
        )
      )
    );
$$;

revoke all on function public.admin_vendor_ids_for_region(text) from public;
grant execute on function public.admin_vendor_ids_for_region(text) to service_role;

comment on function public.admin_vendor_ids_for_region(text) is
  'Service-role only: vendor UUIDs for CA or NY workspace (ops in that region or ZIP maps there).';
