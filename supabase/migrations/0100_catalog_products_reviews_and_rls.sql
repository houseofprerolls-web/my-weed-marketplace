-- Review stats on master catalog rows + RLS so vendor owners/managers (not only profiles.role) can read.

alter table public.catalog_products
  add column if not exists avg_rating numeric(4, 2),
  add column if not exists review_count integer not null default 0;

comment on column public.catalog_products.avg_rating is 'Average rating from source data (e.g. Weedmaps) at import time.';
comment on column public.catalog_products.review_count is 'Review count from source data at import time.';

-- Replace narrow policy (profiles.role vendor/admin only) with vendor shell access.
drop policy if exists catalog_products_vendor_admin_select on public.catalog_products;
drop policy if exists catalog_products_vendor_dashboard_select on public.catalog_products;

create policy catalog_products_vendor_dashboard_select
  on public.catalog_products for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      where b.id = catalog_products.brand_id
        and b.verified = true
    )
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('vendor', 'admin')
      )
      or exists (
        select 1
        from public.vendors v
        where v.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.vendor_team_members m
        where m.user_id = auth.uid()
      )
    )
  );
