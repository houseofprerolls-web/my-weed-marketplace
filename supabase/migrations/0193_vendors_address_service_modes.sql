-- Enforce: no full street address → delivery only; full address → storefront only,
-- unless allow_both_storefront_and_delivery (dual‑lane operators keep explicit booleans).

create or replace function public.vendors_enforce_service_mode_from_address()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.allow_both_storefront_and_delivery, false) then
    return new;
  end if;

  if coalesce(btrim(new.address), '') = ''
     or coalesce(btrim(new.city), '') = ''
     or coalesce(btrim(new.state), '') = '' then
    new.offers_storefront := false;
    new.offers_delivery := true;
  else
    new.offers_storefront := true;
    new.offers_delivery := false;
  end if;

  return new;
end;
$$;

drop trigger if exists vendors_enforce_service_mode_from_address_trg on public.vendors;

create trigger vendors_enforce_service_mode_from_address_trg
  before insert or update of address, city, state, offers_delivery, offers_storefront, allow_both_storefront_and_delivery
  on public.vendors
  for each row
  execute procedure public.vendors_enforce_service_mode_from_address();

comment on function public.vendors_enforce_service_mode_from_address() is
  'When allow_both_storefront_and_delivery is false: incomplete address → delivery only; street+city+state → storefront only.';

-- One-time backfill (respect dual‑lane flag).
update public.vendors v
set
  offers_storefront = case
    when coalesce(v.allow_both_storefront_and_delivery, false) then coalesce(v.offers_storefront, false)
    when coalesce(btrim(v.address), '') <> ''
      and coalesce(btrim(v.city), '') <> ''
      and coalesce(btrim(v.state), '') <> ''
    then true
    else false
  end,
  offers_delivery = case
    when coalesce(v.allow_both_storefront_and_delivery, false) then coalesce(v.offers_delivery, false)
    when coalesce(btrim(v.address), '') <> ''
      and coalesce(btrim(v.city), '') <> ''
      and coalesce(btrim(v.state), '') <> ''
    then false
    else true
  end
;
