-- One-shot complete: vendors can close an order as completed without stepping through
-- accepted → en route (useful for pickup / in-person handoff).

do $mig$
begin
  if to_regclass('public.orders') is null then
    raise notice '0054: public.orders missing — skipped';
    return;
  end if;

  create or replace function public.vendor_complete_order_now (
    p_order_id uuid,
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

    update public.orders
    set status = 'completed'
    where id = p_order_id;

    v_trim := nullif(trim(coalesce(p_message, '')), '');
    v_body := coalesce(
      v_trim,
      'Your order was completed. Thank you!'
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
      'completed',
      v_body
    );
  end;
  $fn$;

  revoke all on function public.vendor_complete_order_now (uuid, text) from public;
  grant execute on function public.vendor_complete_order_now (uuid, text) to authenticated;
  grant execute on function public.vendor_complete_order_now (uuid, text) to service_role;

  raise notice '0054: vendor_complete_order_now applied';
end;
$mig$;
