-- Cart + account/vendor order UIs insert `is_scheduled` and `scheduled_for`.
-- Older schemas (0001 / 0045) only had `scheduled_time`, so checkout failed with
-- "column does not exist" when placing orders (especially pre-orders).

do $o$
begin
  if to_regclass('public.orders') is null then
    raise notice '0163: public.orders missing — skipped';
    return;
  end if;

  alter table public.orders
    add column if not exists is_scheduled boolean not null default false;

  alter table public.orders
    add column if not exists scheduled_for timestamptz;

  comment on column public.orders.is_scheduled is
    'True when the customer chose a future pickup/delivery time (pre-order).';
  comment on column public.orders.scheduled_for is
    'Requested fulfillment time; null for ASAP / order-now.';

  -- Legacy rows that only set `scheduled_time` (0001 / 0045).
  update public.orders
  set
    scheduled_for = coalesce(scheduled_for, scheduled_time),
    is_scheduled = case
      when coalesce(scheduled_for, scheduled_time) is not null then true
      else is_scheduled
    end
  where scheduled_time is not null
    and scheduled_for is null;
end
$o$;

-- 0082 only copied user_id := coalesce(user_id, consumer_id). Checkout often sends
-- both; if only `user_id` were set, RLS `consumer_id = auth.uid()` would still fail.
-- Keep the two columns aligned before insert/update.
create or replace function public.orders_sync_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := coalesce(new.user_id, new.consumer_id);
  new.consumer_id := coalesce(new.consumer_id, new.user_id);
  return new;
end;
$$;

do $tr$
begin
  if to_regclass('public.orders') is null then
    return;
  end if;
  execute 'drop trigger if exists trg_orders_sync_user_id on public.orders';
  execute 'create trigger trg_orders_sync_user_id
    before insert or update on public.orders
    for each row
    execute function public.orders_sync_user_id()';
end
$tr$;
