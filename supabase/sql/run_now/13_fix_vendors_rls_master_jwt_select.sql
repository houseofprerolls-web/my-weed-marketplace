-- Quick apply for `0029_vendors_rls_master_jwt_select.sql`.

drop policy if exists vendors_admin_select_master_jwt on public.vendors;

create policy vendors_admin_select_master_jwt
  on public.vendors for select
  using (
    lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  );

