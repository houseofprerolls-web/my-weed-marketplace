-- Vendor-defined loyalty rewards (points-only or requires paid cart). Shopper spends points → vendor ledger +same amount.
-- Extends finalize_order_loyalty to apply order-linked rewards after order earn.

-- ---------------------------------------------------------------------------
-- Orders: optional loyalty reward chosen at checkout (requires_paid_purchase rewards)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists loyalty_reward_id uuid;

comment on column public.orders.loyalty_reward_id is
  'Optional vendor loyalty menu item applied when order completes (requires_paid_purchase = true).';

-- ---------------------------------------------------------------------------
-- Vendor loyalty menu items
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  points_cost int not null check (points_cost > 0),
  /** When false: shopper redeems with points only (no order). When true: must attach to an order meeting min purchase. */
  requires_paid_purchase boolean not null default false,
  min_purchase_cents int not null default 0 check (min_purchase_cents >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_loyalty_rewards_vendor_idx
  on public.vendor_loyalty_rewards (vendor_id, active, sort_order);

-- FK from orders → rewards (table now exists)
do $fk2$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_loyalty_reward_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_loyalty_reward_id_fkey
      foreign key (loyalty_reward_id) references public.vendor_loyalty_rewards (id) on delete set null;
  end if;
end;
$fk2$;

-- ---------------------------------------------------------------------------
-- Redemption audit
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.vendor_loyalty_rewards (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  consumer_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points_spent int not null check (points_spent > 0),
  redemption_kind text not null check (redemption_kind in ('points_only', 'with_order')),
  created_at timestamptz not null default now()
);

create index if not exists vendor_loyalty_redemptions_vendor_idx
  on public.vendor_loyalty_redemptions (vendor_id, created_at desc);

create index if not exists vendor_loyalty_redemptions_consumer_idx
  on public.vendor_loyalty_redemptions (consumer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Idempotent: one loyalty debit per order
-- ---------------------------------------------------------------------------
create unique index if not exists consumer_loyalty_ledger_loyalty_order_uidx
  on public.consumer_loyalty_ledger (order_id)
  where order_id is not null and reason = 'loyalty_reward_order';

-- ---------------------------------------------------------------------------
-- Apply order-linked loyalty spend (all points to vendor balance)
-- ---------------------------------------------------------------------------
create or replace function public._apply_loyalty_reward_on_order_complete(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  o record;
  r record;
  cost int;
  bal bigint;
begin
  if not public.vendor_points_program_globally_enabled() then
    return;
  end if;

  select
    oq.id,
    oq.vendor_id,
    oq.consumer_id,
    oq.loyalty_reward_id,
    coalesce(oq.subtotal_cents, oq.total_cents, 0) as sub_c
  into o
  from public.orders oq
  where oq.id = p_order_id;

  if not found or o.consumer_id is null or o.loyalty_reward_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.consumer_loyalty_ledger cl
    where cl.order_id = p_order_id and cl.reason = 'loyalty_reward_order'
  ) then
    return;
  end if;

  select * into r
  from public.vendor_loyalty_rewards lr
  where lr.id = o.loyalty_reward_id
    and lr.active = true
    and lr.vendor_id = o.vendor_id
    and lr.requires_paid_purchase = true;

  if not found then
    return;
  end if;

  if o.sub_c < r.min_purchase_cents then
    return;
  end if;

  cost := r.points_cost;

  insert into public.consumer_loyalty_balances (consumer_id, balance)
  values (o.consumer_id, 0)
  on conflict (consumer_id) do nothing;

  select cb.balance into bal
  from public.consumer_loyalty_balances cb
  where cb.consumer_id = o.consumer_id
  for update;

  if bal is null or bal < cost then
    return;
  end if;

  update public.consumer_loyalty_balances
  set balance = balance - cost, updated_at = now()
  where consumer_id = o.consumer_id;

  insert into public.consumer_loyalty_ledger (consumer_id, delta, reason, order_id)
  values (o.consumer_id, -cost, 'loyalty_reward_order', p_order_id);

  insert into public.vendor_points_balances (vendor_id, balance)
  values (o.vendor_id, 0)
  on conflict (vendor_id) do nothing;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    o.vendor_id,
    cost,
    'loyalty_menu',
    r.id,
    'loyalty_menu_redemption',
    jsonb_build_object('order_id', p_order_id, 'consumer_id', o.consumer_id)
  );

  update public.vendor_points_balances
  set balance = balance + cost, updated_at = now()
  where vendor_id = o.vendor_id;

  insert into public.vendor_loyalty_redemptions (
    reward_id,
    vendor_id,
    consumer_id,
    order_id,
    points_spent,
    redemption_kind
  )
  values (r.id, o.vendor_id, o.consumer_id, p_order_id, cost, 'with_order');
end;
$$;

revoke all on function public._apply_loyalty_reward_on_order_complete(uuid) from public;
grant execute on function public._apply_loyalty_reward_on_order_complete(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Shopper: points-only redeem (no purchase)
-- ---------------------------------------------------------------------------
create or replace function public.consumer_redeem_loyalty_reward_points_only(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  r record;
  bal bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_points_program_globally_enabled() then
    raise exception 'program disabled';
  end if;

  select * into r
  from public.vendor_loyalty_rewards lr
  where lr.id = p_reward_id and lr.active = true and lr.requires_paid_purchase = false;

  if not found then
    raise exception 'invalid reward or requires a purchase';
  end if;

  insert into public.consumer_loyalty_balances (consumer_id, balance)
  values (uid, 0)
  on conflict (consumer_id) do nothing;

  select cb.balance into bal from public.consumer_loyalty_balances cb where cb.consumer_id = uid for update;
  if bal is null or bal < r.points_cost then
    raise exception 'insufficient points';
  end if;

  update public.consumer_loyalty_balances
  set balance = balance - r.points_cost, updated_at = now()
  where consumer_id = uid;

  insert into public.consumer_loyalty_ledger (consumer_id, delta, reason, order_id)
  values (uid, -r.points_cost, 'loyalty_reward_redeem', null);

  insert into public.vendor_points_balances (vendor_id, balance)
  values (r.vendor_id, 0)
  on conflict (vendor_id) do nothing;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    r.vendor_id,
    r.points_cost,
    'loyalty_menu',
    r.id,
    'loyalty_menu_redemption',
    jsonb_build_object('consumer_id', uid, 'points_only', true)
  );

  update public.vendor_points_balances
  set balance = balance + r.points_cost, updated_at = now()
  where vendor_id = r.vendor_id;

  insert into public.vendor_loyalty_redemptions (
    reward_id,
    vendor_id,
    consumer_id,
    order_id,
    points_spent,
    redemption_kind
  )
  values (r.id, r.vendor_id, uid, null, r.points_cost, 'points_only');
end;
$$;

revoke all on function public.consumer_redeem_loyalty_reward_points_only(uuid) from public;
grant execute on function public.consumer_redeem_loyalty_reward_points_only(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Shopper: attach purchase-required reward to pending order
-- ---------------------------------------------------------------------------
create or replace function public.consumer_attach_loyalty_reward_to_order(
  p_order_id uuid,
  p_reward_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  o record;
  r record;
  bal bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_points_program_globally_enabled() then
    raise exception 'program disabled';
  end if;

  select
    id,
    vendor_id,
    consumer_id,
    status,
    coalesce(subtotal_cents, total_cents, 0) as sub_c,
    loyalty_reward_id
  into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;
  if o.consumer_id is distinct from uid then
    raise exception 'forbidden';
  end if;
  if o.status is distinct from 'pending' then
    raise exception 'order is not pending';
  end if;

  select * into r
  from public.vendor_loyalty_rewards lr
  where lr.id = p_reward_id and lr.active = true and lr.requires_paid_purchase = true;

  if not found then
    raise exception 'invalid reward or not a purchase-required offer';
  end if;
  if r.vendor_id is distinct from o.vendor_id then
    raise exception 'reward does not belong to this shop';
  end if;
  if o.sub_c < r.min_purchase_cents then
    raise exception 'order subtotal below minimum for this reward';
  end if;

  insert into public.consumer_loyalty_balances (consumer_id, balance)
  values (uid, 0)
  on conflict (consumer_id) do nothing;

  select cb.balance into bal from public.consumer_loyalty_balances cb where cb.consumer_id = uid for update;
  if bal is null or bal < r.points_cost then
    raise exception 'insufficient points';
  end if;

  update public.orders
  set loyalty_reward_id = p_reward_id
  where id = p_order_id;
end;
$$;

revoke all on function public.consumer_attach_loyalty_reward_to_order(uuid, uuid) from public;
grant execute on function public.consumer_attach_loyalty_reward_to_order(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- finalize_order_loyalty: order earn + loyalty order redemption
-- ---------------------------------------------------------------------------
create or replace function public.finalize_order_loyalty(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  o record;
  s record;
  sub_cent bigint;
  pot bigint;
  vp bigint;
  cp bigint;
begin
  perform pg_advisory_xact_lock(5817281, hashtext(p_order_id::text));

  select id, vendor_id, consumer_id, status, coalesce(subtotal_cents, total_cents, 0) as sub_c
    into o
  from public.orders
  where id = p_order_id;

  if not found then
    return;
  end if;

  if o.status is distinct from 'completed' then
    return;
  end if;
  if o.consumer_id is null then
    return;
  end if;
  if not public.vendor_points_program_globally_enabled() then
    return;
  end if;

  select * into s from public.vendor_points_settings where id = 1;
  if not found then
    return;
  end if;

  sub_cent := greatest(coalesce(o.sub_c, 0), 0);

  if not exists (
    select 1
    from public.consumer_loyalty_ledger
    where order_id = p_order_id and reason = 'order_completed'
  ) then
    if sub_cent >= s.min_subtotal_cents then
      pot := (sub_cent / 100) * s.points_per_order_dollar;
      pot := greatest(s.min_points_per_order::bigint, least(s.max_points_per_order::bigint, pot));
      vp := (pot * s.vendor_share_bps) / 10000;
      if not coalesce(
        (select v.vendor_points_opt_in from public.vendors v where v.id = o.vendor_id),
        false
      ) then
        vp := 0;
      end if;
      cp := pot - vp;
      if cp < 0 then
        cp := 0;
      end if;
      if vp < 0 then
        vp := 0;
      end if;

      begin
        insert into public.consumer_loyalty_ledger (consumer_id, delta, reason, order_id)
        values (o.consumer_id, cp, 'order_completed', p_order_id);

        if vp > 0 then
          insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason)
          values (o.vendor_id, vp, 'order', p_order_id, 'order_completed');
        end if;

        insert into public.consumer_loyalty_balances (consumer_id, balance)
        values (o.consumer_id, cp)
        on conflict (consumer_id) do update
          set balance = public.consumer_loyalty_balances.balance + excluded.balance,
              updated_at = now();

        if vp > 0 then
          insert into public.vendor_points_balances (vendor_id, balance)
          values (o.vendor_id, vp)
          on conflict (vendor_id) do update
            set balance = public.vendor_points_balances.balance + excluded.balance,
                updated_at = now();
        end if;
      exception
        when unique_violation then
          null;
      end;
    end if;
  end if;

  perform public._apply_loyalty_reward_on_order_complete(p_order_id);
end;
$$;

revoke all on function public.finalize_order_loyalty(uuid) from public;
grant execute on function public.finalize_order_loyalty(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendor_loyalty_rewards enable row level security;
alter table public.vendor_loyalty_redemptions enable row level security;

drop policy if exists vendor_loyalty_rewards_public_select on public.vendor_loyalty_rewards;
create policy vendor_loyalty_rewards_public_select
  on public.vendor_loyalty_rewards for select
  using (active = true);

drop policy if exists vendor_loyalty_rewards_staff_all on public.vendor_loyalty_rewards;
create policy vendor_loyalty_rewards_staff_all
  on public.vendor_loyalty_rewards for all
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_loyalty_redemptions_consumer_select on public.vendor_loyalty_redemptions;
create policy vendor_loyalty_redemptions_consumer_select
  on public.vendor_loyalty_redemptions for select
  to authenticated
  using (consumer_id = auth.uid());

drop policy if exists vendor_loyalty_redemptions_staff_select on public.vendor_loyalty_redemptions;
create policy vendor_loyalty_redemptions_staff_select
  on public.vendor_loyalty_redemptions for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_loyalty_redemptions_admin_select on public.vendor_loyalty_redemptions;
create policy vendor_loyalty_redemptions_admin_select
  on public.vendor_loyalty_redemptions for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

grant select on public.vendor_loyalty_rewards to anon, authenticated;
grant select, insert, update, delete on public.vendor_loyalty_rewards to authenticated;
grant select on public.vendor_loyalty_redemptions to authenticated;
