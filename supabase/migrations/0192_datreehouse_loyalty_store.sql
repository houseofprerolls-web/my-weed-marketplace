-- Loyalty points store: admin-managed catalog; shoppers redeem with lifetime earned minus spent.

-- ---------------------------------------------------------------------------
-- Public leaderboard: allow small limits (top 3) — was clamped to minimum 5
-- ---------------------------------------------------------------------------
create or replace function public.datreehouse_loyalty_leaderboard_public(p_limit int default 20)
returns table(
  sort_index int,
  username text,
  points bigint,
  is_bot boolean,
  prize_eligible_rank int,
  subtitle text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  with lim as (
    select least(50, greatest(3, coalesce(p_limit, 20)))::int as n
  ),
  bounds as (
    select date_trunc('month', timezone('utc', now())) as ms,
           date_trunc('month', timezone('utc', now())) + interval '1 month' as me
  ),
  human_totals as (
    select l.consumer_id as uid, sum(l.points)::bigint as pts
    from public.datreehouse_loyalty_ledger l, bounds b
    where l.created_at >= b.ms and l.created_at < b.me
    group by l.consumer_id
  ),
  third_human as (
    select coalesce(
      (select pts from human_totals order by pts desc offset 2 limit 1),
      0::bigint
    ) as h3
  ),
  bot_names as (
    select b.display_username, row_number() over (order by b.sort_order, b.id) as rn
    from public.datreehouse_loyalty_bots b
  ),
  bots as (
    select
      bn.display_username as username,
      case bn.rn
        when 1 then greatest((select h3 from third_human) + 2000, 7500::bigint)
        when 2 then greatest((select h3 from third_human) + 1200, 6200::bigint)
        when 3 then greatest((select h3 from third_human) + 600, 5000::bigint)
      end as points,
      true as is_bot,
      null::integer as prize_eligible_rank,
      null::text as subtitle
    from bot_names bn
    where (select count(*)::int from public.datreehouse_loyalty_bots) >= 3
      and bn.rn <= 3
  ),
  humans as (
    select
      coalesce(nullif(trim(up.username), ''), 'member') as username,
      ht.pts as points,
      false as is_bot,
      case when rk.hr <= 3 then rk.hr::integer else null end as prize_eligible_rank,
      case when rk.hr <= 3 then 'Eligible for this month''s prize tier' else null end as subtitle
    from human_totals ht
    inner join (
      select uid, row_number() over (order by pts desc) as hr
      from human_totals
    ) rk on rk.uid = ht.uid
    left join public.user_profiles up on up.id = ht.uid
  ),
  merged as (
    select * from bots
    union all
    select * from humans
  )
  select
    row_number() over (order by m.points desc, m.is_bot asc)::integer as sort_index,
    m.username,
    m.points,
    m.is_bot,
    m.prize_eligible_rank,
    m.subtitle
  from merged m
  order by m.points desc, m.is_bot asc
  limit (select n from lim);
$$;

-- ---------------------------------------------------------------------------
-- Store catalog
-- ---------------------------------------------------------------------------
create table if not exists public.datreehouse_loyalty_store_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  points_cost bigint not null check (points_cost > 0),
  item_type text not null default 'other',
  sort_order int not null default 0,
  active boolean not null default true,
  stock_remaining int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists datreehouse_loyalty_store_items_active_sort_idx
  on public.datreehouse_loyalty_store_items (active, sort_order, id);

comment on table public.datreehouse_loyalty_store_items is
  'Admin-managed loyalty store offers (merch, credits, events, etc.); shoppers pay in loyalty points.';
comment on column public.datreehouse_loyalty_store_items.item_type is
  'Loose label for ops: merch, credit, digital, event, bundle, other, etc.';
comment on column public.datreehouse_loyalty_store_items.stock_remaining is
  'NULL = unlimited stock; integer decremented on each successful redemption.';

-- ---------------------------------------------------------------------------
-- Redemptions (append-only spend)
-- ---------------------------------------------------------------------------
create table if not exists public.datreehouse_loyalty_store_redemptions (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references auth.users (id) on delete cascade,
  store_item_id uuid not null references public.datreehouse_loyalty_store_items (id) on delete restrict,
  points bigint not null check (points > 0),
  created_at timestamptz not null default now()
);

create index if not exists datreehouse_loyalty_store_redemptions_consumer_idx
  on public.datreehouse_loyalty_store_redemptions (consumer_id, created_at desc);

alter table public.datreehouse_loyalty_store_items enable row level security;
alter table public.datreehouse_loyalty_store_redemptions enable row level security;

drop policy if exists datreehouse_loyalty_store_items_admin_all on public.datreehouse_loyalty_store_items;
create policy datreehouse_loyalty_store_items_admin_all
  on public.datreehouse_loyalty_store_items for all
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists datreehouse_loyalty_store_redemptions_own_select on public.datreehouse_loyalty_store_redemptions;
create policy datreehouse_loyalty_store_redemptions_own_select
  on public.datreehouse_loyalty_store_redemptions for select
  to authenticated
  using (consumer_id = auth.uid());

-- Public catalog (no direct table read for anon)
create or replace function public.datreehouse_loyalty_store_items_public()
returns jsonb
language sql
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'description', i.description,
        'image_url', i.image_url,
        'points_cost', i.points_cost,
        'item_type', i.item_type,
        'sort_order', i.sort_order,
        'stock_remaining', i.stock_remaining
      )
      order by i.sort_order, i.title
    ),
    '[]'::jsonb
  )
  from public.datreehouse_loyalty_store_items i
  where i.active
    and (i.stock_remaining is null or i.stock_remaining > 0);
