-- Unlimited extra map pins: stop enforcing per-market and per-region row caps on vendor_locations.
-- Quota tables may remain for historical data; triggers become no-ops.

create or replace function public.enforce_vendor_location_market_quota()
returns trigger
language plpgsql
as $$
begin
  return NEW;
end;
$$;

create or replace function public.enforce_vendor_location_region_quota()
returns trigger
language plpgsql
as $$
begin
  return NEW;
end;
$$;
