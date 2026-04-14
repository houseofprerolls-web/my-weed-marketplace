-- Storefront vs delivery: at most one unless allow_both_storefront_and_delivery is true.
-- Backfill legacy null/both rows; preserve existing dual-mode shops via the flag.

alter table public.vendors
  add column if not exists allow_both_storefront_and_delivery boolean not null default false;

comment on column public.vendors.allow_both_storefront_and_delivery is
  'When false, offers_delivery and offers_storefront cannot both be true. Vendor/admin enables explicitly.';

-- Mark current dual-mode rows before normalizing nulls.
update public.vendors
set allow_both_storefront_and_delivery = true
where coalesce(offers_delivery, false) = true
  and coalesce(offers_storefront, false) = true;

-- Legacy NULL,NULL: match prior app heuristic (full address → storefront only; else delivery only).
update public.vendors v
set
  offers_storefront = case
    when coalesce(btrim(v.address), '') <> ''
      and coalesce(btrim(v.city), '') <> ''
      and coalesce(btrim(v.state), '') <> ''
    then true
    else false
  end,
  offers_delivery = case
    when coalesce(btrim(v.address), '') <> ''
      and coalesce(btrim(v.city), '') <> ''
      and coalesce(btrim(v.state), '') <> ''
    then false
    else true
  end
where v.offers_storefront is null
  and v.offers_delivery is null;

-- Remaining single-null → explicit false.
update public.vendors
set offers_storefront = coalesce(offers_storefront, false)
where offers_storefront is null;

update public.vendors
set offers_delivery = coalesce(offers_delivery, false)
where offers_delivery is null;

-- Any row that still has both true without the flag (should only be new edge cases).
update public.vendors
set allow_both_storefront_and_delivery = true
where coalesce(offers_delivery, false) = true
  and coalesce(offers_storefront, false) = true
  and coalesce(allow_both_storefront_and_delivery, false) = false;

alter table public.vendors
  drop constraint if exists vendors_service_modes_dual_flag;

alter table public.vendors
  add constraint vendors_service_modes_dual_flag check (
    not (
      coalesce(offers_delivery, false) = true
      and coalesce(offers_storefront, false) = true
    )
    or coalesce(allow_both_storefront_and_delivery, false) = true
  );
