-- Optional audit: vendors whose premise ZIP centroid (3-digit bucket) is far from saved map point.
-- Run in SQL editor against production clone; tune 80000 m (~50 mi) as needed.
-- Requires PostGIS on public.vendors.location and non-null zip on vendors.

select
  v.id,
  v.name,
  v.zip,
  st_y(v.location::geometry) as saved_lat,
  st_x(v.location::geometry) as saved_lng
from public.vendors v
where v.is_live = true
  and v.license_status = 'approved'
  and v.location is not null
  and coalesce(nullif(trim(v.zip), ''), null) is not null
  and length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 5;

-- After exporting addresses, compare saved_lat/lng to a forward-geocode of
-- "address, city, state zip" in tooling (Mapbox, etc.) and flag rows where
-- great-circle distance exceeds ~50 km.
