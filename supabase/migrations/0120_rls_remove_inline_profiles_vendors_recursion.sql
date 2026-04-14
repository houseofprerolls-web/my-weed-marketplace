-- Consolidated fix: remaining RLS policies still used `exists (select 1 from public.profiles ...)`
-- or nested `exists (select 1 from public.vendors ...)` under table RLS. Those subqueries run with
-- the invoker's row security and re-enter policies (profiles <-> orders, vendors <-> vendors, etc.).
--
-- Pattern: use public.auth_profiles_role_is_admin(), public.auth_is_profile_admin() (master JWT),
-- public.vendor_staff_may_manage(), public.vendor_is_publicly_visible() — all SECURITY DEFINER + row_security off.
--
-- Requires: 0116 (auth_profiles_role_is_admin), 0078+ (auth_is_profile_admin), 0114 (vendor_staff_may_manage),
--           0117 (vendor_is_publicly_visible).

-- ---------------------------------------------------------------------------
-- Helper: Smokers Club banner submit (avoid nested vendors SELECT in WITH CHECK)
-- ---------------------------------------------------------------------------

create or replace function public.vendor_smokers_club_banner_submit_ok(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select coalesce(v.smokers_club_eligible, false)
      from public.vendors v
      where v.id = p_vendor_id
    ),
    false
  )
  and public.vendor_staff_may_manage(p_vendor_id);
$$;

revoke all on function public.vendor_smokers_club_banner_submit_ok(uuid) from public;
grant execute on function public.vendor_smokers_club_banner_submit_ok(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Standard admin expression (platform role + master JWT, no profiles subquery)
-- ---------------------------------------------------------------------------
-- In policies use: (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())

-- ---------------------------------------------------------------------------
-- vendor_hours
-- ---------------------------------------------------------------------------

do $vh$
begin
  if to_regclass('public.vendor_hours') is null then
    return;
  end if;

  drop policy if exists vendor_hours_admin_all on public.vendor_hours;
  create policy vendor_hours_admin_all
    on public.vendor_hours for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists vendor_hours_public_select on public.vendor_hours;
  create policy vendor_hours_public_select
    on public.vendor_hours for select
    using (public.vendor_is_publicly_visible(vendor_id));
end
$vh$;

-- ---------------------------------------------------------------------------
-- listing_markets + market_zip_prefixes (admin still had inline profiles)
-- ---------------------------------------------------------------------------

do $lm$
begin
  if to_regclass('public.listing_markets') is null or to_regclass('public.market_zip_prefixes') is null then
    return;
  end if;

  drop policy if exists listing_markets_admin_all on public.listing_markets;
  create policy listing_markets_admin_all
    on public.listing_markets for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists market_zip_prefixes_admin_all on public.market_zip_prefixes;
  create policy market_zip_prefixes_admin_all
    on public.market_zip_prefixes for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$lm$;

-- ---------------------------------------------------------------------------
-- smokers_club_homepage_banners
-- ---------------------------------------------------------------------------

do $scb$
begin
  if to_regclass('public.smokers_club_homepage_banners') is null then
    return;
  end if;

  drop policy if exists smokers_club_banners_admin_all on public.smokers_club_homepage_banners;
  create policy smokers_club_banners_admin_all
    on public.smokers_club_homepage_banners for all
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists smokers_club_banners_vendor_select_own on public.smokers_club_homepage_banners;
  create policy smokers_club_banners_vendor_select_own
    on public.smokers_club_homepage_banners for select
    to authenticated
    using (
      vendor_id is not null
      and public.vendor_staff_may_manage(vendor_id)
    );

  drop policy if exists smokers_club_banners_vendor_insert on public.smokers_club_homepage_banners;
  create policy smokers_club_banners_vendor_insert
    on public.smokers_club_homepage_banners for insert
    to authenticated
    with check (
      status = 'pending'
      and vendor_id is not null
      and public.vendor_smokers_club_banner_submit_ok(vendor_id)
    );

  drop policy if exists smokers_club_banners_vendor_delete_pending on public.smokers_club_homepage_banners;
  create policy smokers_club_banners_vendor_delete_pending
    on public.smokers_club_homepage_banners for delete
    to authenticated
    using (
      status = 'pending'
      and vendor_id is not null
      and public.vendor_staff_may_manage(vendor_id)
    );
end
$scb$;

-- ---------------------------------------------------------------------------
-- vendor_lead_applications
-- ---------------------------------------------------------------------------

do $vla$
begin
  if to_regclass('public.vendor_lead_applications') is null then
    return;
  end if;

  drop policy if exists vendor_lead_applications_admin_select on public.vendor_lead_applications;
  create policy vendor_lead_applications_admin_select
    on public.vendor_lead_applications for select
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists vendor_lead_applications_admin_update on public.vendor_lead_applications;
  create policy vendor_lead_applications_admin_update
    on public.vendor_lead_applications for update
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$vla$;

-- ---------------------------------------------------------------------------
-- vendor_upgrade_requests
-- ---------------------------------------------------------------------------

do $vur$
begin
  if to_regclass('public.vendor_upgrade_requests') is null then
    return;
  end if;

  drop policy if exists vendor_upgrade_requests_insert_own on public.vendor_upgrade_requests;
  create policy vendor_upgrade_requests_insert_own
    on public.vendor_upgrade_requests for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and vendor_id is not null
      and public.vendor_staff_may_manage(vendor_id)
    );

  drop policy if exists vendor_upgrade_requests_admin_select on public.vendor_upgrade_requests;
  create policy vendor_upgrade_requests_admin_select
    on public.vendor_upgrade_requests for select
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists vendor_upgrade_requests_admin_update on public.vendor_upgrade_requests;
  create policy vendor_upgrade_requests_admin_update
    on public.vendor_upgrade_requests for update
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$vur$;

