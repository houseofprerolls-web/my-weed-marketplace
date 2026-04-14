-- Per-SKU quantity/weight options with individual list prices (e.g. 3.5g / 7g / 14g / 28g / custom).

do $mig$
begin
  if to_regclass('public.products') is null then
    raise notice '0112: public.products missing — skipped product_quantity_tiers';
    return;
  end if;

  create table if not exists public.product_quantity_tiers (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products (id) on delete cascade,
    sort_order int not null default 0,
    preset text not null default 'custom'
      check (preset in ('3_5g', '7g', '14g', '28g', 'custom')),
    label text not null,
    price_cents int not null check (price_cents >= 0),
    created_at timestamptz not null default now()
  );

  create index if not exists product_quantity_tiers_product_sort_idx
    on public.product_quantity_tiers (product_id, sort_order, id);
end;
$mig$;

-- RLS
alter table public.product_quantity_tiers enable row level security;

drop policy if exists product_quantity_tiers_public_select on public.product_quantity_tiers;
create policy product_quantity_tiers_public_select
  on public.product_quantity_tiers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products pr
      where pr.id = product_quantity_tiers.product_id
        and pr.in_stock = true
        and exists (
          select 1
          from public.vendors v
          where v.id = pr.vendor_id
            and v.is_live = true
            and v.license_status = 'approved'
        )
    )
  );

drop policy if exists product_quantity_tiers_vendor_all on public.product_quantity_tiers;
create policy product_quantity_tiers_vendor_all
  on public.product_quantity_tiers
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_quantity_tiers.product_id
        and public.vendor_staff_may_manage(p.vendor_id)
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_quantity_tiers.product_id
        and public.vendor_staff_may_manage(p.vendor_id)
    )
  );

do $admin_pol$
begin
  if to_regclass('public.product_quantity_tiers') is null then
    return;
  end if;
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    return;
  end if;
  drop policy if exists product_quantity_tiers_admin_all on public.product_quantity_tiers;
  create policy product_quantity_tiers_admin_all
    on public.product_quantity_tiers
    for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end;
$admin_pol$;

grant select on public.product_quantity_tiers to anon;
grant select, insert, update, delete on public.product_quantity_tiers to authenticated;
grant all on public.product_quantity_tiers to service_role;

comment on table public.product_quantity_tiers is
  'Optional weight/quantity sell options for one product SKU, each with its own list price.';

-- Reorder: honor saved tier id when still valid; include quantity label for cart display.
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
  tier_id uuid;
  used_tier_id uuid;
  tier_price int;
  q_label text;
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

    tier_id := null;
    if elem ->> 'tier_id' is not null and trim(elem ->> 'tier_id') <> '' then
      begin
        tier_id := (elem ->> 'tier_id')::uuid;
      exception
        when invalid_text_representation then
          tier_id := null;
      end;
    end if;

    q_label := nullif(trim(elem ->> 'quantity_label'), '');

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

    used_tier_id := null;
    if tier_id is not null and to_regclass('public.product_quantity_tiers') is not null then
      select t.price_cents
        into tier_price
      from public.product_quantity_tiers t
      where t.id = tier_id
        and t.product_id = pr_id;
      if found then
        pr_price := tier_price;
        used_tier_id := tier_id;
      end if;
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
        'quantity', qty,
        'tier_id', used_tier_id,
        'quantity_label', case when used_tier_id is not null then q_label else null end
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
