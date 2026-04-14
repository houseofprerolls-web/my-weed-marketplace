-- Allow master admin by JWT email (matches greenzone-bolt/lib/admin.ts) even if profiles.role
-- was never set to admin — fixes Areas toggles + loading pending rows for vendor_market_operations.

drop policy if exists vendor_market_operations_admin_all on public.vendor_market_operations;

create policy vendor_market_operations_admin_all
  on public.vendor_market_operations for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  );

-- Idempotent: ensure master account has profiles.role = admin when profile exists
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'));