do $rvr$
begin
  if to_regclass('public.review_vendor_reports') is null then
    return;
  end if;

  drop policy if exists review_vendor_reports_vendor_insert on public.review_vendor_reports;
  create policy review_vendor_reports_vendor_insert
    on public.review_vendor_reports for insert
    to authenticated
    with check (
      public.vendor_staff_may_manage(vendor_id)
      and exists (
        select 1
        from public.reviews r
        where r.id = review_id
          and r.entity_type = 'vendor'
          and r.entity_id = vendor_id
      )
    );

  drop policy if exists review_vendor_reports_vendor_select on public.review_vendor_reports;
  create policy review_vendor_reports_vendor_select
    on public.review_vendor_reports for select
    to authenticated
    using (public.vendor_staff_may_manage(vendor_id));

  drop policy if exists review_vendor_reports_admin_select on public.review_vendor_reports;
  create policy review_vendor_reports_admin_select
    on public.review_vendor_reports for select
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists review_vendor_reports_admin_update on public.review_vendor_reports;
  create policy review_vendor_reports_admin_update
    on public.review_vendor_reports for update
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$rvr$;

-- ---------------------------------------------------------------------------
-- business_inquiries
-- ---------------------------------------------------------------------------

do $bi$
begin
  if to_regclass('public.business_inquiries') is null then
    return;
  end if;

  drop policy if exists business_inquiries_admin_select on public.business_inquiries;
  create policy business_inquiries_admin_select
    on public.business_inquiries for select
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists business_inquiries_admin_update on public.business_inquiries;
  create policy business_inquiries_admin_update
    on public.business_inquiries for update
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

  drop policy if exists business_inquiries_admin_delete on public.business_inquiries;
  create policy business_inquiries_admin_delete
    on public.business_inquiries for delete
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$bi$;

-- ---------------------------------------------------------------------------
-- product_unit_costs (admin branch still had inline profiles after 0071 vendor policy)
-- ---------------------------------------------------------------------------

do $puc$
begin
  if to_regclass('public.product_unit_costs') is null then
    return;
  end if;

  drop policy if exists product_unit_costs_admin_all on public.product_unit_costs;
  create policy product_unit_costs_admin_all
    on public.product_unit_costs for all
    to authenticated
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$puc$;

-- ---------------------------------------------------------------------------
-- orders: include profiles.role = admin (auth_is_profile_admin is master-only)
-- ---------------------------------------------------------------------------

do $ord$
begin
  if to_regclass('public.orders') is null then
    return;
  end if;

  drop policy if exists orders_consumer_select on public.orders;
  create policy orders_consumer_select
    on public.orders for select
    using (
      consumer_id = auth.uid()
      or public.vendor_staff_may_manage(orders.vendor_id)
      or public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
    );

  drop policy if exists orders_admin_all on public.orders;
  create policy orders_admin_all
    on public.orders for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$ord$;

