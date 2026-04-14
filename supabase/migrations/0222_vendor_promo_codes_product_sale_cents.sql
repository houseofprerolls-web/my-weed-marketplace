-- =============================================================================
-- 0222 — Shelf sale $ off + vendor promo codes (checkout) + redemption tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products: optional fixed cents off list (XOR with sale_discount_percent)
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists sale_discount_cents integer null;

comment on column public.products.sale_discount_cents is
  'Optional dollars-off shelf sale per unit (cents). Mutually exclusive with sale_discount_percent in app + DB check.';

alter table public.products
  drop constraint if exists products_sale_discount_cents_nonneg;

alter table public.products
  add constraint products_sale_discount_cents_nonneg
  check (sale_discount_cents is null or sale_discount_cents >= 1);

alter table public.products
  drop constraint if exists products_sale_discount_percent_or_cents;

alter table public.products
  add constraint products_sale_discount_percent_or_cents
  check (
    sale_discount_percent is null
    or sale_discount_cents is null
  );

update public.products
set sale_discount_cents = null
where sale_discount_percent is not null
  and sale_discount_cents is not null;

-- -----------------------------------------------------------------------------
-- orders: store checkout promo snapshot
-- -----------------------------------------------------------------------------
alter table public.orders
  add column if not exists promo_code_id uuid null;

alter table public.orders
  add column if not exists promo_discount_cents int not null default 0;

comment on column public.orders.promo_code_id is
  'Optional vendor_promo_codes row applied at checkout (discount in promo_discount_cents).';

comment on column public.orders.promo_discount_cents is
  'Merchandise discount from store promo code at checkout (cents). Subtotal on the order is pre-discount lines; totals reflect post-promo merchandise.';

-- FK added after table exists
-- -----------------------------------------------------------------------------
-- vendor_promo_codes
-- -----------------------------------------------------------------------------
create table if not exists public.vendor_promo_codes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  code text not null,
  label text null,
  discount_type text not null default 'percent'
    check (discount_type in ('percent', 'fixed_cents')),
  discount_percent int null,
  discount_cents int null,
  min_subtotal_cents int not null default 0,
  max_uses int null,
  uses_count int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint vendor_promo_codes_percent_range
    check (discount_percent is null or (discount_percent >= 1 and discount_percent <= 100)),
  constraint vendor_promo_codes_fixed_nonneg
    check (discount_cents is null or discount_cents >= 1),
  constraint vendor_promo_codes_discount_shape
    check (
      (discount_type = 'percent' and discount_percent is not null and discount_cents is null)
      or (discount_type = 'fixed_cents' and discount_cents is not null and discount_percent is null)
    )
);

create unique index if not exists vendor_promo_codes_vendor_code_lower_idx
  on public.vendor_promo_codes (vendor_id, lower(trim(code)));

create index if not exists vendor_promo_codes_vendor_id_idx
  on public.vendor_promo_codes (vendor_id);

comment on table public.vendor_promo_codes is
  'Store-wide promo codes (percent or fixed cents off merchandise subtotal). Validated at checkout via preview_vendor_promo_code.';

alter table public.orders
  drop constraint if exists orders_promo_code_id_fkey;

alter table public.orders
  add constraint orders_promo_code_id_fkey
  foreign key (promo_code_id) references public.vendor_promo_codes (id) on delete set null;

