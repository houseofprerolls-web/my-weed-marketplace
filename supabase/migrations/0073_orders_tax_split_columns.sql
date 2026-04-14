-- Add tax split so vendors can enter sales/excise separately.

alter table public.orders
  add column if not exists sales_tax_cents int not null default 0,
  add column if not exists excise_tax_cents int not null default 0;