-- ---------------------------------------------------------------------------
-- business_licenses admin (0087 used master-only helper)
-- ---------------------------------------------------------------------------

do $bl$
begin
  if to_regclass('public.business_licenses') is null then
    return;
  end if;

  drop policy if exists business_licenses_admin_all on public.business_licenses;
  create policy business_licenses_admin_all
    on public.business_licenses for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$bl$;

-- ---------------------------------------------------------------------------
-- vendor_region_marker_quotas (nested vendors read + master-only admin write)
-- ---------------------------------------------------------------------------

do $vrq$
begin
  if to_regclass('public.vendor_region_marker_quotas') is null then
    return;
  end if;

  drop policy if exists vendor_region_marker_quotas_vendor_select on public.vendor_region_marker_quotas;
  create policy vendor_region_marker_quotas_vendor_select
    on public.vendor_region_marker_quotas for select
    using (
      public.vendor_staff_may_manage(vendor_id)
      or public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
    );

  drop policy if exists vendor_region_marker_quotas_admin_write on public.vendor_region_marker_quotas;
  create policy vendor_region_marker_quotas_admin_write
    on public.vendor_region_marker_quotas for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$vrq$;

-- ---------------------------------------------------------------------------
-- catalog_products (inline profiles for vendor/admin select)
-- ---------------------------------------------------------------------------

do $cat$
begin
  if to_regclass('public.catalog_products') is null then
    return;
  end if;

  drop policy if exists catalog_products_vendor_admin_select on public.catalog_products;
  create policy catalog_products_vendor_admin_select
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
        public.auth_profiles_role_is_vendor()
        or public.auth_profiles_role_is_admin()
        or public.auth_is_profile_admin()
      )
    );

  drop policy if exists catalog_products_admin_all on public.catalog_products;
  create policy catalog_products_admin_all
    on public.catalog_products for all
    using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
    with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());
end
$cat$;

-- ---------------------------------------------------------------------------
-- RPC: vendor lead approve/reject — no inline profiles read inside SECURITY DEFINER
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_vendor_lead(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  lead_row public.vendor_lead_applications%rowtype;
  new_id uuid;
  base_slug text;
  final_slug text;
  zip5 text;
  attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'not admin';
  end if;

  select * into lead_row
  from public.vendor_lead_applications
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead not found';
  end if;
  if lead_row.status <> 'pending' then
    raise exception 'lead already processed';
  end if;

  zip5 := substring(regexp_replace(coalesce(lead_row.zip, ''), '\D', '', 'g') from 1 for 5);
  if length(zip5) < 5 then
    raise exception 'invalid zip on application';
  end if;

  base_slug := lower(regexp_replace(left(trim(lead_row.business_name), 80), '[^a-zA-Z0-9]+', '-', 'g'));
  if base_slug is null or btrim(base_slug) = '' or base_slug = '-' then
    base_slug := 'store';
  end if;

  loop
    attempts := attempts + 1;
    if attempts > 12 then
      raise exception 'could not allocate unique slug';
    end if;
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    begin
      insert into public.vendors (
        user_id,
        name,
        slug,
        zip,
        phone,
        license_number,
        description,
        is_live,
        license_status,
        is_directory_listing,
        offers_delivery,
        offers_storefront
      ) values (
        null,
        lead_row.business_name,
        final_slug,
        zip5,
        lead_row.contact_phone,
        nullif(btrim(lead_row.license_number), ''),
        format('Applicant contact email: %s', lead_row.contact_email),
        false,
        'pending',
        true,
        true,
        true
      )
      returning id into new_id;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  update public.vendor_lead_applications
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    created_vendor_id = new_id
  where id = p_lead_id;

  return new_id;
end;
$$;

create or replace function public.admin_reject_vendor_lead(p_lead_id uuid)
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
    raise exception 'not admin';
  end if;

  update public.vendor_lead_applications
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_lead_id
    and status = 'pending';

  if not found then
    raise exception 'lead not found or not pending';
  end if;
end;
$$;

-- Policies that apply to anon must be able to evaluate both admin helpers (short-circuit is not guaranteed).
grant execute on function public.auth_is_profile_admin() to anon;
