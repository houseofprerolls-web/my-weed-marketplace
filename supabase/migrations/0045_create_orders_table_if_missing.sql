-- Create public.orders + RLS when missing (checkout / My orders need this; same shape as 0001 + 0042 columns).

do $mig_create_orders_if_missing$
begin
  if to_regclass('public.orders') is not null then
    raise notice '0045: public.orders already exists — skipped';
    return;
  end if;

  if to_regclass('public.vendors') is null then
    raise exception
      '0045: public.vendors is missing. Apply vendor schema (e.g. 0001_init) before orders.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception
      '0045: public.profiles is missing. Apply profiles migrations before orders.';
  end if;

  create table public.orders (
    id uuid primary key default gen_random_uuid(),
    consumer_id uuid references auth.users (id) on delete set null,
    vendor_id uuid not null references public.vendors (id) on delete cascade,

    items jsonb not null default '[]'::jsonb,
    total_cents int not null check (total_cents >= 0),

    status text not null default 'pending'
      check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),

    pickup_or_delivery text not null
      check (pickup_or_delivery in ('pickup', 'delivery', 'curbside')),

    scheduled_time timestamptz,
    created_at timestamptz not null default now(),

    order_number text,
    subtotal_cents int not null default 0,
    delivery_fee_cents int not null default 0,
    tax_cents int not null default 0,
    delivery_address text,
    delivery_city text,
    delivery_zip text,
    customer_phone text,
    fulfillment_notes text
  );

  create unique index if not exists orders_order_number_unique
    on public.orders (order_number)
    where order_number is not null;

  alter table public.orders enable row level security;

  create policy orders_consumer_select
    on public.orders for select
    using (
      consumer_id = auth.uid()
      or exists (
        select 1
        from public.vendors v
        where v.id = orders.vendor_id
          and v.user_id = auth.uid()
      )
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );

  create policy orders_consumer_insert
    on public.orders for insert
    with check (consumer_id = auth.uid());

  create policy orders_vendor_update
    on public.orders for update
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendor', 'admin'))
    )
    with check (true);

  create policy orders_admin_all
    on public.orders for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

  grant select, insert, update on table public.orders to authenticated;
  grant all on table public.orders to service_role;

  raise notice '0045: created public.orders, indexes, RLS, and grants';
end;
$mig_create_orders_if_missing$;

-- Ensure cancel RPC exists (0042 may have run when orders was still missing).
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
