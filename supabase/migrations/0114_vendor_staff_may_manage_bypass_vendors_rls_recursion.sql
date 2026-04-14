-- Fix Postgres "infinite recursion detected in policy for relation vendors".
-- `vendor_staff_may_manage()` SELECTs `public.vendors` while `vendors_select_if_owner`
-- calls `vendor_staff_may_manage(id)`, causing re-entrant RLS evaluation.
-- Same pattern as 0076 (`auth_is_profile_admin`): SECURITY DEFINER + `row_security = off`.

create or replace function public.vendor_staff_may_manage(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    coalesce(
      exists (
        select 1
        from public.vendors v
        where v.id = p_vendor_id
          and v.user_id is not null
          and v.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.vendor_team_members m
        where m.vendor_id = p_vendor_id
          and m.user_id = auth.uid()
      ),
      false
    );
$$;

revoke all on function public.vendor_staff_may_manage(uuid) from public;
grant execute on function public.vendor_staff_may_manage(uuid) to authenticated;

comment on function public.vendor_staff_may_manage(uuid) is
  'True when auth user owns the vendor row or is a manager in vendor_team_members. row_security=off avoids RLS recursion on vendors.';

-- Also reads `vendors` from policies; keep consistent.
create or replace function public.auth_has_any_vendor_access()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    auth.uid() is not null
    and (
      exists (select 1 from public.vendors v where v.user_id = auth.uid())
      or exists (
        select 1 from public.vendor_team_members m where m.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.auth_has_any_vendor_access() from public;
grant execute on function public.auth_has_any_vendor_access() to authenticated;
