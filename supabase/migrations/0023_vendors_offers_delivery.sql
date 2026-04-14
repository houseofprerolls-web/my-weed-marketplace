-- Delivery directory / Smokers Club: optional filter (default true = shows in delivery lists)
alter table public.vendors add column if not exists offers_delivery boolean not null default true;

comment on column public.vendors.offers_delivery is
  'When false, vendor is hidden from delivery-style listings (pickup-only shops).';
