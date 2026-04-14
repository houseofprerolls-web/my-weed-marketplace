-- Per-dispensary sequential order invoice numbers (order_number), e.g. INV-0001, INV-0002 per vendor.
-- Replaces globally-unique random INV tokens with (vendor_id, order_number) uniqueness.

do $mig$
begin
  if to_regclass('public.vendors') is null then
    raise notice '0215: public.vendors missing — skipped';
    return;
  end if;

  if to_regclass('public.orders') is null then
    raise notice '0215: public.orders missing — skipped';
    return;
  end if;

  alter table public.vendors
    add column if not exists order_invoice_next_number integer not null default 0;

  comment on column public.vendors.order_invoice_next_number is
    'Last issued customer-order invoice sequence digit for this vendor; incremented in orders_set_invoice_number trigger.';

  -- Next issued number = current + 1 after increment; seed from existing order counts so new numbers continue after history.
  update public.vendors v
  set order_invoice_next_number = coalesce(
    (
      select count(*)::integer
      from public.orders o
      where o.vendor_id = v.id
    ),
    0
  );

  drop index if exists public.orders_order_number_unique;

  create unique index if not exists orders_vendor_order_number_unique
    on public.orders (vendor_id, order_number)
    where order_number is not null and vendor_id is not null;
end;
$mig$;

create or replace function public.orders_set_invoice_number ()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  seq int;
  attempt int;
begin
  -- Vendor checkout: always assign this shop’s own sequence (ignore client-supplied tokens).
  if new.vendor_id is not null then
    with inc as (
      update public.vendors v
      set order_invoice_next_number = v.order_invoice_next_number + 1
      where v.id = new.vendor_id
      returning v.order_invoice_next_number as n
    )
    select n into seq from inc;

    if seq is null then
      raise exception 'vendor % not found when assigning order_number', new.vendor_id;
    end if;

    new.order_number := 'INV-' || lpad(seq::text, 4, '0');
    return new;
  end if;

  -- Legacy rows without vendor_id: keep prior random INV behavior when order_number empty.
  if new.order_number is not null and length(trim(new.order_number)) > 0 then
    return new;
  end if;

  attempt := 0;
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

comment on function public.orders_set_invoice_number () is
  'Before insert: assigns vendor-scoped INV-#### for orders with vendor_id; otherwise random legacy invoice token.';
