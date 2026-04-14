-- Admin "Operating areas" toggles on vendor_market_operations were failing with
-- "permission denied" when JWT email claims differ from auth.users, or when the
-- inline profiles subquery in RLS behaved unexpectedly. Use one SECURITY DEFINER
-- check (row_security off) aligned with app useRole: master admin email OR profiles.role = admin.

create or replace function public.auth_may_admin_vendor_market_operations()
returns boolean
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select
    exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.email, ''))) = lower(trim('houseofprerolls@gmail.com'))
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
$$;

comment on function public.auth_may_admin_vendor_market_operations() is
  'True when the current user may INSERT/UPDATE/DELETE vendor_market_operations (admin UI Areas toggles).';

revoke all on function public.auth_may_admin_vendor_market_operations() from public;
grant execute on function public.auth_may_admin_vendor_market_operations() to authenticated;

drop policy if exists vendor_market_operations_admin_all on public.vendor_market_operations;

create policy vendor_market_operations_admin_all
  on public.vendor_market_operations for all
  using (public.auth_may_admin_vendor_market_operations())
  with check (public.auth_may_admin_vendor_market_operations());
