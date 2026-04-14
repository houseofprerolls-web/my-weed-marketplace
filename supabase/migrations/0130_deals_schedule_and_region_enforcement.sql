-- Deal scheduling: precise start/end times + restrict region_keys to vendor-active states.

alter table public.deals add column if not exists starts_at timestamptz;
alter table public.deals add column if not exists ends_at timestamptz;

update public.deals d
set
  starts_at = coalesce(
    d.starts_at,
    (d.start_date::timestamp without time zone at time zone 'America/Los_Angeles')
  ),
  ends_at = coalesce(
    d.ends_at,
    (
      (d.end_date + 1)::timestamp without time zone at time zone 'America/Los_Angeles'
      - interval '1 second'
    )
  )
where d.starts_at is null or d.ends_at is null;

update public.deals
set starts_at = now() - interval '1 day'
where starts_at is null;

update public.deals
set ends_at = now() + interval '365 days'
where ends_at is null;

alter table public.deals alter column starts_at set not null;
alter table public.deals alter column ends_at set not null;

-- ---------------------------------------------------------------------------
create or replace function public.vendor_deal_allowed_region_keys(p_vendor_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select array_agg(distinct z.k order by z.k)
      from (
        select upper(left(trim(p.region_key), 2)) as k
        from public.vendor_menu_profiles p
        where p.vendor_id = p_vendor_id
          and length(trim(coalesce(p.region_key, ''))) >= 2
          and upper(trim(p.region_key)) not in ('DEFAULT', 'N/A', 'NA')
        union all
        select upper(left(trim(coalesce(v.state, '')), 2)) as k
        from public.vendors v
        where v.id = p_vendor_id
          and length(trim(coalesce(v.state, ''))) >= 2
      ) z
      where z.k ~ '^[A-Z]{2}$'
    ),
    '{}'::text[]
  );
$$;

revoke all on function public.vendor_deal_allowed_region_keys(uuid) from public;
grant execute on function public.vendor_deal_allowed_region_keys(uuid) to anon, authenticated, service_role;

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
  rk text;
  normalized text;
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

  allowed := public.vendor_deal_allowed_region_keys(NEW.vendor_id);

  if allowed is null or cardinality(allowed) = 0 then
    raise exception
      using errcode = 'P0001',
      message = 'Set your shop state (vendor profile) or add a regional menu (Menu → sources) before creating deals.';
  end if;

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

  if NEW.ends_at < NEW.starts_at then
    raise exception
      using errcode = 'P0001',
      message = 'Deal end time must be after start time.';
  end if;

  NEW.start_date := (NEW.starts_at at time zone 'America/Los_Angeles')::date;
  NEW.end_date := (NEW.ends_at at time zone 'America/Los_Angeles')::date;

  return NEW;
end;
$$;

drop trigger if exists deals_enforce_regions_ins_upd on public.deals;
create trigger deals_enforce_regions_ins_upd
  before insert or update of region_keys, vendor_id, starts_at, ends_at on public.deals
  for each row
  execute function public.deals_enforce_region_keys_and_times();

-- ---------------------------------------------------------------------------
drop policy if exists deals_public_select on public.deals;
create policy deals_public_select
  on public.deals for select
  using (
    public.vendor_is_publicly_visible(vendor_id)
    and now() >= starts_at
    and now() <= ends_at
  );
