-- Ensure lane columns exist (0023 / 0030 may not have been applied on this project), then set both lanes for live vendors.

alter table public.vendors add column if not exists offers_delivery boolean not null default true;

alter table public.vendors add column if not exists offers_storefront boolean not null default true;

update public.vendors
set offers_delivery = true,
    offers_storefront = true
where is_live = true;
