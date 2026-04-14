-- Service areas: use CA listing_markets.slug (same regions as map / ZIP prefixes), not US state codes.

alter table public.supply_accounts
  add column if not exists service_notes text;

alter table public.supply_accounts
  add column if not exists service_listing_market_slugs text[] not null default '{}'::text[];

comment on column public.supply_accounts.service_listing_market_slugs is
  'listing_markets.slug where region_key = ca — wholesale distribution areas aligned with the shopper CA map; empty = not set.';

create index if not exists supply_accounts_service_listing_markets_gin
  on public.supply_accounts using gin (service_listing_market_slugs);

-- Legacy from 0202 (US states) — remove in favor of listing market slugs.
drop index if exists supply_accounts_service_state_codes_gin;
alter table public.supply_accounts drop column if exists service_state_codes;

drop function if exists public.supply_account_set_service_areas(uuid, text[], text);

create or replace function public.supply_account_set_service_listing_markets(
  p_supply_account_id uuid,
  p_market_slugs text[],
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  s text;
  norm text[] := '{}'::text[];
begin
  if not (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(p_supply_account_id)
  ) then
    raise exception 'not allowed';
  end if;

  if p_market_slugs is not null and coalesce(array_length(p_market_slugs, 1), 0) > 0 then
    foreach s in array p_market_slugs loop
      if s is null or btrim(s) = '' then
        raise exception 'empty market slug';
      end if;
      if not exists (
        select 1
        from public.listing_markets lm
        where lm.slug = lower(btrim(s))
          and lm.region_key = 'ca'
      ) then
        raise exception 'invalid CA listing market slug: %', s;
      end if;
    end loop;
    select coalesce(array_agg(x order by x), '{}'::text[])
      into norm
      from (
        select distinct lower(btrim(t)) as x
        from unnest(p_market_slugs) as u(t)
      ) q;
  end if;

  update public.supply_accounts
  set
    service_listing_market_slugs = coalesce(norm, '{}'::text[]),
    service_notes = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_supply_account_id;

  if not found then
    raise exception 'supply account not found';
  end if;
end;
$$;

revoke all on function public.supply_account_set_service_listing_markets(uuid, text[], text) from public;
grant execute on function public.supply_account_set_service_listing_markets(uuid, text[], text) to authenticated;

comment on function public.supply_account_set_service_listing_markets(uuid, text[], text) is
  'Supply staff or admin: set service_listing_market_slugs (CA listing_markets.slug only) and service_notes.';
