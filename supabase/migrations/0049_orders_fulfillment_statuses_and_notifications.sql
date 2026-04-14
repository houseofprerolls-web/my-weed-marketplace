-- Fulfillment pipeline: pending → accepted → en_route → completed (+ cancelled).
-- Vendor updates via RPC (validates transitions + logs customer-visible updates).

do $mig_fulfillment$
declare
  r record;
begin
  if to_regclass('public.orders') is null then
    raise notice '0049: public.orders missing — skipped';
    return;
  end if;

  -- Drop any CHECK on orders.status (name varies by Postgres version).
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;

  update public.orders set status = 'accepted' where status = 'confirmed';
  update public.orders set status = 'completed' where status = 'fulfilled';

  alter table public.orders drop constraint if exists orders_status_fulfillment_check;

  alter table public.orders
    add constraint orders_status_fulfillment_check
    check (
      status in (
        'pending',
        'accepted',
        'en_route',
        'completed',
        'cancelled'
      )
    );

  create table if not exists public.order_fulfillment_updates (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    vendor_id uuid not null references public.vendors (id) on delete cascade,
    consumer_id uuid references auth.users (id) on delete set null,
    status text not null,
    message text,
    created_at timestamptz not null default now()
  );

  create index if not exists order_fulfillment_updates_order_idx
    on public.order_fulfillment_updates (order_id, created_at desc);

  alter table public.order_fulfillment_updates enable row level security;

  drop policy if exists order_fulfillment_updates_select_parties on public.order_fulfillment_updates;
  create policy order_fulfillment_updates_select_parties
    on public.order_fulfillment_updates for select
    to authenticated
    using (
      consumer_id = auth.uid()
      or exists (
        select 1
        from public.orders o
        join public.vendors v on v.id = o.vendor_id
        where o.id = order_fulfillment_updates.order_id
          and v.user_id = auth.uid()
      )
    );

  drop policy if exists order_fulfillment_updates_admin_select on public.order_fulfillment_updates;
  create policy order_fulfillment_updates_admin_select
    on public.order_fulfillment_updates for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );

  grant select on public.order_fulfillment_updates to authenticated;
  grant select on public.order_fulfillment_updates to service_role;

  create or replace function public.vendor_update_order_fulfillment (
    p_order_id uuid,
    p_new_status text,
    p_message text default null
  ) returns void
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  declare
    v_vendor_id uuid;
    v_consumer_id uuid;
    v_current text;
    v_trim text;
    v_body text;
  begin
    if p_new_status is null
      or p_new_status not in (
        'pending',
        'accepted',
        'en_route',
        'completed',
        'cancelled'
      )
    then
      raise exception 'invalid status';
    end if;

    select o.vendor_id, o.consumer_id, o.status
      into v_vendor_id, v_consumer_id, v_current
    from public.orders o
    where o.id = p_order_id
    for update;

    if not found then
      raise exception 'order not found';
    end if;

    if not exists (
      select 1
      from public.vendors v
      where v.id = v_vendor_id
        and v.user_id = auth.uid()
    ) then
      raise exception 'forbidden';
    end if;

    if v_current in ('completed', 'cancelled') then
      raise exception 'order is closed';
    end if;

    if p_new_status = v_current then
      return;
    end if;

    if not (
      (v_current = 'pending' and p_new_status in ('accepted', 'cancelled'))
      or (v_current = 'accepted' and p_new_status in ('en_route', 'cancelled'))
      or (v_current = 'en_route' and p_new_status in ('completed', 'cancelled'))
    ) then
      raise exception 'invalid status transition from % to %', v_current, p_new_status;
    end if;

    update public.orders
    set status = p_new_status
    where id = p_order_id;

    v_trim := nullif(trim(coalesce(p_message, '')), '');
    v_body := coalesce(
      v_trim,
      case p_new_status
        when 'pending' then 'Order is pending.'
        when 'accepted' then 'Your order was accepted and is being prepared.'
        when 'en_route' then 'Your order is on the way.'
        when 'completed' then 'Your order is completed. Thank you!'
        when 'cancelled' then 'This order was cancelled.'
        else 'Order updated.'
      end
    );

    insert into public.order_fulfillment_updates (
      order_id,
      vendor_id,
      consumer_id,
      status,
      message
    )
    values (
      p_order_id,
      v_vendor_id,
      v_consumer_id,
      p_new_status,
      v_body
    );
  end;
  $fn$;

  revoke all on function public.vendor_update_order_fulfillment (uuid, text, text) from public;
  grant execute on function public.vendor_update_order_fulfillment (uuid, text, text) to authenticated;
  grant execute on function public.vendor_update_order_fulfillment (uuid, text, text) to service_role;

  raise notice '0049: orders fulfillment statuses + order_fulfillment_updates + vendor_update_order_fulfillment applied';
end;
$mig_fulfillment$;
