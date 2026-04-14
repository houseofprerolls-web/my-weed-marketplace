-- Human-readable invoice numbers (letters + digits) when missing; consumers can read
-- vendor rows for stores they have ordered from (fixes PostgREST embed failures).

do $mig$
begin
  if to_regclass('public.orders') is null then
    raise notice '0052: public.orders missing — skipped';
    return;
  end if;

  alter table public.orders add column if not exists order_number text;

  create unique index if not exists orders_order_number_unique
    on public.orders (order_number)
    where order_number is not null;

  create or replace function public.random_invoice_token (p_len int)
  returns text
  language plpgsql
  as $fn$
  declare
    chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    i int;
    out text := '';
  begin
    if p_len < 1 then
      return '';
    end if;
    for i in 1..p_len loop
      out := out || substr(chars, (floor(random() * length(chars))::int + 1), 1);
    end loop;
    return out;
  end;
  $fn$;

  create or replace function public.generate_order_invoice_number ()
  returns text
  language sql
  as $fn$
    select 'INV-' || public.random_invoice_token (4) || '-' || public.random_invoice_token (4);
  $fn$;

  create or replace function public.orders_set_invoice_number ()
  returns trigger
  language plpgsql
  as $fn$
  declare
    attempt int := 0;
  begin
    if new.order_number is not null and length(trim(new.order_number)) > 0 then
      return new;
    end if;
    loop
      attempt := attempt + 1;
      exit when attempt > 30;
      new.order_number := public.generate_order_invoice_number ();
      exit when not exists (
        select 1
        from public.orders o
        where o.order_number is not null
          and o.order_number = new.order_number
          and o.id is distinct from new.id
      );
    end loop;
    if new.order_number is null or length(trim(new.order_number)) = 0 then
      new.order_number := 'INV-' || replace (gen_random_uuid ()::text, '-', '');
    end if;
    return new;
  end;
  $fn$;

  drop trigger if exists orders_invoice_number_bi on public.orders;
  create trigger orders_invoice_number_bi
    before insert on public.orders
    for each row
    execute function public.orders_set_invoice_number ();
end;
$mig$;

-- Backfill empty order_number values (separate block for valid DECLARE placement).
do $backfill$
declare
  r record;
  candidate text;
  tries int;
begin
  if to_regclass('public.orders') is null then
    return;
  end if;
  for r in
    select id
    from public.orders
    where order_number is null
       or trim(order_number) = ''
  loop
    tries := 0;
    loop
      tries := tries + 1;
      exit when tries > 40;
      candidate := public.generate_order_invoice_number ();
      if not exists (
        select 1 from public.orders o where o.order_number = candidate
      ) then
        update public.orders set order_number = candidate where id = r.id;
        exit;
      end if;
    end loop;
  end loop;
end;
$backfill$;

-- Consumers may read vendor name/essentials for dispensaries they placed orders with.
do $vpol$
begin
  if to_regclass('public.vendors') is null then
    raise notice '0052: public.vendors missing — skipped vendor policy';
    return;
  end if;

  drop policy if exists vendors_select_if_consumer_has_order on public.vendors;
  create policy vendors_select_if_consumer_has_order
    on public.vendors for select
    to authenticated
    using (
      exists (
        select 1
        from public.orders o
        where o.vendor_id = vendors.id
          and o.consumer_id = auth.uid()
      )
    );
end;
$vpol$;

-- Customers can read fulfillment timeline rows for their orders even if `consumer_id` was null on a row.
do $ful$
begin
  if to_regclass('public.order_fulfillment_updates') is null then
    return;
  end if;

  drop policy if exists order_fulfillment_updates_select_parties on public.order_fulfillment_updates;
  create policy order_fulfillment_updates_select_parties
    on public.order_fulfillment_updates for select
    to authenticated
    using (
      consumer_id = auth.uid()
      or exists (
        select 1
        from public.orders o
        where o.id = order_fulfillment_updates.order_id
          and o.consumer_id = auth.uid()
      )
      or exists (
        select 1
        from public.orders o
        join public.vendors v on v.id = o.vendor_id
        where o.id = order_fulfillment_updates.order_id
          and v.user_id = auth.uid()
      )
    );
end;
$ful$;
