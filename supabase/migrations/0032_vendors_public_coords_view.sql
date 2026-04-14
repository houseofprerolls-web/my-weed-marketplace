-- Expose lat/lng + marker art for directory/discover maps (RLS on public.vendors still applies).
create or replace view public.vendors_public_coords as
select
  v.id as vendor_id,
  case when v.location is not null then ST_Y(v.location::geometry) end as geo_lat,
  case when v.location is not null then ST_X(v.location::geometry) end as geo_lng,
  v.map_marker_image_url,
  v.logo_url
from public.vendors v
where v.is_live = true
  and v.license_status = 'approved';

grant select on public.vendors_public_coords to anon, authenticated;

comment on view public.vendors_public_coords is
  'Read-only coords for live approved vendors; use for discover map and distance sort.';
