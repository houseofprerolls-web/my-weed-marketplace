-- Lane flags for Smokers Club / directory:
-- - `offers_delivery`: vendor can be placed in the delivery lane.
-- - `offers_storefront`: vendor can be placed in the storefront lane.

alter table public.vendors
add column if not exists offers_storefront boolean not null default true;

comment on column public.vendors.offers_storefront is
  'When false, vendor is excluded from storefront/pickup-style listings (still may be delivery).';

