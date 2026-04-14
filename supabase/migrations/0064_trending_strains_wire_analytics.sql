-- If 0062 installed a stub because analytics_events was missing, this replaces it once the table exists.
-- Safe to run when analytics_events is still missing (no-op with notice).

do $mig$
begin
  if to_regclass('public.analytics_events') is null then
    raise notice '0064: public.analytics_events missing — trending_strain_slugs unchanged';
    return;
  end if;

  execute
    'create index if not exists idx_analytics_strain_page_views on public.analytics_events (created_at desc) where event_type = ''strain_page_view''';

  execute $real$
    create or replace function public.trending_strain_slugs(p_limit int default 6, p_days int default 30)
    returns table (strain_slug text, view_count bigint)
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select
        t.strain_slug,
        t.view_count
      from (
        select
          btrim(ae.metadata->>'strain_slug') as strain_slug,
          count(*)::bigint as view_count
        from public.analytics_events ae
        where ae.event_type = 'strain_page_view'
          and ae.created_at >= now() - (
            greatest(1, least(coalesce(p_days, 30), 365)) * interval '1 day'
          )
          and length(btrim(coalesce(ae.metadata->>'strain_slug', ''))) > 0
        group by btrim(ae.metadata->>'strain_slug')
        order by view_count desc
        limit greatest(1, least(coalesce(p_limit, 6), 50))
      ) t
      where length(t.strain_slug) > 0;
    $fn$;
  $real$;

  comment on function public.trending_strain_slugs(int, int) is
    'Top strain slugs by strain_page_view events in the last p_days; safe for anon RPC.';

  execute 'grant execute on function public.trending_strain_slugs(int, int) to anon';
  execute 'grant execute on function public.trending_strain_slugs(int, int) to authenticated';
end;
$mig$;
