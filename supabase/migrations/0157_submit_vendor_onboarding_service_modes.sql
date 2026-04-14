-- Align onboarding RPC with 0156: default unknown type to storefront-only (not both lanes);
-- persist allow_both_storefront_and_delivery when brand/cultivator (both false is OK).

create or replace function public.submit_vendor_onboarding_application(
  p_business_name text,
  p_business_type text,
  p_description text,
  p_phone text,
  p_business_email text,
  p_website text,
  p_address text,
  p_city text,
  p_state text,
  p_zip text,
  p_license_number text,
  p_license_authority text,
  p_license_issue_date date,
  p_license_expiry_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_row public.vendors%rowtype;
  zip5 text;
  base_slug text;
  final_slug text;
  attempts int := 0;
  od boolean := true;
  os boolean := true;
  lic_type text := 'retail';
  desc_final text;
  lic_num text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if length(trim(coalesce(p_business_name, ''))) < 2 then
    raise exception 'business_name_required';
  end if;

  zip5 := substring(regexp_replace(coalesce(p_zip, ''), '\D', '', 'g') from 1 for 5);
  if length(zip5) < 5 then
    raise exception 'valid_zip_required';
  end if;

  lic_num := nullif(trim(coalesce(p_license_number, '')), '');
  if lic_num is null or length(lic_num) < 3 then
    raise exception 'license_number_required';
  end if;

  case lower(trim(coalesce(p_business_type, '')))
    when 'delivery' then
      od := true;
      os := false;
      lic_type := 'delivery';
    when 'dispensary' then
      od := false;
      os := true;
      lic_type := 'retail';
    when 'brand' then
      od := false;
      os := false;
      lic_type := 'manufacturing';
    when 'cultivator' then
      od := false;
      os := false;
      lic_type := 'cultivation';
    else
      od := false;
      os := true;
      lic_type := 'retail';
  end case;

  desc_final := nullif(trim(coalesce(p_description, '')), '');
  if length(trim(coalesce(p_business_email, ''))) > 0 then
    desc_final := concat_ws(
      E'\n\n',
      desc_final,
      'Applicant contact email: ' || trim(p_business_email)
    );
  end if;

  select * into v_row
  from public.vendors
  where user_id = v_uid
  order by created_at desc nulls last
  limit 1;

  if found then
    if v_row.license_status = 'approved' and coalesce(v_row.is_live, false) then
      raise exception 'shop_already_live';
    end if;
    v_id := v_row.id;
    update public.vendors
    set
      name = trim(p_business_name),
      description = desc_final,
      address = nullif(trim(coalesce(p_address, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      state = nullif(trim(coalesce(p_state, '')), ''),
      zip = zip5,
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      website = nullif(trim(coalesce(p_website, '')), ''),
      license_number = lic_num,
      license_status = case
        when v_row.license_status = 'approved' then v_row.license_status
        else 'pending'
      end,
      offers_delivery = od,
      offers_storefront = os,
      allow_both_storefront_and_delivery = case when od and os then true else false end,
      is_live = false,
      verified = false
    where id = v_id;
  else
    base_slug := lower(regexp_replace(left(trim(p_business_name), 80), '[^a-zA-Z0-9]+', '-', 'g'));
    if base_slug is null or btrim(base_slug) = '' or base_slug = '-' then
      base_slug := 'store';
    end if;
    loop
      attempts := attempts + 1;
      if attempts > 20 then
        raise exception 'slug_collision';
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
          address,
          city,
          state,
          website,
          is_live,
          license_status,
          verified,
          is_directory_listing,
          offers_delivery,
          offers_storefront,
          allow_both_storefront_and_delivery
        ) values (
          v_uid,
          trim(p_business_name),
          final_slug,
          zip5,
          nullif(trim(coalesce(p_phone, '')), ''),
          lic_num,
          desc_final,
          nullif(trim(coalesce(p_address, '')), ''),
          nullif(trim(coalesce(p_city, '')), ''),
          nullif(trim(coalesce(p_state, '')), ''),
          nullif(trim(coalesce(p_website, '')), ''),
          false,
          'pending',
          false,
          true,
          od,
          os,
          case when od and os then true else false end
        )
        returning id into v_id;
        exit;
      exception
        when unique_violation then
          null;
      end;
    end loop;
  end if;

  delete from public.business_licenses
  where vendor_id = v_id
    and verification_status = 'pending';

  insert into public.business_licenses (
    vendor_id,
    license_number,
    license_type,
    issuing_authority,
    issue_date,
    expiry_date,
    verification_status
  ) values (
    v_id,
    lic_num,
    lic_type,
    nullif(trim(coalesce(p_license_authority, '')), ''),
    p_license_issue_date,
    p_license_expiry_date,
    'pending'
  );

  return v_id;
end;
$$;
