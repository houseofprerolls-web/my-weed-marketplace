-- Make dispensary license records publicly readable for customer listing pages.
-- Limits public reads to live + approved vendors.

do $$
begin
  if to_regclass('public.business_licenses') is null then
    return;
  end if;

  drop policy if exists business_licenses_public_select on public.business_licenses;
  create policy business_licenses_public_select
    on public.business_licenses for select
    to anon, authenticated
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = business_licenses.vendor_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    );
end;
$$;

