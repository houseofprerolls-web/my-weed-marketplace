-- Admin-only: shopper loyalty totals per month (points + order spend linked to credited orders).

create or replace function public.datreehouse_loyalty_admin_leaderboard(
  p_year int,
  p_month int,
  p_limit int default 150
)
returns table(
  consumer_id uuid,
  email text,
  username text,
  points_month bigint,
  spend_cents_month bigint,
  orders_credited bigint
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_ms timestamptz;
  v_me timestamptz;
  lim int := least(greatest(coalesce(p_limit, 150), 1), 500);
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_month < 1 or p_month > 12 or p_year < 2020 or p_year > 2100 then
    raise exception 'invalid month' using errcode = '22003';
  end if;

  v_ms := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_me := v_ms + interval '1 month';

  return query
  select
    x.consumer_id,
    coalesce(p.email::text, '') as email,
    coalesce(nullif(trim(up.username::text), ''), '') as username,
    x.points_month,
    x.spend_cents_month,
    x.orders_credited
  from (
    select
      l.consumer_id,
      sum(l.points)::bigint as points_month,
      sum(coalesce(o.subtotal_cents, o.total_cents, 0))::bigint as spend_cents_month,
      count(distinct l.order_id)::bigint as orders_credited
    from public.datreehouse_loyalty_ledger l
    left join public.orders o on o.id = l.order_id
    where l.created_at >= v_ms
      and l.created_at < v_me
    group by l.consumer_id
  ) x
  inner join public.profiles p on p.id = x.consumer_id
  left join public.user_profiles up on up.id = x.consumer_id
  order by x.points_month desc, x.spend_cents_month desc
  limit lim;
end;
$$;

revoke all on function public.datreehouse_loyalty_admin_leaderboard(int, int, int) from public;
grant execute on function public.datreehouse_loyalty_admin_leaderboard(int, int, int) to authenticated;

comment on function public.datreehouse_loyalty_admin_leaderboard(int, int, int) is
  'Admin: per-consumer loyalty points and order subtotals for a UTC calendar month.';
