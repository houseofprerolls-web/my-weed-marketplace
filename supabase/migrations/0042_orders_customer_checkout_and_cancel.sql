-- Customer checkout metadata + safe cancel for pending orders (CannaHub `public.orders`).
-- Skips if `orders` is missing.

do $mig_orders_customer$
begin
  if to_regclass('public.orders') is null then
    raise notice '0042: public.orders does not exist — skipped';
    return;
  end if;

  alter table public.orders add column if not exists order_number text;
  alter table public.orders add column if not exists subtotal_cents int not null default 0;
  alter table public.orders add column if not exists delivery_fee_cents int not null default 0;
  alter table public.orders add column if not exists tax_cents int not null default 0;
  alter table public.orders add column if not exists delivery_address text;
  alter table public.orders add column if not exists delivery_city text;
  alter table public.orders add column if not exists delivery_zip text;
  alter table public.orders add column if not exists customer_phone text;
  alter table public.orders add column if not exists fulfillment_notes text;

  create unique index if not exists orders_order_number_unique
    on public.orders (order_number)
    where order_number is not null;
end;
$mig_orders_customer$;

-- Idempotent: customers may cancel only their own pending orders (starts fulfillment path for vendors).
create or replace function public.customer_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and consumer_id = auth.uid()
    and status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Cannot cancel: order not found, not yours, or status is not pending';
  end if;
end;
$$;

revoke all on function public.customer_cancel_order(uuid) from public;
grant execute on function public.customer_cancel_order(uuid) to authenticated;

comment on function public.customer_cancel_order(uuid) is
  'Buyer cancels own order while still pending; vendor fulfillment uses orders_vendor_update.';