$$;

revoke all on function public.datreehouse_loyalty_store_items_public() from public;
grant execute on function public.datreehouse_loyalty_store_items_public() to anon, authenticated;

-- Lifetime points earned
create or replace function public.datreehouse_my_loyalty_lifetime_earned()
returns bigint
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  total bigint;
begin
  if uid is null then
    return 0;
  end if;
  select coalesce(sum(l.points), 0)::bigint into total
  from public.datreehouse_loyalty_ledger l
  where l.consumer_id = uid;
  return total;
end;
$$;

revoke all on function public.datreehouse_my_loyalty_lifetime_earned() from public;
grant execute on function public.datreehouse_my_loyalty_lifetime_earned() to authenticated;

-- Spendable = lifetime earned minus sum of redemption points
create or replace function public.datreehouse_my_loyalty_spendable_points()
returns bigint
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  earned bigint;
  spent bigint;
begin
  if uid is null then
    return 0;
  end if;
  select coalesce(sum(l.points), 0)::bigint into earned
  from public.datreehouse_loyalty_ledger l
  where l.consumer_id = uid;
  select coalesce(sum(r.points), 0)::bigint into spent
  from public.datreehouse_loyalty_store_redemptions r
  where r.consumer_id = uid;
  return greatest(earned - spent, 0);
end;
$$;

revoke all on function public.datreehouse_my_loyalty_spendable_points() from public;
grant execute on function public.datreehouse_my_loyalty_spendable_points() to authenticated;

create or replace function public.datreehouse_loyalty_redeem_store_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  it public.datreehouse_loyalty_store_items%rowtype;
  earned bigint;
  spent bigint;
  bal bigint;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Serialize balance checks + inserts per shopper (prevents concurrent overspend).
  perform pg_advisory_xact_lock(hashtext('datreehouse_loyalty_wallet:' || uid::text));

  select * into strict it
  from public.datreehouse_loyalty_store_items
  where id = p_item_id
  for update;

  if not it.active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if it.stock_remaining is not null and it.stock_remaining <= 0 then
    return jsonb_build_object('ok', false, 'error', 'out_of_stock');
  end if;

  select coalesce(sum(l.points), 0)::bigint into earned
  from public.datreehouse_loyalty_ledger l
  where l.consumer_id = uid;
  select coalesce(sum(r.points), 0)::bigint into spent
  from public.datreehouse_loyalty_store_redemptions r
  where r.consumer_id = uid;
  bal := greatest(earned - spent, 0);

  if bal < it.points_cost then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_points',
      'balance', bal,
      'cost', it.points_cost
    );
  end if;

  insert into public.datreehouse_loyalty_store_redemptions (consumer_id, store_item_id, points)
  values (uid, p_item_id, it.points_cost);

  if it.stock_remaining is not null then
    update public.datreehouse_loyalty_store_items
    set
      stock_remaining = stock_remaining - 1,
      updated_at = now()
    where id = p_item_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'points_spent', it.points_cost,
    'new_balance', bal - it.points_cost
  );
exception
  when no_data_found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
end;
$$;

revoke all on function public.datreehouse_loyalty_redeem_store_item(uuid) from public;
grant execute on function public.datreehouse_loyalty_redeem_store_item(uuid) to authenticated;
