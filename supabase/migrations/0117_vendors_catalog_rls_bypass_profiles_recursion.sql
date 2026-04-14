-- Fix "infinite recursion detected in policy for relation vendors" (and broken anon catalog reads).
--
-- 1) Policies like `vendors_admin_select` still used `exists (select 1 from public.profiles ...)`.
--    Evaluating them during a `vendors` (or nested `vendors`) SELECT re-enters `profiles` RLS and can loop.
--    Use `auth_profiles_role_is_admin()` from 0116 (SECURITY DEFINER, row_security off).
--
-- 2) `products_public_select` and `vendor_locations_public_select` subquery `public.vendors` under RLS,
--    which re-triggers all `vendors` policies. Use `vendor_is_publicly_visible(uuid)` (row_security off).

-- ---------------------------------------------------------------------------
-- Role helpers (mirror 0116 admin pattern)
-- ---------------------------------------------------------------------------

create or replace function public.auth_profiles_role_is_vendor()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'vendor'
    ),
    false
  );
$$;

revoke all on function public.auth_profiles_role_is_vendor() from public;
grant execute on function public.auth_profiles_role_is_vendor() to anon, authenticated, service_role;

create or replace function public.auth_profiles_role_is_consumer()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'consumer'
    ),
    false
  );
$$;

revoke all on function public.auth_profiles_role_is_consumer() from public;
grant execute on function public.auth_profiles_role_is_consumer() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Approved + live vendor row (for policies on products, vendor_locations, etc.)
-- ---------------------------------------------------------------------------

create or replace function public.vendor_is_publicly_visible(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.vendors v
    where v.id = p_vendor_id
      and coalesce(v.is_live, false) = true
      and coalesce(v.license_status, '') = 'approved'
  );
$$;

revoke all on function public.vendor_is_publicly_visible(uuid) from public;
grant execute on function public.vendor_is_publicly_visible(uuid) to anon, authenticated, service_role;

comment on function public.vendor_is_publicly_visible(uuid) is
  'True when vendor is live + license approved; row_security=off so nested policies (products, locations) do not recurse on vendors RLS.';

-- ---------------------------------------------------------------------------
-- vendors (0001 policies never dropped)
-- ---------------------------------------------------------------------------

drop policy if exists vendors_admin_select on public.vendors;
create policy vendors_admin_select
  on public.vendors for select
  using (public.auth_profiles_role_is_admin());

drop policy if exists vendors_admin_all on public.vendors;
create policy vendors_admin_all
  on public.vendors for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

-- Applicant flows (0015): consumer role check without re-entrant profiles read
drop policy if exists vendors_consumer_insert_application on public.vendors;
create policy vendors_consumer_insert_application
  on public.vendors for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and license_status = 'pending'
    and is_live = false
    and verified = false
    and public.auth_profiles_role_is_consumer()
    and not exists (
      select 1 from public.vendors v2 where v2.user_id = auth.uid()
    )
  );

drop policy if exists vendors_consumer_update_application on public.vendors;
create policy vendors_consumer_update_application
  on public.vendors for update
  using (
    user_id = auth.uid()
    and public.auth_profiles_role_is_consumer()
    and license_status in ('pending', 'needs_review', 'rejected')
    and is_live = false
  )
  with check (
    user_id = auth.uid()
    and license_status in ('pending', 'needs_review', 'rejected')
    and is_live = false
    and verified = false
  );

-- ---------------------------------------------------------------------------
-- products + vendor_locations: nested vendors subquery
-- ---------------------------------------------------------------------------

drop policy if exists products_public_select on public.products;
create policy products_public_select
  on public.products for select
  using (
    in_stock = true
    and public.vendor_is_publicly_visible(vendor_id)
  );

drop policy if exists vendor_locations_public_select on public.vendor_locations;
create policy vendor_locations_public_select
  on public.vendor_locations for select
  using (public.vendor_is_publicly_visible(vendor_id));

-- ---------------------------------------------------------------------------
-- vendor_market_listings admin policy (0028): FOR ALL includes SELECT — inline profiles broke anon reads
-- ---------------------------------------------------------------------------

drop policy if exists vendor_market_listings_admin_all on public.vendor_market_listings;
create policy vendor_market_listings_admin_all
  on public.vendor_market_listings for all
  using (
    public.auth_profiles_role_is_admin()
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  )
  with check (
    public.auth_profiles_role_is_admin()
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  );

-- ---------------------------------------------------------------------------
-- Align vendor_market_operations admin helper: profiles branch via same helper (row_security off inside)
-- ---------------------------------------------------------------------------

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
    or public.auth_profiles_role_is_admin();
$$;

comment on function public.auth_may_admin_vendor_market_operations() is
  'Master admin JWT email OR profiles.role = admin via auth_profiles_role_is_admin() (no inline profiles in policies).';

revoke all on function public.auth_may_admin_vendor_market_operations() from public;
grant execute on function public.auth_may_admin_vendor_market_operations() to authenticated;

-- ---------------------------------------------------------------------------
-- vendor_locations + deals + reviews: nested vendors / profiles in SELECT policies
-- ---------------------------------------------------------------------------

drop policy if exists vendor_locations_admin_all on public.vendor_locations;
create policy vendor_locations_admin_all
  on public.vendor_locations for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists deals_public_select on public.deals;
create policy deals_public_select
  on public.deals for select
  using (
    public.vendor_is_publicly_visible(vendor_id)
    and current_date >= start_date
    and current_date <= end_date
  );

drop policy if exists deals_admin_all on public.deals;
create policy deals_admin_all
  on public.deals for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select
  on public.reviews for select
  using (
    reviewer_id = auth.uid()
    or (
      entity_type = 'strain'
      and exists (select 1 from public.strains s where s.id = entity_id)
    )
    or (
      entity_type = 'product'
      and exists (
        select 1
        from public.products p
        where p.id = entity_id
          and public.vendor_is_publicly_visible(p.vendor_id)
      )
    )
    or (
      entity_type = 'vendor'
      and public.vendor_is_publicly_visible(entity_id)
    )
  );

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all
  on public.reviews for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());
