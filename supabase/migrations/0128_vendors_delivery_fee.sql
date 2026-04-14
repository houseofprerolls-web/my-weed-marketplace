-- Flat delivery fee (USD) for vendor-configured checkout; default 0 = free delivery line until set.

alter table public.vendors
  add column if not exists delivery_fee numeric not null default 0;

comment on column public.vendors.delivery_fee is
  'Delivery fee in dollars shown at checkout and editable by the store owner (0 = no fee).';
