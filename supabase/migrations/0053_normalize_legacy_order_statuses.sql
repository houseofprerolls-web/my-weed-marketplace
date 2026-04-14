-- Map leftover legacy statuses into the fulfillment flow so
-- vendor_update_order_fulfillment transitions match DB state.

do $norm$
begin
  if to_regclass('public.orders') is null then
    raise notice '0053: public.orders missing — skipped';
    return;
  end if;

  update public.orders
  set status = 'pending'
  where lower(trim(status)) in ('new', 'received');

  update public.orders
  set status = 'accepted'
  where lower(trim(status)) in ('preparing', 'processing');

  update public.orders
  set status = 'en_route'
  where lower(trim(status)) in ('out_for_delivery');

  update public.orders
  set status = 'completed'
  where lower(trim(status)) in ('delivered');

  raise notice '0053: legacy order statuses normalized where applicable';
end;
$norm$;
