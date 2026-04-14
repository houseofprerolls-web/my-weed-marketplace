-- When a vendor becomes license-approved, set `vendors.state` to a 2-letter code from ZIP
-- (same coarse geography as `market_zip_prefixes` + `listing_markets.region_key`, plus NY 100–149).
-- Fixes deal regions (`vendor_deal_allowed_region_keys`) when onboarding left state blank or wrong.

create or replace function public.vendor_state_code_from_zip(p_zip text)
returns text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  z text;
  pref text;
  rk text;
  pref_n int;
begin
  z := substring(regexp_replace(coalesce(p_zip, ''), '\D', '', 'g') from 1 for 5);
  if length(z) < 5 then
    return null;
  end if;

  pref := left(z, 3);

  select upper(trim(lm.region_key))
  into rk
  from public.market_zip_prefixes mzp
  join public.listing_markets lm on lm.id = mzp.market_id
  where mzp.prefix = pref
  limit 1;

  if rk is not null and rk ~ '^[A-Z]{2}$' then
    return rk;
  end if;

  if pref ~ '^[0-9]{3}$' then
    pref_n := pref::int;
    if pref_n >= 100 and pref_n <= 149 then
      return 'NY';
    end if;
  end if;

  select upper(trim(lm.region_key))
  into rk
  from public.listing_markets lm
  where lm.slug = 'california-other'
  limit 1;

  if rk is not null and rk ~ '^[A-Z]{2}$' then
    return rk;
  end if;

  return null;
end;
$$;

revoke all on function public.vendor_state_code_from_zip(text) from public;
grant execute on function public.vendor_state_code_from_zip(text) to anon, authenticated, service_role;

comment on function public.vendor_state_code_from_zip(text) is
  'USPS ZIP5 → 2-letter state/region code using market_zip_prefixes + listing_markets.region_key; NY 100–149; else california-other when present.';

-- ---------------------------------------------------------------------------

create or replace function public.vendors_apply_state_from_zip_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  derived text;
  apply_from_zip boolean;
begin
  apply_from_zip := false;
  if tg_op = 'INSERT' then
    apply_from_zip := new.license_status = 'approved';
  elsif tg_op = 'UPDATE' then
    apply_from_zip := new.license_status = 'approved'
      and (old.license_status is distinct from 'approved');
  end if;

  if apply_from_zip and length(regexp_replace(coalesce(new.zip, ''), '\D', '', 'g')) >= 5 then
    derived := public.vendor_state_code_from_zip(new.zip);
    if derived is not null then
      new.state := derived;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.vendors_apply_state_from_zip_on_approval() from public;

drop trigger if exists vendors_state_from_zip_on_approval_ins on public.vendors;
create trigger vendors_state_from_zip_on_approval_ins
  before insert on public.vendors
  for each row
  when (new.license_status = 'approved')
  execute procedure public.vendors_apply_state_from_zip_on_approval();

drop trigger if exists vendors_state_from_zip_on_approval_upd on public.vendors;
create trigger vendors_state_from_zip_on_approval_upd
  before update of license_status on public.vendors
  for each row
  when (new.license_status = 'approved' and old.license_status is distinct from 'approved')
  execute procedure public.vendors_apply_state_from_zip_on_approval();

comment on function public.vendors_apply_state_from_zip_on_approval() is
  'Sets vendors.state from ZIP when license_status becomes approved (insert approved or transition to approved).';

-- One-time: approved shops with missing or non–2-letter state
update public.vendors v
set state = public.vendor_state_code_from_zip(v.zip)
where v.license_status = 'approved'
  and length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 5
  and public.vendor_state_code_from_zip(v.zip) is not null
  and (
    coalesce(trim(v.state), '') = ''
    or upper(left(trim(v.state), 2)) !~ '^[A-Z]{2}$'
    or length(trim(coalesce(v.state, ''))) <> 2
  );
