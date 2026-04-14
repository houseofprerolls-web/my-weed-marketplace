-- Vendor map markers per listing market (ZIP-prefix area).
-- Adds market_id/zip_prefix/label on vendor_locations and enforces per-market quotas.

do $add_vendor_locations_market_cols$
begin
  if to_regclass('public.vendor_locations') is null then
    raise notice '0131: public.vendor_locations missing — skipped';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendor_locations'
      and column_name = 'market_id'
  ) then
    alter table public.vendor_locations
      add column market_id uuid;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendor_locations'
      and column_name = 'zip_prefix'
  ) then
    alter table public.vendor_locations
      add column zip_prefix text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendor_locations'
      and column_name = 'label'
  ) then
    alter table public.vendor_locations
      add column label text;
  end if;
end;
$add_vendor_locations_market_cols$;

-- ---------------------------------------------------------------------------
-- Admin-set quotas: max additional map rows per (vendor, market)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_market_marker_quotas (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  max_markers int not null check (max_markers >= 1 and max_markers <= 99),
  created_at timestamptz not null default now(),
  unique (vendor_id, market_id)
);

create index if not exists vendor_market_marker_quotas_vendor_idx
  on public.vendor_market_marker_quotas (vendor_id);

alter table public.vendor_market_marker_quotas enable row level security;

do $quota_policies$
begin
  drop policy if exists vendor_market_marker_quotas_vendor_select on public.vendor_market_marker_quotas;
  drop policy if exists vendor_market_marker_quotas_admin_write on public.vendor_market_marker_quotas;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    execute '
      create policy vendor_market_marker_quotas_vendor_select
        on public.vendor_market_marker_quotas
        for select
        using (
          exists (
            select 1
            from public.vendors v
            where v.id = vendor_id
              and v.user_id = auth.uid()
          )
          or public.auth_is_profile_admin()
        )';
    execute '
      create policy vendor_market_marker_quotas_admin_write
        on public.vendor_market_marker_quotas
        for all
        using (public.auth_is_profile_admin())
        with check (public.auth_is_profile_admin())';
  else
    execute '
      create policy vendor_market_marker_quotas_vendor_select
        on public.vendor_market_marker_quotas
        for select
        using (
          exists (
            select 1
            from public.vendors v
            where v.id = vendor_id
              and v.user_id = auth.uid()
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = ''admin''
          )
        )';
    execute '
      create policy vendor_market_marker_quotas_admin_write
        on public.vendor_market_marker_quotas
        for all
        using (
          exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = ''admin''
          )
        )
        with check (
          exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = ''admin''
          )
        )';
  end if;
end;
$quota_policies$;

grant select on table public.vendor_market_marker_quotas to authenticated;
grant all on table public.vendor_market_marker_quotas to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: cap vendor_locations rows per market_id (default max 1)
-- ---------------------------------------------------------------------------
create or replace function public._vendor_location_effective_zip_prefix(p_zip_prefix text)
returns text
language sql
immutable
as $$
  select nullif(left(regexp_replace(coalesce(p_zip_prefix, ''), '\D', '', 'g'), 3), '');
$$;

create or replace function public.enforce_vendor_location_market_quota()
returns trigger
language plpgsql
as $$
declare
  eff_market_id uuid;
  eff_prefix text;
  mx int;
  cnt int;
