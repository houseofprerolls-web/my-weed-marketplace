-- PostgREST can reject RPCs whose body is `DELETE FROM t` with no WHERE; use TRUNCATE CASCADE instead.

create or replace function public.outreach_clear_all_contacts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.outreach_contacts cascade;
end;
$$;

revoke all on function public.outreach_clear_all_contacts() from public;
grant execute on function public.outreach_clear_all_contacts() to service_role;

comment on function public.outreach_clear_all_contacts() is 'Truncates outreach_contacts (cascades outreach_sends).';
