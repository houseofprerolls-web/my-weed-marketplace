-- Read vendors.location as JSON for admin UI (service role only; not exposed to anon).

create or replace function public.vendor_stored_map_point(p_vendor_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when v.location is null then null::jsonb
    else jsonb_build_object(
      'lat', (st_y(v.location::geometry))::double precision,
      'lng', (st_x(v.location::geometry))::double precision
    )
  end
  from public.vendors v
  where v.id = p_vendor_id;
$$;

comment on function public.vendor_stored_map_point(uuid) is
  'Returns WGS84 lat/lng from vendors.location for admin map-pin tooling.';

revoke all on function public.vendor_stored_map_point(uuid) from public;
grant execute on function public.vendor_stored_map_point(uuid) to service_role;
