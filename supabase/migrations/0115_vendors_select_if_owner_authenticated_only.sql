-- Anonymous catalog reads use `vendors_public_select` only. The owner/staff policy used to apply
-- to all roles, so anon PostgREST requests still evaluated `vendor_staff_may_manage(id)` on `vendors`,
-- which queried `vendors` again under RLS and could recurse. Scope this policy to `authenticated`.

drop policy if exists vendors_select_if_owner on public.vendors;
create policy vendors_select_if_owner
  on public.vendors for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.vendor_staff_may_manage(id)
  );
