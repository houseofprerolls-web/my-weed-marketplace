-- Da Treehouse shopper loyalty: 1 point per $1 on completed orders (monthly leaderboard + prizes).
-- Bots get dynamic points so they always sit in the top 3; prizes apply to top 3 humans only.

-- ---------------------------------------------------------------------------
-- Ledger (one row per completed order)
-- ---------------------------------------------------------------------------
create table if not exists public.datreehouse_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references auth.users (id) on delete cascade,
  points bigint not null check (points > 0),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists datreehouse_loyalty_ledger_order_uidx
  on public.datreehouse_loyalty_ledger (order_id)
  where order_id is not null;

create index if not exists datreehouse_loyalty_ledger_consumer_month_idx
  on public.datreehouse_loyalty_ledger (consumer_id, created_at desc);

alter table public.datreehouse_loyalty_ledger enable row level security;

drop policy if exists datreehouse_loyalty_ledger_own_select on public.datreehouse_loyalty_ledger;
create policy datreehouse_loyalty_ledger_own_select
  on public.datreehouse_loyalty_ledger for select
  to authenticated
  using (consumer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Monthly prizes (admin-managed; public read via RPC)
-- ---------------------------------------------------------------------------
create table if not exists public.datreehouse_monthly_prizes (
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  prize_rank smallint not null check (prize_rank between 1 and 3),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (month_start, prize_rank)
);

create index if not exists datreehouse_monthly_prizes_month_idx
  on public.datreehouse_monthly_prizes (month_start desc);

alter table public.datreehouse_monthly_prizes enable row level security;

drop policy if exists datreehouse_monthly_prizes_admin_all on public.datreehouse_monthly_prizes;
create policy datreehouse_monthly_prizes_admin_all
  on public.datreehouse_monthly_prizes for all
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

-- ---------------------------------------------------------------------------
-- Bot display profiles (no auth users — merged in leaderboard RPC)
-- ---------------------------------------------------------------------------
create table if not exists public.datreehouse_loyalty_bots (
  id uuid primary key default gen_random_uuid(),
  display_username text not null,
  avatar_url text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Award points (idempotent per order)
-- ---------------------------------------------------------------------------
create or replace function public.award_datreehouse_loyalty_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  o record;
  cents bigint;
  pts bigint;
begin
  select
    id,
    consumer_id,
    status,
    coalesce(nullif(subtotal_cents, 0), total_cents, 0)::bigint as spend_cents
  into o
  from public.orders
  where id = p_order_id;

  if not found then
    return;
  end if;

  if o.consumer_id is null then
    return;
  end if;
  if o.status is distinct from 'completed' then
    return;
  end if;

  if exists (select 1 from public.datreehouse_loyalty_ledger where order_id = p_order_id) then
    return;
  end if;

  cents := greatest(coalesce(o.spend_cents, 0), 0);
  if cents <= 0 then
    return;
  end if;

  pts := cents / 100;
  if pts <= 0 then
    return;
  end if;

  insert into public.datreehouse_loyalty_ledger (consumer_id, points, order_id)
  values (o.consumer_id, pts, p_order_id);
exception
  when unique_violation then
    null;
end;
$$;

revoke all on function public.award_datreehouse_loyalty_for_order(uuid) from public;
grant execute on function public.award_datreehouse_loyalty_for_order(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: completed orders → points
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_datreehouse_loyalty_fn()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.status = 'completed' and (tg_op = 'insert' or old.status is distinct from 'completed') then
    perform public.award_datreehouse_loyalty_for_order(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_datreehouse_loyalty on public.orders;
create trigger trg_orders_datreehouse_loyalty
  after insert or update of status on public.orders
  for each row
  execute function public.trg_orders_datreehouse_loyalty_fn();

-- ---------------------------------------------------------------------------
-- Helpers: UTC month bounds
-- ---------------------------------------------------------------------------
create or replace function public._datreehouse_month_bounds_utc()
returns table(month_start_ts timestamptz, month_end_ts timestamptz)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    date_trunc('month', timezone('utc', now())),
    date_trunc('month', timezone('utc', now())) + interval '1 month';
$$;

revoke all on function public._datreehouse_month_bounds_utc() from public;

-- ---------------------------------------------------------------------------
-- My points this calendar month (UTC)
-- ---------------------------------------------------------------------------
create or replace function public.datreehouse_my_loyalty_month_points()
returns bigint
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  ms_ts timestamptz;
  me_ts timestamptz;
  uid uuid := auth.uid();
  total bigint;
begin
  if uid is null then
    return 0;
  end if;
  select b.month_start_ts, b.month_end_ts into ms_ts, me_ts from public._datreehouse_month_bounds_utc() b;
  select coalesce(sum(l.points), 0)::bigint into total
  from public.datreehouse_loyalty_ledger l
  where l.consumer_id = uid
    and l.created_at >= ms_ts
    and l.created_at < me_ts;
  return total;
end;
$$;

revoke all on function public.datreehouse_my_loyalty_month_points() from public;
grant execute on function public.datreehouse_my_loyalty_month_points() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public prizes for current month
-- ---------------------------------------------------------------------------
create or replace function public.datreehouse_monthly_prizes_public()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  ms date;
  rows jsonb;
begin
  select (b.month_start_ts)::date into ms from public._datreehouse_month_bounds_utc() b;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', p.prize_rank,
        'title', p.title,
        'description', p.description
      )
      order by p.prize_rank
    ),
    '[]'::jsonb
  )
  into rows
  from public.datreehouse_monthly_prizes p
  where p.month_start = ms;

  return jsonb_build_object(
    'month_start', ms,
    'prizes', rows
  );
end;
$$;

revoke all on function public.datreehouse_monthly_prizes_public() from public;
grant execute on function public.datreehouse_monthly_prizes_public() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leaderboard: bots (dynamic top-3) + humans; prize_eligible_rank 1–3 for humans only
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
    select least(50, greatest(5, coalesce(p_limit, 20)))::int as n
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

revoke all on function public.datreehouse_loyalty_leaderboard_public(int) from public;
grant execute on function public.datreehouse_loyalty_leaderboard_public(int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed bots + sample prizes (current UTC month)
-- ---------------------------------------------------------------------------
insert into public.datreehouse_loyalty_bots (id, display_username, sort_order)
values
  ('11111111-1111-4111-8111-111111111101', 'RedwoodRiley', 1),
  ('11111111-1111-4111-8111-111111111102', 'TidalWave_44', 2),
  ('11111111-1111-4111-8111-111111111103', 'pingNova', 3)
on conflict (id) do nothing;

insert into public.datreehouse_monthly_prizes (month_start, prize_rank, title, description)
select
  (date_trunc('month', timezone('utc', now())))::date,
  v.rank,
  v.title,
  v.descr
from (values
  (1, '1st place — Da Treehouse bundle', 'Curated merch box + $100 site credit (details emailed to winner).'),
  (2, '2nd place — Store credit', '$60 Da Treehouse marketplace credit.'),
  (3, '3rd place — Goodie pack', 'Limited accessories + free delivery on your next order.')
) as v(rank, title, descr)
on conflict (month_start, prize_rank) do nothing;

comment on table public.datreehouse_loyalty_ledger is
  'Shopper loyalty: points from completed orders (1 pt per $1 subtotal/total).';
comment on function public.datreehouse_loyalty_leaderboard_public(int) is
  'Public leaderboard for current UTC month; bots occupy dynamic top scores; prize_eligible_rank is for humans only.';
