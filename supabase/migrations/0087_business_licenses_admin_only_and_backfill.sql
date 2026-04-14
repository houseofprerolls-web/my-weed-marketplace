-- License rows: public read (0086), vendor staff read (0071), writes admin-only.
-- Backfill business_licenses from vendors.license_number when the store has no license row yet.

-- ---------------------------------------------------------------------------
-- 1) RLS: remove vendor/owner INSERT/UPDATE/DELETE; admin uses auth_is_profile_admin()
-- ---------------------------------------------------------------------------

drop policy if exists business_licenses_owner_write on public.business_licenses;
drop policy if exists business_licenses_owner_update on public.business_licenses;
drop policy if exists business_licenses_owner_delete on public.business_licenses;

drop policy if exists business_licenses_admin_all on public.business_licenses;

create policy business_licenses_admin_all
  on public.business_licenses for all
  using (public.auth_is_profile_admin())
  with check (public.auth_is_profile_admin());

-- ---------------------------------------------------------------------------
-- 2) Backfill: one primary license row per vendor from vendors.license_number
-- ---------------------------------------------------------------------------

insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select
  v.id,
  btrim(v.license_number),
  'retail',
  'California Department of Cannabis Control (DCC)',
  null::date,
  null::date,
  case
    when v.license_status = 'approved' then 'verified'
    else 'pending'
  end
from public.vendors v
where v.license_number is not null
  and length(btrim(v.license_number)) > 0
  and not exists (
    select 1
    from public.business_licenses bl
    where bl.vendor_id = v.id
  );
