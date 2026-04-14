-- Deal scheduling: days of week + daily time windows (happy hour, etc).
--
-- Conventions:
-- - active_days: array of Postgres EXTRACT(DOW) ints (0=Sun ... 6=Sat)
-- - daily_start_time / daily_end_time: local clock times in America/Los_Angeles
-- - null / empty active_days means "all days"
-- - null times (or equal times) means "all day"
-- - end < start means the window spans midnight (e.g. 22:00 → 02:00)

alter table public.deals
  add column if not exists active_days smallint[],
  add column if not exists daily_start_time time,
  add column if not exists daily_end_time time;

create or replace function public.deal_is_live_now(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_active_days smallint[],
  p_daily_start time,
  p_daily_end time
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  now_la timestamp without time zone;
  dow smallint;
  tod time;
begin
  if p_starts_at is null or p_ends_at is null then
    return false;
  end if;

  if now() < p_starts_at or now() > p_ends_at then
    return false;
  end if;

  now_la := now() at time zone 'America/Los_Angeles';
  dow := extract(dow from now_la)::smallint;
  tod := now_la::time;

  if p_active_days is not null and cardinality(p_active_days) > 0 then
    if not (dow = any (p_active_days)) then
      return false;
    end if;
  end if;

  -- all-day if times not set (or equal).
  if p_daily_start is null or p_daily_end is null or p_daily_start = p_daily_end then
    return true;
  end if;

  if p_daily_start < p_daily_end then
    return tod >= p_daily_start and tod <= p_daily_end;
  end if;

  -- spans midnight: e.g. 22:00 → 02:00
  return (tod >= p_daily_start) or (tod <= p_daily_end);
end;
$$;

revoke all on function public.deal_is_live_now(timestamptz, timestamptz, smallint[], time, time) from public;
grant execute on function public.deal_is_live_now(timestamptz, timestamptz, smallint[], time, time) to anon, authenticated, service_role;

-- Update shopper visibility policy to include day/time windows.
drop policy if exists deals_public_select on public.deals;
create policy deals_public_select
  on public.deals for select
  using (
    public.vendor_is_publicly_visible(vendor_id)
    and public.deal_is_live_now(starts_at, ends_at, active_days, daily_start_time, daily_end_time)
  );

