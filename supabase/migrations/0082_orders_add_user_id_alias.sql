-- Some app migrations/policies reference `orders.user_id`,
-- but earlier `0045_create_orders_table_if_missing` created `orders`
-- with `consumer_id` instead.
--
-- Add `user_id` as an alias of `consumer_id` so:
-- - checkout can insert `user_id` safely
-- - order_documents RLS policies that reference `orders.user_id` work

alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Backfill existing rows (if any).
update public.orders
set user_id = consumer_id
where user_id is null
  and consumer_id is not null;

create or replace function public.orders_sync_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep the alias consistent for future inserts/updates.
  new.user_id := coalesce(new.user_id, new.consumer_id);
  return new;
end;
$$;

drop trigger if exists trg_orders_sync_user_id on public.orders;
create trigger trg_orders_sync_user_id
  before insert or update on public.orders
  for each row
  execute function public.orders_sync_user_id();

