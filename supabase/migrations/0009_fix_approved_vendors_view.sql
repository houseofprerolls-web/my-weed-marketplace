-- Fix for `public.approved_vendors_coords` view column order drift.
-- Run in Supabase SQL Editor.

drop view if exists public.approved_vendors_coords;

create view public.approved_vendors_coords as
select
  v.user_id,
  v.name,
  v.address,
  v.phone,
  v.website,
  v.map_marker_image_url,
  ST_X(v.location::geometry) as lng,
  ST_Y(v.location::geometry) as lat
from public.vendors v
where v.license_status = 'approved'
  and v.is_live = true;

