-- Allow service role (and migrations) to set vendors.location from app/scripts without raw PostGIS in JSON.

create or replace function public.set_vendor_geog_point(p_vendor_id uuid, p_lng double precision, p_lat double precision)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vendors
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = p_vendor_id;
$$;

comment on function public.set_vendor_geog_point(uuid, double precision, double precision) is
  'Sets vendors.location to a WGS84 point; used by CSV import scripts.';

revoke all on function public.set_vendor_geog_point(uuid, double precision, double precision) from public;
grant execute on function public.set_vendor_geog_point(uuid, double precision, double precision) to service_role;
