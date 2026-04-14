-- Admin-controlled cap on extra map rows (`vendor_locations`) per vendor.
-- Vendors may move/delete existing pins; new inserts are allowed only while count < allowance.

alter table public.vendors
  add column if not exists extra_map_pins_allowed int not null default 0;

alter table public.vendors
  drop constraint if exists vendors_extra_map_pins_allowed_range;

alter table public.vendors
  add constraint vendors_extra_map_pins_allowed_range
  check (extra_map_pins_allowed >= 0 and extra_map_pins_allowed <= 500);

comment on column public.vendors.extra_map_pins_allowed is
  'Max rows in vendor_locations for this vendor. Only admins may raise/lower; cannot be set below current row count.';

-- Grandfather: shops that already have extras keep at least that many slots.
update public.vendors v
set extra_map_pins_allowed = greatest(
  v.extra_map_pins_allowed,
  coalesce(
    (select count(*)::int from public.vendor_locations vl where vl.vendor_id = v.id),
    0
  )
);

-- ---------------------------------------------------------------------------
-- Block vendor_locations inserts when at cap
-- ---------------------------------------------------------------------------
create or replace function public.enforce_vendor_extra_location_row_cap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap int;
  cnt int;
begin
  if TG_OP <> 'INSERT' then
    return new;
  end if;
  select v.extra_map_pins_allowed into cap
  from public.vendors v
  where v.id = new.vendor_id;
  if not found then
    raise exception 'vendor_locations: vendor % not found', new.vendor_id using errcode = '23503';
  end if;
  cap := coalesce(cap, 0);
  select count(*)::int into cnt
  from public.vendor_locations vl
  where vl.vendor_id = new.vendor_id;
  if cnt >= cap then
    raise exception 'Extra map pin limit reached. Ask an admin to increase your allowance, or delete an existing extra pin to free a slot.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists vendor_locations_enforce_extra_row_cap on public.vendor_locations;
create trigger vendor_locations_enforce_extra_row_cap
  before insert on public.vendor_locations
  for each row
  execute procedure public.enforce_vendor_extra_location_row_cap();

-- ---------------------------------------------------------------------------
-- Only admins may change allowance; admins cannot set below current count
-- ---------------------------------------------------------------------------
create or replace function public.vendors_extra_map_pins_allowed_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cnt int;
begin
  if TG_OP <> 'UPDATE' then
    return new;
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    new.extra_map_pins_allowed := old.extra_map_pins_allowed;
    return new;
  end if;
  if new.extra_map_pins_allowed is not distinct from old.extra_map_pins_allowed then
    return new;
  end if;
  select count(*)::int into cnt from public.vendor_locations vl where vl.vendor_id = new.id;
  if new.extra_map_pins_allowed < cnt then
    raise exception 'Allowance (%) is below current extra pin count (%). Delete pins first or set a higher value.',
      new.extra_map_pins_allowed, cnt
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_extra_map_pins_allowed_guard_trg on public.vendors;
create trigger vendors_extra_map_pins_allowed_guard_trg
  before update on public.vendors
  for each row
  execute procedure public.vendors_extra_map_pins_allowed_guard();
