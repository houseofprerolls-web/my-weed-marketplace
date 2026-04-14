-- Regional deals (vendors choose states; empty = all regions), admin map-marker quotas per region,
-- and vendor_locations.region_key + trigger to cap rows per (vendor, region).

-- ---------------------------------------------------------------------------
-- 1) deals.region_keys — empty array = nationwide / all regions
-- ---------------------------------------------------------------------------
do $add_deal_regions$
begin
  if to_regclass('public.deals') is null then
    raise notice '0050: public.deals missing — skipped region_keys';
    return;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'deals'
      and column_name = 'region_keys'
  ) then
    alter table public.deals
      add column region_keys text[] not null default '{}'::text[];
    raise notice '0050: added deals.region_keys';
  end if;
end;
$add_deal_regions$;

-- ---------------------------------------------------------------------------
-- 2) vendor_locations.region_key — optional explicit key; else derived from state
-- ---------------------------------------------------------------------------
do $add_vl_region$
begin
  if to_regclass('public.vendor_locations') is null then
    raise notice '0050: public.vendor_locations missing — skipped region_key';
    return;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendor_locations'
      and column_name = 'region_key'
  ) then
    alter table public.vendor_locations add column region_key text;
    raise notice '0050: added vendor_locations.region_key';
  end if;
end;
$add_vl_region$;

update public.vendor_locations vl
set region_key = upper(left(trim(coalesce(vl.state, '')), 2))
where vl.region_key is null
  and vl.state is not null
  and length(trim(vl.state)) >= 2;

-- ---------------------------------------------------------------------------
-- 3) Admin-set quotas: max additional map rows per (vendor, region)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_region_marker_quotas (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  region_key text not null,
  max_markers int not null check (max_markers >= 1 and max_markers <= 99),
  created_at timestamptz not null default now(),
  unique (vendor_id, region_key)
);

create index if not exists vendor_region_marker_quotas_vendor_idx
  on public.vendor_region_marker_quotas (vendor_id);

alter table public.vendor_region_marker_quotas enable row level security;

do $quota_policies$
begin
  drop policy if exists vendor_region_marker_quotas_vendor_select on public.vendor_region_marker_quotas;
  drop policy if exists vendor_region_marker_quotas_admin_write on public.vendor_region_marker_quotas;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    execute '
      create policy vendor_region_marker_quotas_vendor_select
        on public.vendor_region_marker_quotas
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
      create policy vendor_region_marker_quotas_admin_write
        on public.vendor_region_marker_quotas
        for all
        using (public.auth_is_profile_admin())
        with check (public.auth_is_profile_admin())';
  else
    execute '
      create policy vendor_region_marker_quotas_vendor_select
        on public.vendor_region_marker_quotas
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
      create policy vendor_region_marker_quotas_admin_write
        on public.vendor_region_marker_quotas
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

grant select on table public.vendor_region_marker_quotas to authenticated;
grant all on table public.vendor_region_marker_quotas to service_role;

-- ---------------------------------------------------------------------------
-- 4) Trigger: cap vendor_locations rows per normalized region_key (default max 1)
-- ---------------------------------------------------------------------------
create or replace function public.vendor_location_effective_region_key(loc public.vendor_locations)
returns text
language sql
immutable
as $$
  select nullif(
    upper(
      trim(
        both
        from coalesce(nullif(trim(loc.region_key), ''), left(trim(coalesce(loc.state, '')), 2))
      )
    ),
    ''
  );
$$;

create or replace function public.enforce_vendor_location_region_quota()
returns trigger
language plpgsql
as $$
declare
  new_rk text;
  mx int;
  cnt int;
begin
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

drop trigger if exists vendor_locations_region_quota_ins on public.vendor_locations;
create trigger vendor_locations_region_quota_ins
  before insert on public.vendor_locations
  for each row
  execute procedure public.enforce_vendor_location_region_quota();

drop trigger if exists vendor_locations_region_quota_upd on public.vendor_locations;
create trigger vendor_locations_region_quota_upd
  before update of region_key, state, vendor_id on public.vendor_locations
  for each row
  when (
    public.vendor_location_effective_region_key(NEW) is distinct from public.vendor_location_effective_region_key(OLD)
    or NEW.vendor_id is distinct from OLD.vendor_id
  )
  execute procedure public.enforce_vendor_location_region_quota();
