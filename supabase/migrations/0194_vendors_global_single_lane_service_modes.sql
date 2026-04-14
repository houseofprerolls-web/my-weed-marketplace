-- Platform-wide single lane: no dual delivery+storefront.
-- Every vendor (including Smokers Club) is delivery-only without a full storefront address
-- (street + city + state), otherwise storefront-only. Clears allow_both_storefront_and_delivery.

create or replace function public.vendors_enforce_service_mode_from_address()
returns trigger
language plpgsql
as $$
begin
  if coalesce(btrim(new.address), '') = ''
     or coalesce(btrim(new.city), '') = ''
     or coalesce(btrim(new.state), '') = '' then
    new.offers_storefront := false;
    new.offers_delivery := true;
  else
    new.offers_storefront := true;
    new.offers_delivery := false;
  end if;

  new.allow_both_storefront_and_delivery := false;

  return new;
end;
$$;

drop trigger if exists vendors_enforce_service_mode_from_address_trg on public.vendors;

create trigger vendors_enforce_service_mode_from_address_trg
  before insert or update
  on public.vendors
  for each row
  execute procedure public.vendors_enforce_service_mode_from_address();

comment on function public.vendors_enforce_service_mode_from_address() is
  'Single-lane policy: full street+city+state → storefront only; otherwise delivery only; allow_both_storefront_and_delivery always cleared.';

-- Normalize all existing rows (Smokers Club and directory).
update public.vendors
set allow_both_storefront_and_delivery = false;

update public.vendors v
set
  offers_storefront = (
    coalesce(btrim(v.address), '') <> ''
    and coalesce(btrim(v.city), '') <> ''
    and coalesce(btrim(v.state), '') <> ''
  ),
  offers_delivery = not (
    coalesce(btrim(v.address), '') <> ''
    and coalesce(btrim(v.city), '') <> ''
    and coalesce(btrim(v.state), '') <> ''
  );
