-- 1) Fill placeholder/empty vendor names from CA ULS description ("Legal entity: …").
-- 2) Delivery-only retailers (no storefront): city-level service address + jittered map point from ZIP prefix
--    (mirrors greenzone-bolt/lib/mapCoordinates.ts mapCenterForCaZipOrDefault + hashJitter intent).

create or replace function public._ca_zip_prefix_center_lat_lng(p_zip text)
returns table(center_lat double precision, center_lng double precision)
language plpgsql
immutable
as $$
declare
  z5 text;
  p int;
begin
  z5 := left(regexp_replace(coalesce(p_zip, ''), '[^0-9]', '', 'g'), 5);
  if length(z5) <> 5 then
    center_lat := 34.0522;
    center_lng := -118.2437;
    return next;
    return;
  end if;
  p := left(z5, 3)::int;
  if p < 900 or p > 961 then
    center_lat := 34.0522;
    center_lng := -118.2437;
    return next;
    return;
  end if;

  if p <= 908 then center_lat := 34.05; center_lng := -118.25;
  elsif p <= 918 then center_lat := 34.15; center_lng := -118.05;
  elsif p <= 921 then center_lat := 32.85; center_lng := -117.15;
  elsif p <= 925 then center_lat := 33.98; center_lng := -117.38;
  elsif p <= 928 then center_lat := 33.75; center_lng := -117.87;
  elsif p <= 934 then center_lat := 34.65; center_lng := -120.45;
  elsif p <= 936 then center_lat := 35.37; center_lng := -119.02;
  elsif p <= 938 then center_lat := 36.74; center_lng := -119.77;
  elsif p = 939 then center_lat := 36.68; center_lng := -121.66;
  elsif p = 940 then center_lat := 37.55; center_lng := -122.32;
  elsif p = 941 then center_lat := 37.77; center_lng := -122.42;
  elsif p <= 945 then center_lat := 37.8; center_lng := -122.12;
  elsif p <= 948 then center_lat := 37.8; center_lng := -122.27;
  elsif p = 949 then center_lat := 38.04; center_lng := -122.55;
  elsif p <= 951 then center_lat := 37.34; center_lng := -121.89;
  elsif p <= 953 then center_lat := 37.79; center_lng := -121.22;
  elsif p <= 955 then center_lat := 38.44; center_lng := -122.71;
  elsif p = 956 then center_lat := 38.58; center_lng := -121.01;
  elsif p <= 958 then center_lat := 38.58; center_lng := -121.49;
  elsif p = 959 then center_lat := 39.73; center_lng := -121.84;
  elsif p <= 961 then center_lat := 40.59; center_lng := -122.39;
  else center_lat := 34.0522; center_lng := -118.2437;
  end if;
  return next;
end;
$$;

-- Deterministic jitter (similar scale to client hashJitter).
create or replace function public._vendor_map_jitter_lat_lng(
  p_vendor_id uuid,
  p_zip text,
  p_base_lat double precision,
  p_base_lng double precision
)
returns table(j_lat double precision, j_lng double precision)
language sql
immutable
as $$
  select
    p_base_lat + (
      ((((abs(hashtext(p_vendor_id::text || coalesce(p_zip, '') || 'y'))::bigint % 180))::double precision / 1800.0 - 0.05) * 0.9)
      / cos(radians(p_base_lat))
    ),
    p_base_lng + (
      (((abs(hashtext(p_vendor_id::text || coalesce(p_zip, '')))::bigint % 180))::double precision / 1800.0 - 0.05) * 1.2
    );
$$;

create or replace function public.vendors_delivery_synthetic_geog(p_vendor_id uuid, p_zip text)
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
  select c.center_lat, c.center_lng
  into clat, clng
  from public._ca_zip_prefix_center_lat_lng(p_zip) c;

  select j.j_lat, j.j_lng into jlat, jlng
  from public._vendor_map_jitter_lat_lng(p_vendor_id, p_zip, clat, clng) j;

  return st_setsrid(st_makepoint(jlng, jlat), 4326)::geography;
end;
$$;

comment on function public.vendors_delivery_synthetic_geog(uuid, text) is
  'Approximate map point for delivery-only vendors: ZIP-prefix CA center + deterministic jitter by vendor id.';

revoke all on function public._ca_zip_prefix_center_lat_lng(text) from public;
revoke all on function public._vendor_map_jitter_lat_lng(uuid, text, double precision, double precision) from public;
revoke all on function public.vendors_delivery_synthetic_geog(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- A) Public names from ULS legal entity when name is missing or placeholder
-- ---------------------------------------------------------------------------
with extracted as (
  select
    v.id,
    trim(
      regexp_replace(
        trim(
          regexp_replace(
            coalesce(
              nullif(
                trim(substring(v.description from '(?i)Legal entity:\s*(.+?)\.\s+Premise:')),
                ''
              ),
              nullif(
                regexp_replace(
                  trim(substring(v.description from '(?i)Legal entity:\s*(.+)$')),
                  '\.+$',
                  ''
                ),
                ''
              )
            ),
            '\s*\[Equity Retailer\]\s*$',
            '',
            'i'
          )
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as new_name
  from public.vendors v
  where v.description is not null
    and v.description ~* 'Legal entity:'
)
update public.vendors v
set name = e.new_name
from extracted e
where v.id = e.id
  and length(e.new_name) >= 2
  and (
    lower(trim(coalesce(v.name, ''))) in ('tbd', 'unknown', 'n/a', 'na', 'none')
    or nullif(trim(coalesce(v.name, '')), '') is null
  );

-- ---------------------------------------------------------------------------
-- B) Delivery-only: city-scoped service address + spread map coordinates
-- ---------------------------------------------------------------------------
update public.vendors v
set
  address = format(
    'Delivery service area · %s, %s (license %s)',
    coalesce(nullif(trim(v.city), ''), 'Unknown'),
    coalesce(nullif(trim(v.state), ''), 'CA'),
    coalesce(nullif(trim(v.license_number), ''), 'n/a')
  ),
  location = public.vendors_delivery_synthetic_geog(v.id, coalesce(v.zip, ''))
where coalesce(v.offers_storefront, true) = false
  and coalesce(v.offers_delivery, false) = true
  and coalesce(v.is_live, false) = true
  and v.license_status = 'approved';
