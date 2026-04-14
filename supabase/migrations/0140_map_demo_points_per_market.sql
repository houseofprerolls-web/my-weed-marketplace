-- Demo / density: per listing_market, assign map points for up to 5 storefront + 5 delivery-only
-- vendors that have logo or banner art, are live/approved, and operate in that market.
-- Storefront: tight jitter around ZIP-prefix metro center (approximates "near address" without geocoder).
-- Delivery-only: wider bounded jitter in the same metro (city-level spread).
--
-- Map reads coords from public.vendors.location via vendors_public_coords (0032).

create or replace function public.vendors_storefront_demo_point(
  p_vendor_id uuid,
  p_zip text,
  p_address text
)
returns geography
language plpgsql
immutable
as $$
declare
  clat double precision;
  clng double precision;
  jlat double precision;
  jlng double precision;
begin
  select c.center_lat, c.center_lng into clat, clng
  from public._ca_zip_prefix_center_lat_lng(p_zip) c;

  select j.j_lat, j.j_lng into jlat, jlng
  from public._vendor_map_jitter_lat_lng(
    p_vendor_id,
    coalesce(p_zip, '') || coalesce(p_address, ''),
    clat,
    clng
  ) j;

  return st_setsrid(
    st_makepoint(
      clng + (jlng - clng) * 0.32,
      clat + (jlat - clat) * 0.32
    ),
    4326
  )::geography;
end;
$$;

create or replace function public.vendors_delivery_demo_point_wide(
  p_vendor_id uuid,
  p_zip text,
  p_city text
)
returns geography
language plpgsql
immutable
as $$
declare
  clat double precision;
  clng double precision;
  jlat double precision;
  jlng double precision;
  dlat double precision;
  dlng double precision;
begin
  select c.center_lat, c.center_lng into clat, clng
  from public._ca_zip_prefix_center_lat_lng(p_zip) c;

  select j.j_lat, j.j_lng into jlat, jlng
  from public._vendor_map_jitter_lat_lng(
    p_vendor_id,
    coalesce(p_zip, '') || '|' || coalesce(lower(trim(p_city)), ''),
    clat,
    clng
  ) j;

  dlat := (jlat - clat) * 5.0;
  dlng := (jlng - clng) * 5.0;
  dlat := greatest(-0.11, least(0.11, dlat));
  dlng := greatest(-0.14, least(0.14, dlng));

  return st_setsrid(st_makepoint(clng + dlng, clat + dlat), 4326)::geography;
end;
$$;

revoke all on function public.vendors_storefront_demo_point(uuid, text, text) from public;
revoke all on function public.vendors_delivery_demo_point_wide(uuid, text, text) from public;

do $seed$
declare
  lm record;
begin
  if to_regclass('public.listing_markets') is null
    or to_regclass('public.vendors') is null
    or to_regclass('public.vendor_market_operations') is null
  then
    raise notice '0140: missing listing_markets / vendors / vendor_market_operations — skipped';
    return;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_vendor_map_jitter_lat_lng'
  ) then
    raise notice '0140: _vendor_map_jitter_lat_lng missing (run 0126) — skipped';
    return;
  end if;

  for lm in select id from public.listing_markets loop
    -- Storefront lane: prefer explicit storefront + photo
    update public.vendors v
    set location = public.vendors_storefront_demo_point(v.id, v.zip, v.address)
    from (
      select sv.id
      from public.vendors sv
      inner join public.vendor_market_operations vmo
        on vmo.vendor_id = sv.id
        and vmo.market_id = lm.id
        and vmo.approved = true
      where coalesce(sv.is_live, false) = true
        and sv.license_status = 'approved'
        and coalesce(sv.offers_storefront, true) = true
        and coalesce(nullif(trim(sv.zip), ''), '') <> ''
        and (
          coalesce(nullif(trim(sv.logo_url), ''), '') <> ''
          or coalesce(nullif(trim(sv.banner_url), ''), '') <> ''
        )
      order by random()
      limit 5
    ) pick
    where v.id = pick.id;

    -- Delivery-only (no storefront): wider spread in metro
    update public.vendors v
    set location = public.vendors_delivery_demo_point_wide(v.id, v.zip, v.city)
    from (
      select dv.id
      from public.vendors dv
      inner join public.vendor_market_operations vmo
        on vmo.vendor_id = dv.id
        and vmo.market_id = lm.id
        and vmo.approved = true
      where coalesce(dv.is_live, false) = true
        and dv.license_status = 'approved'
        and coalesce(dv.offers_delivery, false) = true
        and coalesce(dv.offers_storefront, true) = false
        and coalesce(nullif(trim(dv.zip), ''), '') <> ''
        and (
          coalesce(nullif(trim(dv.logo_url), ''), '') <> ''
          or coalesce(nullif(trim(dv.banner_url), ''), '') <> ''
        )
      order by random()
      limit 5
    ) pick2
    where v.id = pick2.id;
  end loop;
end;
$seed$;

comment on function public.vendors_storefront_demo_point(uuid, text, text) is
  'Tight map point from ZIP-prefix CA center + jitter (storefront demo density).';
comment on function public.vendors_delivery_demo_point_wide(uuid, text, text) is
  'Wider bounded map point for delivery-only demo pins in the same metro.';
