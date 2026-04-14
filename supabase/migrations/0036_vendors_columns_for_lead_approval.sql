-- Ensures columns referenced by public.admin_approve_vendor_lead (0034) exist.
-- Safe if you skipped earlier migrations (e.g. 0020, 0023, 0030).

alter table public.vendors
  add column if not exists is_directory_listing boolean not null default false;

alter table public.vendors
  add column if not exists offers_delivery boolean not null default true;

alter table public.vendors
  add column if not exists offers_storefront boolean not null default true;

comment on column public.vendors.is_directory_listing is
  'When true, shop has no user_id; admin-created directory rows (e.g. from vendor lead approval).';

comment on column public.vendors.offers_delivery is
  'Vendor may appear in delivery lane / Smokers Club when true.';

comment on column public.vendors.offers_storefront is
  'Vendor may appear in storefront lane / pickup when true.';
