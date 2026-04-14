-- Tree engagement for Smokers Club ranking. Uses analytics_events when present; otherwise installs a no-op stub
-- (zero rows → app keeps tree engagement points at 0 until analytics exists).

do $migration$
begin
  if to_regclass('public.analytics_events') is not null then
    execute $real$
    create or replace function public.smokers_club_tree_engagement_for_vendors(
      p_vendor_ids uuid[],
      p_since timestamptz
    )
    returns table (
      vendor_id uuid,
      impressions bigint,
      clicks bigint
    )
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select
        ae.vendor_id,
        count(*) filter (where ae.event_type = 'smokers_club_tree_impression')::bigint as impressions,
        count(*) filter (where ae.event_type = 'smokers_club_tree_click')::bigint as clicks
      from public.analytics_events ae
      where ae.vendor_id = any(p_vendor_ids)
        and ae.created_at >= p_since
        and ae.event_type in ('smokers_club_tree_impression', 'smokers_club_tree_click')
      group by ae.vendor_id;
    $fn$;
    $real$;
  else
    execute $stub$
    create or replace function public.smokers_club_tree_engagement_for_vendors(
      p_vendor_ids uuid[],
      p_since timestamptz
    )
    returns table (
      vendor_id uuid,
      impressions bigint,
      clicks bigint
    )
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select null::uuid, null::bigint, null::bigint
      where false;
    $fn$;
    $stub$;
    raise notice '0108: public.analytics_events missing — smokers_club_tree_engagement_for_vendors installed as no-op stub. Recreate after analytics_events exists: drop function + re-run or replace with real aggregate.';
  end if;
end $migration$;

comment on function public.smokers_club_tree_engagement_for_vendors(uuid[], timestamptz) is
  'Tree card impressions/clicks since p_since for Smokers Club ranking (SECURITY DEFINER). No-op stub if analytics_events was missing when 0108 ran.';

grant execute on function public.smokers_club_tree_engagement_for_vendors(uuid[], timestamptz) to anon;
grant execute on function public.smokers_club_tree_engagement_for_vendors(uuid[], timestamptz) to authenticated;
grant execute on function public.smokers_club_tree_engagement_for_vendors(uuid[], timestamptz) to service_role;
