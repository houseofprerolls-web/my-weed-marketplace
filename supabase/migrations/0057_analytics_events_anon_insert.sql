-- Homepage shoppers are often logged out; Smokers Club tree metrics need inserts from anon clients.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'analytics_events'
  ) then
    execute 'drop policy if exists "anon insert analytics events" on public.analytics_events';
    execute $p$
      create policy "anon insert analytics events"
        on public.analytics_events
        for insert
        to anon
        with check (true)
    $p$;
  end if;
end
$$;
