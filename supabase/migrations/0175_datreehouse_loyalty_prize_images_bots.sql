-- Prize photos (admin); shopper-facing RPC; neutral bot display names + subtitles.

alter table public.datreehouse_monthly_prizes
  add column if not exists image_url text;

comment on column public.datreehouse_monthly_prizes.image_url is
  'Optional public URL for a prize image (admin-managed).';

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
        'description', p.description,
        'image_url', p.image_url
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

-- Neutral display handles (no platform branding); safe to re-run.
update public.datreehouse_loyalty_bots
set display_username = 'RedwoodRiley'
where id = '11111111-1111-4111-8111-111111111101';

update public.datreehouse_loyalty_bots
set display_username = 'TidalWave_44'
where id = '11111111-1111-4111-8111-111111111102';

update public.datreehouse_loyalty_bots
set display_username = 'pingNova'
where id = '11111111-1111-4111-8111-111111111103';
