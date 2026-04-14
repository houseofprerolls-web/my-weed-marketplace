-- Service areas (legacy): US state codes — superseded by 0204_supply_accounts_service_listing_markets.sql (CA listing_markets.slug / map regions).
-- Service areas: US state codes on supply_accounts + RPC for supply staff to update safely (no direct row privilege escalation).

alter table public.supply_accounts
  add column if not exists service_state_codes text[] not null default '{}'::text[];

alter table public.supply_accounts
  add column if not exists service_notes text;

comment on column public.supply_accounts.service_state_codes is
  'USPS state codes (e.g. CA, NY) where the supplier distributes; empty = not specified for vendor matching.';

comment on column public.supply_accounts.service_notes is
  'Optional freeform coverage notes (e.g. nationwide broker, excludes HI).';

create index if not exists supply_accounts_service_state_codes_gin
  on public.supply_accounts using gin (service_state_codes);

create or replace function public.supply_account_set_service_areas(
  p_supply_account_id uuid,
  p_state_codes text[],
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  c text;
  norm text[] := '{}'::text[];
begin
  if not (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(p_supply_account_id)
  ) then
    raise exception 'not allowed';
  end if;

  if p_state_codes is not null and coalesce(array_length(p_state_codes, 1), 0) > 0 then
    foreach c in array p_state_codes loop
      if c is null or btrim(c) = '' or upper(btrim(c)) !~ '^[A-Z]{2}$' then
        raise exception 'invalid state code: %', c;
      end if;
    end loop;
    select coalesce(array_agg(x order by x), '{}'::text[])
      into norm
      from (select distinct upper(btrim(t)) as x from unnest(p_state_codes) as u(t)) s;
  end if;

  update public.supply_accounts
  set
    service_state_codes = coalesce(norm, '{}'::text[]),
    service_notes = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_supply_account_id;

  if not found then
    raise exception 'supply account not found';
  end if;
end;
$$;

revoke all on function public.supply_account_set_service_areas(uuid, text[], text) from public;
grant execute on function public.supply_account_set_service_areas(uuid, text[], text) to authenticated;

comment on function public.supply_account_set_service_areas(uuid, text[], text) is
  'Supply staff or admin: set service_state_codes and service_notes only (RLS-safe).';
