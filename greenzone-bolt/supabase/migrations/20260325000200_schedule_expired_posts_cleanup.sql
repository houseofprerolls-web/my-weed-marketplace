/*
  # Cleanup expired feed posts

  Creates a cleanup function and (when available) schedules it via pg_cron.
  If pg_cron isn't available in the target Supabase project, the function still exists
  and can be scheduled via Supabase Scheduled Jobs / external runner.
*/

create or replace function public.cleanup_expired_posts(p_limit int default 500)
returns int
language plpgsql
security definer
as $$
declare
  v_deleted int := 0;
begin
  with doomed as (
    select id
    from public.posts
    where expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit greatest(p_limit, 0)
  ),
  del as (
    delete from public.posts
    where id in (select id from doomed)
    returning 1
  )
  select count(*)::int into v_deleted from del;

  return v_deleted;
end;
$$;

comment on function public.cleanup_expired_posts(int) is
  'Deletes expired posts (expires_at <= now()) in small batches. Cascades to likes/comments via FK.';

-- Try to schedule hourly via pg_cron if available.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    -- Extension not available in this environment.
    return;
  end;

  -- Schedule: run every hour
  if exists (select 1 from pg_catalog.pg_class where relname = 'job' and relnamespace = 'cron'::regnamespace) then
    if not exists (select 1 from cron.job where jobname = 'cleanup_expired_posts_hourly') then
      perform cron.schedule(
        'cleanup_expired_posts_hourly',
        '0 * * * *',
        $$select public.cleanup_expired_posts(2000);$$
      );
    end if;
  end if;
end
$$;

