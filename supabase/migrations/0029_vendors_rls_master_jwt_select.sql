-- Allow master admin by JWT email to SELECT from `public.vendors`,
-- even when `public.profiles.role` has not been set to `admin`.
-- This is needed for admin slot pickers that list live vendors before license-status / market approval.

drop policy if exists vendors_admin_select_master_jwt on public.vendors;

create policy vendors_admin_select_master_jwt
  on public.vendors for select
  using (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  );

