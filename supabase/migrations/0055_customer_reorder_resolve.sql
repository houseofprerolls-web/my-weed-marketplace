-- Resolve past-order lines into current catalog availability (bypasses public product RLS
-- so we can tell out_of_stock vs not_on_menu). Caller must own the order.

create or replace function public.customer_reorder_resolve (p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  o record;
  v record;
  items_json jsonb;
  elem jsonb;
  i int;
  n int;
  pid uuid;
  qty int;
  snap_name text;
  pr_id uuid;
  pr_name text;
  pr_price int;
  pr_images text[];
  pr_thc numeric;
  pr_cbd numeric;
  pr_in_stock boolean;
  lines jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  img0 text;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'UNAUTHORIZED',
      'message', 'Sign in to reorder.'
    );
  end if;

  select id, consumer_id, vendor_id, items
    into o
  from public.orders
  where id = p_order_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Order not found.'
    );
  end if;

  if o.consumer_id is distinct from auth.uid() then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'message', 'This order is not linked to your account.'
    );
  end if;

  select id, name, is_live, license_status
    into v
  from public.vendors
  where id = o.vendor_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'STORE_NOT_AVAILABLE',
      'message', 'Store could not be found. Code: GZ_REORDER_STORE_NOT_AVAILABLE'
    );
  end if;

  if not (coalesce(v.is_live, false) and v.license_status = 'approved') then
    return jsonb_build_object(
      'ok', false,
      'code', 'STORE_NOT_AVAILABLE',
      'message',
      'This store is not available right now. Code: GZ_REORDER_STORE_NOT_AVAILABLE',
      'vendor_name', v.name
    );
  end if;

  items_json := coalesce(o.items, '[]'::jsonb);
  if jsonb_typeof(items_json) <> 'array' then
    items_json := '[]'::jsonb;
  end if;
  n := coalesce(jsonb_array_length(items_json), 0);
  if n > 0 then
    for i in 0..n - 1 loop
      elem := items_json -> i;
    snap_name := coalesce(nullif(trim(elem ->> 'name'), ''), 'Item');
    qty := coalesce(nullif(elem ->> 'quantity', '')::int, nullif(elem ->> 'qty', '')::int, 1);
    if qty is null or qty < 1 then
      qty := 1;
    end if;

    if elem ->> 'product_id' is null or trim(elem ->> 'product_id') = '' then
      skipped := skipped || jsonb_build_array(
        jsonb_build_object('label', snap_name, 'reason', 'not_on_menu')
      );
      continue;
    end if;

    begin
      pid := (elem ->> 'product_id')::uuid;
    exception
      when invalid_text_representation then
        skipped := skipped || jsonb_build_array(
          jsonb_build_object('label', snap_name, 'reason', 'not_on_menu')
        );
        continue;
    end;

    select
      p.id,
      p.name,
      p.price_cents,
      p.images,
      p.potency_thc,
      p.potency_cbd,
      p.in_stock
    into pr_id, pr_name, pr_price, pr_images, pr_thc, pr_cbd, pr_in_stock
    from public.products p
    where p.id = pid
      and p.vendor_id = o.vendor_id;

    if not found then
      skipped := skipped || jsonb_build_array(
        jsonb_build_object('label', snap_name, 'reason', 'not_on_menu')
      );
      continue;
    end if;

    if not coalesce(pr_in_stock, false) then
      skipped := skipped || jsonb_build_array(
        jsonb_build_object('label', coalesce(pr_name, snap_name), 'reason', 'out_of_stock')
      );
      continue;
    end if;

    img0 := null;
    if pr_images is not null and array_length(pr_images, 1) is not null and array_length(pr_images, 1) >= 1 then
      img0 := pr_images[1];
    end if;

    lines := lines || jsonb_build_array(
      jsonb_build_object(
        'product_id', pr_id,
        'vendor_id', o.vendor_id,
        'vendor_name', v.name,
        'name', pr_name,
        'price_cents', pr_price,
        'image', img0,
        'thc', pr_thc,
        'cbd', pr_cbd,
        'quantity', qty
      )
    );
    end loop;
  end if;

  return jsonb_build_object(
    'ok', true,
    'vendor_id', o.vendor_id,
    'vendor_name', v.name,
    'lines', lines,
    'skipped', skipped
  );
end;
$fn$;

revoke all on function public.customer_reorder_resolve (uuid) from public;
grant execute on function public.customer_reorder_resolve (uuid) to authenticated;
grant execute on function public.customer_reorder_resolve (uuid) to service_role;
