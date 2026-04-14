-- Undo the temporary `service_role` bypass on vendor deletes (if it was applied outside migrations).
-- Restores behavior from migration 0071_vendor_team_invitations_staff_rls.sql.

create or replace function public.vendors_guard_delete_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_is_profile_admin() then
    return old;
  end if;
  if old.user_id is not null and old.user_id = auth.uid() then
    return old;
  end if;
  raise exception 'only the store owner or an admin can delete this vendor';
end;
$$;