-- -----------------------------------------------------------------------------
-- vendor_promo_redemptions (one promo application per order max)
-- -----------------------------------------------------------------------------
create table if not exists public.vendor_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.vendor_promo_codes (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  consumer_id uuid not null references auth.users (id) on delete set null,
  discount_cents int not null check (discount_cents >= 0),
  created_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists vendor_promo_redemptions_promo_id_idx
  on public.vendor_promo_redemptions (promo_id);

create index if not exists vendor_promo_redemptions_vendor_lookup_idx
  on public.vendor_promo_redemptions (promo_id, created_at desc);

comment on table public.vendor_promo_redemptions is
  'Successful checkout applications of vendor_promo_codes (for vendor analytics).';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.vendor_promo_codes enable row level security;
alter table public.vendor_promo_redemptions enable row level security;

drop policy if exists vendor_promo_codes_staff_all on public.vendor_promo_codes;
create policy vendor_promo_codes_staff_all
  on public.vendor_promo_codes for all
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_promo_codes_admin_all on public.vendor_promo_codes;
create policy vendor_promo_codes_admin_all
  on public.vendor_promo_codes for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists vendor_promo_redemptions_staff_select on public.vendor_promo_redemptions;
create policy vendor_promo_redemptions_staff_select
  on public.vendor_promo_redemptions for select
  using (
    exists (
      select 1
      from public.vendor_promo_codes c
      where c.id = vendor_promo_redemptions.promo_id
        and public.vendor_staff_may_manage(c.vendor_id)
    )
  );

drop policy if exists vendor_promo_redemptions_admin_select on public.vendor_promo_redemptions;
create policy vendor_promo_redemptions_admin_select
  on public.vendor_promo_redemptions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Inserts only via SECURITY DEFINER RPC (no direct insert policy for clients)

-- -----------------------------------------------------------------------------
-- RPC: preview code (authenticated shoppers)
-- -----------------------------------------------------------------------------
create or replace function public.preview_vendor_promo_code(
  p_vendor_id uuid,
  p_code text,
  p_subtotal_cents int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vendor_promo_codes%rowtype;
  disc int;
  nowt timestamptz := now();
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to apply a promo code.');
  end if;

  if p_subtotal_cents is null or p_subtotal_cents < 0 then
    return jsonb_build_object('ok', false, 'message', 'Invalid cart subtotal.');
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter a code.');
  end if;

  select c.* into v_row
  from public.vendor_promo_codes c
  where c.vendor_id = p_vendor_id
    and lower(trim(c.code)) = lower(trim(p_code))
    and c.is_active = true
    and (c.starts_at is null or c.starts_at <= nowt)
    and (c.ends_at is null or c.ends_at >= nowt)
    and (c.max_uses is null or c.uses_count < c.max_uses)
    and p_subtotal_cents >= c.min_subtotal_cents
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Code is not valid for this store or cart.');
  end if;

  if v_row.discount_type = 'percent' then
    disc := floor(p_subtotal_cents * (v_row.discount_percent::numeric / 100))::int;
  else
    disc := least(p_subtotal_cents, coalesce(v_row.discount_cents, 0));
  end if;

  disc := greatest(0, disc);

  if disc <= 0 then
    return jsonb_build_object('ok', false, 'message', 'This code does not apply a discount for your subtotal.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'promo_id', v_row.id,
    'code', v_row.code,
    'discount_cents', disc,
    'label', v_row.label
  );
end;
$$;

revoke all on function public.preview_vendor_promo_code(uuid, text, int) from public;
grant execute on function public.preview_vendor_promo_code(uuid, text, int) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: record redemption + bump uses (after order insert)
-- -----------------------------------------------------------------------------
create or replace function public.finalize_vendor_promo_redemption(
  p_order_id uuid,
  p_promo_id uuid,
  p_discount_cents int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bump_rows int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'message', 'Not signed in');
  end if;

  if exists (select 1 from public.vendor_promo_redemptions r where r.order_id = p_order_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if not exists (
    select 1
    from public.orders ord
    where ord.id = p_order_id
      and ord.consumer_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'message', 'Order not found');
  end if;

  if not exists (
    select 1
    from public.orders ord
    join public.vendor_promo_codes c on c.id = p_promo_id and c.vendor_id = ord.vendor_id
    where ord.id = p_order_id
  ) then
    return jsonb_build_object('ok', false, 'message', 'Promo does not match this order');
  end if;

  update public.vendor_promo_codes c
  set uses_count = uses_count + 1
  where c.id = p_promo_id
    and (c.max_uses is null or c.uses_count < c.max_uses);

  get diagnostics bump_rows = row_count;
  if bump_rows = 0 then
    return jsonb_build_object('ok', false, 'message', 'Promo is no longer available');
  end if;

  insert into public.vendor_promo_redemptions (promo_id, order_id, consumer_id, discount_cents)
  values (p_promo_id, p_order_id, auth.uid(), greatest(0, coalesce(p_discount_cents, 0)));

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;

revoke all on function public.finalize_vendor_promo_redemption(uuid, uuid, int) from public;
grant execute on function public.finalize_vendor_promo_redemption(uuid, uuid, int) to authenticated;
