-- Optional clock times on top of calendar dates (Pacific). Null times = full calendar days
-- (same bounds as deal_la_calendar_bounds). Used by vendor deal UI: dates always, times when enabled.

create or replace function public.deal_la_schedule_bounds(
  p_start_date date,
  p_end_date date,
  p_start_time time default null,
  p_end_time time default null
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    (
      (p_start_date + coalesce(p_start_time, time '00:00:00'))::timestamp without time zone
      at time zone 'America/Los_Angeles'
    )::timestamptz,
    (
      case
        when p_end_time is null then
          (
            ((p_end_date + interval '1 day')::timestamp without time zone at time zone 'America/Los_Angeles')
            - interval '1 second'
          )::timestamptz
        else
          (
            (p_end_date + p_end_time)::timestamp without time zone
            at time zone 'America/Los_Angeles'
          )::timestamptz
      end
    )::timestamptz;
$$;

revoke all on function public.deal_la_schedule_bounds(date, date, time, time) from public;
grant execute on function public.deal_la_schedule_bounds(date, date, time, time) to authenticated, service_role;

comment on function public.deal_la_schedule_bounds(date, date, time, time) is
  'Deal window in America/Los_Angeles: required calendar dates; optional start/end clock times (null = start-of-day / end-of-day on those dates).';
