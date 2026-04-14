-- Admin status updates on vendor_upgrade_requests: bypass RLS so master + admin + admin_jr
-- can mark seen / closed / approved without hitting "new row violates row-level security policy".

create or replace function public.admin_set_vendor_upgrade_request_status(
  p_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;

  if p_status is null or p_status not in ('new', 'seen', 'closed', 'approved') then
    raise exception 'invalid vendor upgrade request status';
  end if;

  update public.vendor_upgrade_requests
  set status = p_status
  where id = p_id;

  if not found then
    raise exception 'upgrade request not found';
  end if;
end;
$$;

revoke all on function public.admin_set_vendor_upgrade_request_status(uuid, text) from public;
grant execute on function public.admin_set_vendor_upgrade_request_status(uuid, text) to authenticated, service_role;

comment on function public.admin_set_vendor_upgrade_request_status(uuid, text) is
  'Admin-only: set vendor_upgrade_requests.status (RLS-safe). Requires 0153 for approved.';