begin
  -- Normalize zip_prefix and keep it if present.
  eff_prefix := public._vendor_location_effective_zip_prefix(NEW.zip_prefix);
  NEW.zip_prefix := eff_prefix;

  -- Only enforce market quotas when market_id is set (market-scoped marker).
  if NEW.market_id is null then
    return NEW;
  end if;

  eff_market_id := NEW.market_id;

  -- Ensure this vendor is approved to operate in that market.
  if not exists (
    select 1
    from public.vendor_market_operations vmo
    where vmo.vendor_id = NEW.vendor_id
      and vmo.market_id = eff_market_id
      and vmo.approved = true
  ) then
    raise exception
      using errcode = 'P0001',
      message = 'This map marker market is not enabled for your store. Ask an administrator to enable the operating area.';
  end if;

  -- If zip_prefix provided, ensure it belongs to the chosen market OR market is california-other.
  if eff_prefix is not null then
    if not (
      exists (
        select 1
        from public.market_zip_prefixes mzp
        where mzp.prefix = eff_prefix
          and mzp.market_id = eff_market_id
      )
      or exists (
        select 1
        from public.listing_markets lm
        where lm.id = eff_market_id
          and lm.slug = 'california-other'
      )
    ) then
      raise exception
        using errcode = 'P0001',
        message = format('ZIP prefix %s is not part of the selected market.', eff_prefix);
    end if;
  end if;

  select coalesce(
    (
      select q.max_markers
      from public.vendor_market_marker_quotas q
      where q.vendor_id = NEW.vendor_id
        and q.market_id = eff_market_id
    ),
    1
  )
  into mx;

  select count(*)::int
  into cnt
  from public.vendor_locations vl
  where vl.vendor_id = NEW.vendor_id
    and vl.market_id = eff_market_id
    and (TG_OP = 'insert' or vl.id <> NEW.id);

  if cnt >= mx then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'Map markers in this market are limited to %s for this store (admin quota). Ask your administrator to raise the cap or remove an existing marker.',
          mx
        );
  end if;

  return NEW;
end;
$$;

drop trigger if exists vendor_locations_market_quota_ins on public.vendor_locations;
create trigger vendor_locations_market_quota_ins
  before insert on public.vendor_locations
  for each row
  execute procedure public.enforce_vendor_location_market_quota();

-- ---------------------------------------------------------------------------
-- Compatibility: region-based quota trigger should ignore market-scoped markers.
-- (Legacy trigger from migration 0050 enforces per-state caps and requires state/region_key.)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_vendor_location_region_quota()
returns trigger
language plpgsql
as $$
declare
  new_rk text;
  mx int;
  cnt int;
begin
  -- Market-scoped markers are capped per-market; skip legacy state quota enforcement.
  if NEW.market_id is not null then
    return NEW;
  end if;

  new_rk := public.vendor_location_effective_region_key(NEW);
  if TG_OP = 'insert' then
    if new_rk is null then
      raise exception 'vendor_locations: set state (e.g. CA) or region_key for this map marker';
    end if;
    NEW.region_key := new_rk;
  elsif TG_OP = 'update' then
    if new_rk is null then
      return NEW;
    end if;
    NEW.region_key := new_rk;
  end if;

  if new_rk is null then
    return NEW;
  end if;

  select coalesce(
    (
      select q.max_markers
      from public.vendor_region_marker_quotas q
      where q.vendor_id = NEW.vendor_id
        and q.region_key = new_rk
    ),
    1
  )
  into mx;

  select count(*)::int
  into cnt
  from public.vendor_locations vl
  where vl.vendor_id = NEW.vendor_id
    and public.vendor_location_effective_region_key(vl) = new_rk
    and (TG_OP = 'insert' or vl.id <> NEW.id);

  if cnt >= mx then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'Map markers in region %s are limited to %s for this store (admin quota). Ask your administrator to raise the cap or remove an existing marker.',
          new_rk,
          mx
        );
  end if;

  return NEW;
end;
$$;

drop trigger if exists vendor_locations_market_quota_upd on public.vendor_locations;
create trigger vendor_locations_market_quota_upd
  before update of market_id, zip_prefix, vendor_id on public.vendor_locations
  for each row
  when (
    NEW.market_id is distinct from OLD.market_id
    or public._vendor_location_effective_zip_prefix(NEW.zip_prefix) is distinct from public._vendor_location_effective_zip_prefix(OLD.zip_prefix)
    or NEW.vendor_id is distinct from OLD.vendor_id
  )
  execute procedure public.enforce_vendor_location_market_quota();

