drop policy if exists vendor_market_listings_admin_all on public.vendor_market_listings;

create policy vendor_market_listings_admin_all
  on public.vendor_market_listings for all
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
