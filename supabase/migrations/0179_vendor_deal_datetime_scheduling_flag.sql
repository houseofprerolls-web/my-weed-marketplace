-- Per-vendor flag: precise deal start/end clock times + daily happy-hour windows.
-- When false (default), non-admin deal writes are normalized to full calendar days in
-- America/Los_Angeles and daily_start_time / daily_end_time are cleared.
-- Platform admins may still set exact times (same as other deal admin bypasses).

alter table public.vendors
  add column if not exists deal_datetime_scheduling_enabled boolean not null default false;

comment on column public.vendors.deal_datetime_scheduling_enabled is
  'When true, store may set deal starts_at/ends_at to arbitrary times and use daily time windows. When false, trigger normalizes to LA calendar-day bounds.';

-- ---------------------------------------------------------------------------
-- Helpers for vendor UI: map Y-M-D (LA calendar) to timestamptz bounds (matches trigger).
-- ---------------------------------------------------------------------------
create or replace function public.deal_la_calendar_bounds(p_start date, p_end date)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    (p_start::timestamp without time zone at time zone 'America/Los_Angeles')::timestamptz,
    (
      ((p_end + interval '1 day')::timestamp without time zone at time zone 'America/Los_Angeles')
      - interval '1 second'
    )::timestamptz;
$$;

revoke all on function public.deal_la_calendar_bounds(date, date) from public;
grant execute on function public.deal_la_calendar_bounds(date, date) to authenticated, service_role;

comment on function public.deal_la_calendar_bounds(date, date) is
  'Returns starts_at (LA midnight on p_start) and ends_at (LA end of p_end) for vendor deal date-only mode.';

-- ---------------------------------------------------------------------------
-- Vendors cannot toggle this column; only platform admins may change it.
-- ---------------------------------------------------------------------------
create or replace function public.vendors_preserve_deal_datetime_scheduling_flag()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if tg_op = 'UPDATE' then
    if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
      new.deal_datetime_scheduling_enabled := old.deal_datetime_scheduling_enabled;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_preserve_deal_datetime_flag on public.vendors;
create trigger vendors_preserve_deal_datetime_flag
  before update on public.vendors
  for each row
  execute function public.vendors_preserve_deal_datetime_scheduling_flag();

-- ---------------------------------------------------------------------------
-- deals_enforce_region_keys_and_times: normalize coarse scheduling when flag off.
-- ---------------------------------------------------------------------------
create or replace function public.deals_enforce_region_keys_and_times()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  allowed text[];
  allowed_slugs text[];
  rk text;
  normalized text;
  s text;
  synced_keys text[];
  dt_sched boolean;
begin
  if public.auth_is_profile_admin() then
    if NEW.starts_at is not null then
      NEW.start_date := (NEW.starts_at at time zone 'America/Los_Angeles')::date;
    end if;
    if NEW.ends_at is not null then
      NEW.end_date := (NEW.ends_at at time zone 'America/Los_Angeles')::date;
    end if;
    return NEW;
  end if;

  dt_sched := coalesce(
    (
      select v.deal_datetime_scheduling_enabled
      from public.vendors v
      where v.id = NEW.vendor_id
      limit 1
    ),
    false
  );

  if
    not dt_sched
    and not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  then
    NEW.starts_at := (
      (NEW.starts_at at time zone 'America/Los_Angeles')::date::timestamp without time zone
      at time zone 'America/Los_Angeles'
    );
    NEW.ends_at := (
      (
        ((NEW.ends_at at time zone 'America/Los_Angeles')::date + interval '1 day')::timestamp without time zone
        at time zone 'America/Los_Angeles'
      )
      - interval '1 second'
    );
    NEW.daily_start_time := null;
    NEW.daily_end_time := null;
  end if;

  if NEW.ends_at < NEW.starts_at then
    raise exception
      using errcode = 'P0001',
      message = 'Deal end time must be after start time.';
  end if;

  NEW.start_date := (NEW.starts_at at time zone 'America/Los_Angeles')::date;
  NEW.end_date := (NEW.ends_at at time zone 'America/Los_Angeles')::date;

  allowed_slugs := public.vendor_approved_listing_market_slugs(NEW.vendor_id);

  if allowed_slugs is not null and cardinality(allowed_slugs) > 0 then
    if NEW.listing_market_slugs is null or cardinality(NEW.listing_market_slugs) = 0 then
      NEW.listing_market_slugs := allowed_slugs;
    else
      foreach s in array NEW.listing_market_slugs
      loop
        if not (trim(both from coalesce(s, '')) = any (allowed_slugs)) then
          raise exception
            using errcode = 'P0001',
            message = format(
              'Market "%s" is not an approved listing area for this store. Turn it on under admin market approvals first.',
              s
            );
        end if;
      end loop;
    end if;

    select coalesce(
      array_agg(distinct upper(left(trim(lm.region_key), 2)) order by upper(left(trim(lm.region_key), 2))),
      '{}'::text[]
    )
    into synced_keys
    from public.listing_markets lm
    where lm.slug = any (NEW.listing_market_slugs)
      and lm.region_key is not null
      and length(trim(lm.region_key)) >= 2
      and upper(left(trim(lm.region_key), 2)) ~ '^[A-Z]{2}$';

    NEW.region_keys := synced_keys;
  else
    allowed := public.vendor_deal_allowed_region_keys(NEW.vendor_id);

    if allowed is null or cardinality(allowed) = 0 then
      raise exception
        using errcode = 'P0001',
        message = 'Set your shop state (vendor profile) or add a regional menu, and get at least one marketplace area approved by admin before creating deals.';
    end if;

    NEW.listing_market_slugs := '{}'::text[];

    if NEW.region_keys is null or cardinality(NEW.region_keys) = 0 then
      NEW.region_keys := allowed;
    else
      foreach rk in array NEW.region_keys
      loop
        normalized := upper(left(trim(both from coalesce(rk, '')), 2));
        if not (normalized = any (allowed)) then
          raise exception
            using errcode = 'P0001',
            message = format(
              'Region %s is not allowed for this store. Allowed: %s.',
              normalized,
              array_to_string(allowed, ', ')
            );
        end if;
      end loop;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists deals_enforce_regions_ins_upd on public.deals;
create trigger deals_enforce_regions_ins_upd
  before insert or update of region_keys, listing_market_slugs, vendor_id, starts_at, ends_at, daily_start_time, daily_end_time
  on public.deals
  for each row
  execute function public.deals_enforce_region_keys_and_times();
