/*
  # Order scheduling support

  - Adds `is_scheduled` and `scheduled_for` on orders
  - Supports pre-orders when store is currently closed
*/

alter table public.orders
  add column if not exists is_scheduled boolean not null default false,
  add column if not exists scheduled_for timestamptz;

create index if not exists idx_orders_scheduled_for on public.orders(scheduled_for);

