/*
  Seed CA licensed non-storefront (delivery) retailers from ULS export.
  Idempotent: ON CONFLICT (slug) DO NOTHING on vendors; licenses skip if license_number exists.
  ZIP/city = representative location for premise county (not exact premise address).
  Source file: uls-export-03-22-2026.csv
*/


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'NORCAL HOLISTICS, INC.',
  'ca-uls-c9-0000013-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Norcal Holistics, Inc..',
  NULL,
  'C9-0000013-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000013-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-10'::date,
  '2026-05-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000013-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000013-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Dubs Green Garden',
  'ca-uls-c9-0000016-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Dubs Green Garden Inc..',
  NULL,
  'C9-0000016-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000016-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-14'::date,
  '2026-05-13'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000016-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000016-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'NICE GUYS DELIVERY, INC.',
  'ca-uls-c9-0000019-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Nice Guys Delivery, Inc..',
  NULL,
  'C9-0000019-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000019-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-16'::date,
  '2026-05-15'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000019-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000019-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'NU CANNABIS',
  'ca-uls-c9-0000024-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kepos Enterprises, Inc..',
  NULL,
  'C9-0000024-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000024-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-20'::date,
  '2026-05-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000024-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000024-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Waves',
  'ca-uls-c9-0000025-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ivy Alley LLC.',
  NULL,
  'C9-0000025-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000025-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-20'::date,
  '2026-05-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000025-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000025-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DUBE',
  'ca-uls-c9-0000026-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hassell Girls, Inc..',
  NULL,
  'C9-0000026-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000026-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-20'::date,
  '2026-05-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000026-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000026-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Yesca Oaks Delivery',
  'ca-uls-c9-0000032-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: West Coast Medical Finest Inc.',
  NULL,
  'C9-0000032-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000032-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-21'::date,
  '2026-05-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000032-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000032-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Caliva Culver City',
  'ca-uls-c9-0000034-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Caliva Cadecc1, LLC.',
  'https://logo.clearbit.com/caliva.com',
  'C9-0000034-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000034-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-23'::date,
  '2026-05-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000034-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000034-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'BlazD Deliveries',
  'ca-uls-c9-0000040-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Jwc Deliveries, Inc..',
  NULL,
  'C9-0000040-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000040-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-24'::date,
  '2026-05-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000040-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000040-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'BUDGET KING, LLC',
  'ca-uls-c9-0000041-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Budget King, LLC.',
  NULL,
  'C9-0000041-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000041-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-01-10'::date,
  '2027-01-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000041-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000041-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'BLEU DIAMOND LLC',
  'ca-uls-c9-0000045-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bleu Diamond LLC.',
  'https://logo.clearbit.com/bleudiamond.com',
  'C9-0000045-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000045-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-28'::date,
  '2026-05-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000045-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000045-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GOLDEN STATE CANNABIS, INC.',
  'ca-uls-c9-0000046-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Golden State Cannabis, Inc..',
  NULL,
  'C9-0000046-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000046-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-28'::date,
  '2026-05-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000046-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000046-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Kc Dbw Nsfd, LLC',
  'ca-uls-c9-0000048-lic',
  'Licensed delivery · Monterey County',
  'California licensed non-storefront cannabis retailer (delivery). County: Monterey. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kc Dbw Nsfd, LLC.',
  NULL,
  'C9-0000048-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Monterey County, CA',
  'Monterey',
  'CA',
  '93940',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000048-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-05-29'::date,
  '2026-05-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000048-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000048-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Sensi Society',
  'ca-uls-c9-0000059-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bay Care Delivery, Inc.',
  NULL,
  'C9-0000059-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000059-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-04'::date,
  '2026-06-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000059-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000059-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'WINTER GREENS, LLC',
  'ca-uls-c9-0000061-lic',
  'Licensed delivery · Nevada County',
  'California licensed non-storefront cannabis retailer (delivery). County: Nevada. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Winter Greens, LLC.',
  NULL,
  'C9-0000061-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Nevada County, CA',
  'Nevada City',
  'CA',
  '95959',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000061-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-05'::date,
  '2026-06-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000061-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000061-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CAM',
  'ca-uls-c9-0000074-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: California Artisanal Medicine.',
  NULL,
  'C9-0000074-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000074-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-10'::date,
  '2026-06-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000074-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000074-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'MBM Sacramento, LLC',
  'ca-uls-c9-0000076-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mbm Sacramento, LLC.',
  NULL,
  'C9-0000076-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000076-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-10'::date,
  '2026-06-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000076-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000076-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Loaded Bowl',
  'ca-uls-c9-0000077-lic',
  'Licensed delivery · San Mateo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Mateo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Loaded Bowl LLC.',
  NULL,
  'C9-0000077-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Mateo County, CA',
  'Redwood City',
  'CA',
  '94063',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000077-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-10'::date,
  '2026-06-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000077-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000077-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Hey High',
  'ca-uls-c9-0000094-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Urban Buds, LLC.',
  NULL,
  'C9-0000094-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000094-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-13'::date,
  '2026-06-12'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000094-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000094-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Ona.Life',
  'ca-uls-c9-0000100-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Buttercup & Spring.',
  NULL,
  'C9-0000100-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000100-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-17'::date,
  '2026-06-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000100-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000100-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Ohana Gardens',
  'ca-uls-c9-0000104-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ohana Gardens.',
  NULL,
  'C9-0000104-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000104-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-18'::date,
  '2026-06-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000104-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000104-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Joy Reserve',
  'ca-uls-c9-0000105-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Elefante Inc.',
  NULL,
  'C9-0000105-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000105-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-18'::date,
  '2026-06-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000105-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000105-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Trees Of Knowledge',
  'ca-uls-c9-0000122-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Trees Of Knowledge T.O.K. LLC.',
  NULL,
  'C9-0000122-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000122-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-21'::date,
  '2026-06-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000122-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000122-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HIGH LYFE DISTRIBUTION INCORPORATED',
  'ca-uls-c9-0000139-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: High Lyfe Distribution Incorporated.',
  NULL,
  'C9-0000139-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000139-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-26'::date,
  '2026-06-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000139-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000139-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SBMS',
  'ca-uls-c9-0000144-lic',
  'Licensed delivery · Santa Barbara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Barbara. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Santa Barbara Manufacturing And Supply Company LLC.',
  NULL,
  'C9-0000144-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Barbara County, CA',
  'Santa Barbara',
  'CA',
  '93101',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000144-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-06-28'::date,
  '2026-06-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000144-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000144-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'ONE UP MONTEBELLO LLC',
  'ca-uls-c9-0000155-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: One Up Montebello LLC.',
  NULL,
  'C9-0000155-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000155-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-01'::date,
  '2026-06-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000155-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000155-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Smoakland',
  'ca-uls-c9-0000174-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hah 7 Ca LLC.',
  'https://logo.clearbit.com/smoakland.com',
  'C9-0000174-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000174-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-09'::date,
  '2026-07-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000174-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000174-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Pog Marketing LLC',
  'ca-uls-c9-0000195-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Pog Marketing LLC.',
  NULL,
  'C9-0000195-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000195-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-17'::date,
  '2026-07-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000195-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000195-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Dreamy Delivery, Alpaca Club',
  'ca-uls-c9-0000204-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Wholesome Delivery, Inc..',
  NULL,
  'C9-0000204-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000204-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-19'::date,
  '2026-07-18'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000204-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000204-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Aralo Enterprises, LLC',
  'ca-uls-c9-0000212-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Aralo Enterprises, LLC.',
  NULL,
  'C9-0000212-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000212-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-23'::date,
  '2026-07-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000212-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000212-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HOMETOWN HEART, INC.',
  'ca-uls-c9-0000215-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hometown Heart, Inc..',
  NULL,
  'C9-0000215-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000215-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-23'::date,
  '2026-07-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000215-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000215-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Canna-Couriers',
  'ca-uls-c9-0000217-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sjc Industries LLC.',
  NULL,
  'C9-0000217-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000217-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-07-23'::date,
  '2026-07-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000217-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000217-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Moonflower',
  'ca-uls-c9-0000247-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Lumalign LLC.',
  NULL,
  'C9-0000247-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000247-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-08-07'::date,
  '2026-08-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000247-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000247-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Firefly Marin',
  'ca-uls-c9-0000248-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Firefly Marin.',
  NULL,
  'C9-0000248-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000248-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-08-09'::date,
  '2026-08-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000248-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000248-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'PRIMETIMING, LLC',
  'ca-uls-c9-0000265-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Primetiming, LLC.',
  NULL,
  'C9-0000265-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000265-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-08-23'::date,
  '2026-08-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000265-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000265-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'THE GOOD PEOPLE FARMS LLC',
  'ca-uls-c9-0000270-lic',
  'Licensed delivery · Yolo County',
  'California licensed non-storefront cannabis retailer (delivery). County: Yolo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Good People Farms LLC.',
  NULL,
  'C9-0000270-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Yolo County, CA',
  'Woodland',
  'CA',
  '95695',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000270-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-08-28'::date,
  '2026-08-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000270-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000270-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Goldy''s',
  'ca-uls-c9-0000278-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Altruism For All.',
  NULL,
  'C9-0000278-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000278-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-08-30'::date,
  '2026-08-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000278-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000278-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Supreme Greens',
  'ca-uls-c9-0000294-lic',
  'Licensed delivery · Imperial County',
  'California licensed non-storefront cannabis retailer (delivery). County: Imperial. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Real Industries LLC.',
  NULL,
  'C9-0000294-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Imperial County, CA',
  'El Centro',
  'CA',
  '92243',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000294-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-09-20'::date,
  '2026-09-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000294-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000294-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HOMETOWN HEART, INC.',
  'ca-uls-c9-0000295-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hometown Heart, Inc..',
  NULL,
  'C9-0000295-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000295-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-09-24'::date,
  '2026-09-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000295-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000295-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Eaze',
  'ca-uls-c9-0000298-lic',
  'Licensed delivery · Sonoma County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sonoma. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Clearlake Growth Fund Ii, Inc..',
  'https://logo.clearbit.com/eaze.com',
  'C9-0000298-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sonoma County, CA',
  'Santa Rosa',
  'CA',
  '95404',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000298-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-10-01'::date,
  '2026-09-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000298-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000298-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Green Delivery, Inc',
  'ca-uls-c9-0000301-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Green Delivery, Inc.',
  NULL,
  'C9-0000301-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000301-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-10-11'::date,
  '2026-10-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000301-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000301-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HAHA Organics',
  'ca-uls-c9-0000316-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Coastal Care Organics Inc..',
  NULL,
  'C9-0000316-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000316-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-11-14'::date,
  '2026-11-13'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000316-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000316-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Sticky Thumb',
  'ca-uls-c9-0000323-lic',
  'Licensed delivery · San Mateo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Mateo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Make Your Mark Sf Inc.',
  NULL,
  'C9-0000323-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Mateo County, CA',
  'Redwood City',
  'CA',
  '94063',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000323-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2019-12-20'::date,
  '2026-12-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000323-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000323-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Tahoe Harvest Collection',
  'ca-uls-c9-0000332-lic',
  'Licensed delivery · Nevada County',
  'California licensed non-storefront cannabis retailer (delivery). County: Nevada. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Imajn Corp..',
  NULL,
  'C9-0000332-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Nevada County, CA',
  'Nevada City',
  'CA',
  '95959',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000332-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-01-29'::date,
  '2027-01-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000332-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000332-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Garden State Nectar, Inc.',
  'ca-uls-c9-0000334-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Garden State Nectar, Inc..',
  NULL,
  'C9-0000334-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000334-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-02-05'::date,
  '2027-02-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000334-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000334-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HUMBLE ROOT INTERNATIONAL, INC',
  'ca-uls-c9-0000346-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Humble Root International, Inc.',
  NULL,
  'C9-0000346-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000346-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-03-24'::date,
  '2027-03-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000346-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000346-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GOODFELLAS',
  'ca-uls-c9-0000359-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cannabis Plus LLC.',
  NULL,
  'C9-0000359-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000359-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-06-02'::date,
  '2026-06-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000359-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000359-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Budzilla Cannabis Delivery',
  'ca-uls-c9-0000362-lic',
  'Licensed delivery · Kern County',
  'California licensed non-storefront cannabis retailer (delivery). County: Kern. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cali Cannabis Care.',
  NULL,
  'C9-0000362-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Kern County, CA',
  'Bakersfield',
  'CA',
  '93301',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000362-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-06-11'::date,
  '2026-06-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000362-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000362-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'REDWOOD ROOTS RETAIL, LLC',
  'ca-uls-c9-0000364-lic',
  'Licensed delivery · Humboldt County',
  'California licensed non-storefront cannabis retailer (delivery). County: Humboldt. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Redwood Roots Retail, LLC.',
  NULL,
  'C9-0000364-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Humboldt County, CA',
  'Eureka',
  'CA',
  '95501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000364-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-07-07'::date,
  '2026-07-07'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000364-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000364-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'BAY LEAVES',
  'ca-uls-c9-0000370-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Medicinal. Synced from CA DCC ULS. Legal entity: Elite Herbs, Inc.',
  NULL,
  'C9-0000370-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000370-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-08-03'::date,
  '2026-08-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000370-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000370-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Green Canary',
  'ca-uls-c9-0000373-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sova.',
  NULL,
  'C9-0000373-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000373-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-08-14'::date,
  '2026-08-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000373-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000373-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'KUSHY CANNABIS DELIVERY',
  'ca-uls-c9-0000375-lic',
  'Licensed delivery · San Joaquin County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Joaquin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: 209 Trading Company, Inc.',
  NULL,
  'C9-0000375-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Joaquin County, CA',
  'Stockton',
  'CA',
  '95202',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000375-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-08-21'::date,
  '2026-08-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000375-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000375-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Royal Kush',
  'ca-uls-c9-0000378-lic',
  'Licensed delivery · Ventura County',
  'California licensed non-storefront cannabis retailer (delivery). County: Ventura. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Tech Delivery Solutions, LLC.',
  NULL,
  'C9-0000378-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Ventura County, CA',
  'Ventura',
  'CA',
  '93001',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000378-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-09-10'::date,
  '2026-09-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000378-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000378-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'NATURA DELIVERY ONLY DISPENSARY, LLC',
  'ca-uls-c9-0000388-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Natura Delivery Only Dispensary, LLC.',
  NULL,
  'C9-0000388-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000388-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-11-20'::date,
  '2026-11-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000388-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000388-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Tahoe Honey Company',
  'ca-uls-c9-0000391-lic',
  'Licensed delivery · Nevada County',
  'California licensed non-storefront cannabis retailer (delivery). County: Nevada. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Tahoe Honey Company.',
  NULL,
  'C9-0000391-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Nevada County, CA',
  'Nevada City',
  'CA',
  '95959',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000391-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2020-12-09'::date,
  '2026-12-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000391-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000391-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'IHEARTCANNABIS',
  'ca-uls-c9-0000397-lic',
  'Licensed delivery · Ventura County',
  'California licensed non-storefront cannabis retailer (delivery). County: Ventura. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Innovative Concepts Investments Group.',
  NULL,
  'C9-0000397-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Ventura County, CA',
  'Ventura',
  'CA',
  '93001',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000397-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-01-14'::date,
  '2027-01-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000397-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000397-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'MY NATURAL SOLUTIONS LLC',
  'ca-uls-c9-0000409-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: My Natural Solutions LLC.',
  NULL,
  'C9-0000409-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000409-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-04-21'::date,
  '2026-04-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000409-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000409-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  '710 LABS',
  'ca-uls-c9-0000411-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Asv Eq 3, LLC.',
  'https://logo.clearbit.com/710labs.com',
  'C9-0000411-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000411-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-05-03'::date,
  '2026-05-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000411-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000411-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bleu Diamond LLC',
  'ca-uls-c9-0000414-lic',
  'Licensed delivery · Ventura County',
  'California licensed non-storefront cannabis retailer (delivery). County: Ventura. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bleu Diamond LLC.',
  'https://logo.clearbit.com/bleudiamond.com',
  'C9-0000414-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Ventura County, CA',
  'Ventura',
  'CA',
  '93001',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000414-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-05-18'::date,
  '2026-05-18'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000414-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000414-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'X GROUP',
  'ca-uls-c9-0000423-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: West Coast Green Rush LLC.',
  NULL,
  'C9-0000423-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000423-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-06-10'::date,
  '2026-06-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000423-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000423-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SEND IT',
  'ca-uls-c9-0000425-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Aquamarine Green LLC.',
  NULL,
  'C9-0000425-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000425-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-06-17'::date,
  '2026-06-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000425-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000425-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Lofi',
  'ca-uls-c9-0000429-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Northern Altruist LLC.',
  NULL,
  'C9-0000429-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000429-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-07-15'::date,
  '2026-07-15'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000429-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000429-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Fast Flavors',
  'ca-uls-c9-0000431-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kwiki Bud, LLC..',
  NULL,
  'C9-0000431-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000431-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-07-23'::date,
  '2026-07-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000431-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000431-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Cannagram',
  'ca-uls-c9-0000433-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Boru Co..',
  NULL,
  'C9-0000433-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000433-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-07-27'::date,
  '2026-07-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000433-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000433-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'ECOMEDS',
  'ca-uls-c9-0000436-lic',
  'Licensed delivery · Ventura County',
  'California licensed non-storefront cannabis retailer (delivery). County: Ventura. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Front Door Enterprises LLC.',
  NULL,
  'C9-0000436-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Ventura County, CA',
  'Ventura',
  'CA',
  '93001',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000436-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-07-29'::date,
  '2026-07-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000436-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000436-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HERB - Eastside',
  'ca-uls-c9-0000438-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Nickbob LLC.',
  NULL,
  'C9-0000438-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000438-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-03'::date,
  '2026-08-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000438-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000438-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HEROJO SOLUTIONS LLC',
  'ca-uls-c9-0000441-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Herojo Solutions LLC.',
  NULL,
  'C9-0000441-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000441-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-06'::date,
  '2026-08-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000441-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000441-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Padre Mu',
  'ca-uls-c9-0000442-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Pm Oak LLC.',
  NULL,
  'C9-0000442-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000442-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-11'::date,
  '2026-08-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000442-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000442-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HERB - Westside',
  'ca-uls-c9-0000445-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Ministry LLC.',
  NULL,
  'C9-0000445-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000445-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-19'::date,
  '2026-08-19'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000445-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000445-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Sustainable Farms, LLC',
  'ca-uls-c9-0000446-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sustainable Farms, LLC.',
  NULL,
  'C9-0000446-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000446-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-20'::date,
  '2026-08-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000446-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000446-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Jet Room',
  'ca-uls-c9-0000448-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Laday & Guerra, General Partnership.',
  NULL,
  'C9-0000448-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000448-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-08-23'::date,
  '2026-08-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000448-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000448-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'ERBA DELIVERY, ERBA MARKETS',
  'ca-uls-c9-0000463-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Erba Delivery-1.',
  'https://logo.clearbit.com/erbamarkets.com',
  'C9-0000463-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000463-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-09-20'::date,
  '2026-09-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000463-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000463-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Breez CA LLC',
  'ca-uls-c9-0000468-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Breez Ca LLC.',
  NULL,
  'C9-0000468-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000468-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-10-21'::date,
  '2026-10-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000468-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000468-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Full Spectrum Group, Inc.',
  'ca-uls-c9-0000474-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Full Spectrum Group, Inc..',
  NULL,
  'C9-0000474-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000474-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-11-22'::date,
  '2026-11-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000474-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000474-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Pink CannaBag',
  'ca-uls-c9-0000478-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Cannacreative LLC.',
  NULL,
  'C9-0000478-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000478-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-12-04'::date,
  '2026-12-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000478-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000478-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'KUSH CONNECT',
  'ca-uls-c9-0000479-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Collective Strategies Enterprises LLC.',
  NULL,
  'C9-0000479-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000479-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2021-12-07'::date,
  '2026-12-07'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000479-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000479-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Montvail, Inc.',
  'ca-uls-c9-0000489-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Montvail, Inc..',
  NULL,
  'C9-0000489-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000489-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-01-07'::date,
  '2027-01-07'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000489-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000489-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Best Friends Farm',
  'ca-uls-c9-0000492-lic',
  'Licensed delivery · Riverside County',
  'California licensed non-storefront cannabis retailer (delivery). County: Riverside. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Craig Guggolz.',
  NULL,
  'C9-0000492-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Riverside County, CA',
  'Riverside',
  'CA',
  '92501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000492-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-01-11'::date,
  '2027-01-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000492-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000492-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GEEZZ BROS',
  'ca-uls-c9-0000503-lic',
  'Licensed delivery · San Bernardino County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Bernardino. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: St George Enterprise LLC.',
  NULL,
  'C9-0000503-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Bernardino County, CA',
  'San Bernardino',
  'CA',
  '92401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000503-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-01-31'::date,
  '2027-01-31'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000503-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000503-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bud Dynasty, Inc.',
  'ca-uls-c9-0000504-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bud Dynasty.',
  NULL,
  'C9-0000504-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000504-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-02-02'::date,
  '2027-02-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000504-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000504-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Natrl Hi',
  'ca-uls-c9-0000509-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Nh Logistics LLC.',
  NULL,
  'C9-0000509-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000509-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-02-07'::date,
  '2027-02-07'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000509-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000509-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Magic Stick',
  'ca-uls-c9-0000511-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Collective Strategies Enterprises LLC.',
  NULL,
  'C9-0000511-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000511-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-02-11'::date,
  '2027-02-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000511-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000511-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Redeye Cannabis',
  'ca-uls-c9-0000513-lic',
  'Licensed delivery · Santa Barbara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Barbara. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Golden State Remedies.',
  NULL,
  'C9-0000513-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Barbara County, CA',
  'Santa Barbara',
  'CA',
  '93101',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000513-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-02-17'::date,
  '2027-02-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000513-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000513-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'ENR SAC',
  'ca-uls-c9-0000528-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Weedmo LLC.',
  NULL,
  'C9-0000528-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000528-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-03-25'::date,
  '2027-03-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000528-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000528-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Nexus Delivers',
  'ca-uls-c9-0000543-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cjd Enterprises LLC.',
  NULL,
  'C9-0000543-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000543-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-13'::date,
  '2026-04-13'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000543-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000543-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Lah Di Dah Di',
  'ca-uls-c9-0000544-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Agronomic Investments, Inc..',
  NULL,
  'C9-0000544-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000544-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-14'::date,
  '2026-04-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000544-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000544-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DoorHash',
  'ca-uls-c9-0000546-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cumberland Blues, LLC.',
  NULL,
  'C9-0000546-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000546-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-18'::date,
  '2026-04-18'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000546-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000546-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Ministry of Biblicallife Healing, Inc.',
  'ca-uls-c9-0000548-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ministry Of Biblicallife Healing, Inc..',
  NULL,
  'C9-0000548-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000548-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-20'::date,
  '2026-04-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000548-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000548-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Elusive',
  'ca-uls-c9-0000550-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ranajit Chaudhury.',
  NULL,
  'C9-0000550-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000550-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-25'::date,
  '2026-04-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000550-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000550-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'THREE TREES',
  'ca-uls-c9-0000551-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Shark Tank Group, LLC.',
  NULL,
  'C9-0000551-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000551-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-25'::date,
  '2026-04-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000551-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000551-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CS Group Operation, Inc.',
  'ca-uls-c9-0000552-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cs Group Operation, Inc..',
  NULL,
  'C9-0000552-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000552-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-25'::date,
  '2026-04-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000552-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000552-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bonzai, Inc.',
  'ca-uls-c9-0000554-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bonzai, Inc..',
  NULL,
  'C9-0000554-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000554-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-04-28'::date,
  '2026-04-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000554-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000554-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DROOPIES LLC',
  'ca-uls-c9-0000558-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Droopies LLC.',
  NULL,
  'C9-0000558-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000558-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-03'::date,
  '2026-05-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000558-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000558-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Orange Leaf Delivery',
  'ca-uls-c9-0000561-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: San Fernando Express.',
  NULL,
  'C9-0000561-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000561-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-04'::date,
  '2026-05-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000561-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000561-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'THHC',
  'ca-uls-c9-0000565-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: True Holistic Health Center.',
  NULL,
  'C9-0000565-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000565-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-10'::date,
  '2026-05-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000565-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000565-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'On Deck Delivery, LLC',
  'ca-uls-c9-0000567-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: On Deck Delivery, LLC.',
  NULL,
  'C9-0000567-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000567-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-11'::date,
  '2026-05-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000567-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000567-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Uncle Green, Inc.',
  'ca-uls-c9-0000568-lic',
  'Licensed delivery · Tulare County',
  'California licensed non-storefront cannabis retailer (delivery). County: Tulare. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Uncle Green, Inc..',
  NULL,
  'C9-0000568-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Tulare County, CA',
  'Visalia',
  'CA',
  '93291',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000568-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-11'::date,
  '2026-05-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000568-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000568-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Greenmart Organics Inc.',
  'ca-uls-c9-0000570-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Greenmart Organics Inc..',
  NULL,
  'C9-0000570-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000570-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-16'::date,
  '2026-05-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000570-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000570-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  '710 LABS',
  'ca-uls-c9-0000579-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Asv Eq 3, LLC.',
  'https://logo.clearbit.com/710labs.com',
  'C9-0000579-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000579-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-26'::date,
  '2026-05-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000579-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000579-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'FLYT Delivery',
  'ca-uls-c9-0000581-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Pro Genitor.',
  NULL,
  'C9-0000581-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000581-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-26'::date,
  '2026-05-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000581-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000581-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'KannaXpress',
  'ca-uls-c9-0000582-lic',
  'Licensed delivery · Nevada County',
  'California licensed non-storefront cannabis retailer (delivery). County: Nevada. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kannaxpress, Inc..',
  NULL,
  'C9-0000582-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Nevada County, CA',
  'Nevada City',
  'CA',
  '95959',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000582-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-27'::date,
  '2026-05-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000582-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000582-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Enjoymint Delivered',
  'ca-uls-c9-0000583-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Alpha Core, Inc..',
  NULL,
  'C9-0000583-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000583-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-05-31'::date,
  '2026-05-31'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000583-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000583-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SS Commercial Enterprises LLC',
  'ca-uls-c9-0000594-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ss Commercial Enterprises LLC.',
  NULL,
  'C9-0000594-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000594-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-08'::date,
  '2026-06-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000594-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000594-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HITECH IMAGING TRADE INC',
  'ca-uls-c9-0000597-lic',
  'Licensed delivery · San Bernardino County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Bernardino. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hitech Imaging Trade Inc.',
  NULL,
  'C9-0000597-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Bernardino County, CA',
  'San Bernardino',
  'CA',
  '92401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000597-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-13'::date,
  '2026-06-13'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000597-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000597-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'New Era Healing',
  'ca-uls-c9-0000611-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: New Era Healing, LLC.',
  NULL,
  'C9-0000611-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000611-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-21'::date,
  '2026-06-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000611-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000611-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Green Mind LLC',
  'ca-uls-c9-0000617-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Green Mind LLC.',
  NULL,
  'C9-0000617-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000617-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-24'::date,
  '2026-06-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000617-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000617-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Just J''s LLC',
  'ca-uls-c9-0000619-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Just J''s LLC.',
  NULL,
  'C9-0000619-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000619-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-24'::date,
  '2026-06-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000619-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000619-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Abundense, LLC',
  'ca-uls-c9-0000622-lic',
  'Licensed delivery · Riverside County',
  'California licensed non-storefront cannabis retailer (delivery). County: Riverside. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Abundense, LLC.',
  NULL,
  'C9-0000622-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Riverside County, CA',
  'Riverside',
  'CA',
  '92501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000622-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-24'::date,
  '2026-06-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000622-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000622-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'East LA Wellness, LLC',
  'ca-uls-c9-0000626-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: East La Wellness, LLC.',
  NULL,
  'C9-0000626-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000626-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-27'::date,
  '2026-06-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000626-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000626-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Narmania, LLC',
  'ca-uls-c9-0000628-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Narmania LLC.',
  NULL,
  'C9-0000628-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000628-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-28'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000628-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000628-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Rooted Group',
  'ca-uls-c9-0000629-lic',
  'Licensed delivery · Riverside County',
  'California licensed non-storefront cannabis retailer (delivery). County: Riverside. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Exotic Extraction LLC.',
  NULL,
  'C9-0000629-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Riverside County, CA',
  'Riverside',
  'CA',
  '92501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000629-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-28'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000629-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000629-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'EXPANDO PRODUCTS LLC',
  'ca-uls-c9-0000630-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Expando Products, LLC.',
  NULL,
  'C9-0000630-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000630-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-28'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000630-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000630-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'brothers Hempire',
  'ca-uls-c9-0000636-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Brothers Hempire.',
  NULL,
  'C9-0000636-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000636-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-30'::date,
  '2026-06-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000636-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000636-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  '7DAYZ',
  'ca-uls-c9-0000639-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Vegvad LLC.',
  NULL,
  'C9-0000639-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000639-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-06-30'::date,
  '2026-06-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000639-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000639-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'JBLR Joint Venture, LLC',
  'ca-uls-c9-0000643-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Jblr Joint Venture, LLC.',
  NULL,
  'C9-0000643-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000643-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-07-06'::date,
  '2026-07-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000643-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000643-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Oil Haus',
  'ca-uls-c9-0000644-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Shepard Investments, Inc..',
  NULL,
  'C9-0000644-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000644-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-07-08'::date,
  '2026-07-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000644-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000644-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Firefly Delivery',
  'ca-uls-c9-0000649-lic',
  'Licensed delivery · Santa Barbara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Barbara. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Firefly Delivery LLC.',
  NULL,
  'C9-0000649-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Barbara County, CA',
  'Santa Barbara',
  'CA',
  '93101',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000649-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-08-08'::date,
  '2026-08-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000649-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000649-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'nexus delivery',
  'ca-uls-c9-0000651-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Nexus Delivery, LLC.',
  NULL,
  'C9-0000651-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000651-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-09-20'::date,
  '2026-09-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000651-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000651-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'LICENSED TO DELIVER',
  'ca-uls-c9-0000655-lic',
  'Licensed delivery · Ventura County',
  'California licensed non-storefront cannabis retailer (delivery). County: Ventura. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bb & Se Inc..',
  NULL,
  'C9-0000655-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Ventura County, CA',
  'Ventura',
  'CA',
  '93001',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000655-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-10-10'::date,
  '2026-10-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000655-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000655-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DSC Alliance, LLC',
  'ca-uls-c9-0000656-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Dsc Alliance, LLC.',
  NULL,
  'C9-0000656-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000656-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-10-12'::date,
  '2026-10-12'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000656-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000656-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'BudExpress',
  'ca-uls-c9-0000659-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Puff N'' Luff Inc.',
  NULL,
  'C9-0000659-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000659-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-10-27'::date,
  '2026-10-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000659-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000659-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Young Bulls Delivery',
  'ca-uls-c9-0000660-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Young Bulls Delivery LLC.',
  NULL,
  'C9-0000660-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000660-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-10-27'::date,
  '2026-10-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000660-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000660-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'YES DELIVERY LLC',
  'ca-uls-c9-0000661-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Yes Delivery LLC.',
  NULL,
  'C9-0000661-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000661-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-10-28'::date,
  '2026-10-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000661-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000661-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'FRESH FLOWER DAILY',
  'ca-uls-c9-0000672-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Jc Rad Inc..',
  NULL,
  'C9-0000672-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000672-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-11-29'::date,
  '2026-11-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000672-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000672-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HerbNJoy',
  'ca-uls-c9-0000674-lic',
  'Licensed delivery · Contra Costa County',
  'California licensed non-storefront cannabis retailer (delivery). County: Contra Costa. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Walnut Creek Erudite Ventures.',
  NULL,
  'C9-0000674-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Contra Costa County, CA',
  'Martinez',
  'CA',
  '94553',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000674-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-12-02'::date,
  '2026-12-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000674-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000674-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Sacred Tree 365',
  'ca-uls-c9-0000675-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sacred Tree 365 LLC.',
  NULL,
  'C9-0000675-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000675-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2022-12-09'::date,
  '2026-12-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000675-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000675-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bud Bees',
  'ca-uls-c9-0000681-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Budbees LLC.',
  NULL,
  'C9-0000681-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000681-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-01-04'::date,
  '2027-01-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000681-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000681-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'PUFF LA LLC',
  'ca-uls-c9-0000682-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Puff La LLC.',
  NULL,
  'C9-0000682-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000682-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-01-06'::date,
  '2027-01-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000682-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000682-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CS GROUP OPERATION 2, INC.',
  'ca-uls-c9-0000685-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cs Group Operation 2, Inc..',
  NULL,
  'C9-0000685-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000685-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-01-17'::date,
  '2027-01-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000685-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000685-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Exhale',
  'ca-uls-c9-0000687-lic',
  'Licensed delivery · Santa Clara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Clara. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mwkm Corporation.',
  NULL,
  'C9-0000687-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Clara County, CA',
  'San Jose',
  'CA',
  '95113',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000687-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-01-20'::date,
  '2027-01-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000687-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000687-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'AKNS LLC',
  'ca-uls-c9-0000691-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Akns LLC.',
  NULL,
  'C9-0000691-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000691-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-01-26'::date,
  '2027-01-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000691-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000691-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Peak Horizon, Inc.',
  'ca-uls-c9-0000695-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Peak Horizon, Inc..',
  NULL,
  'C9-0000695-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000695-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-02-03'::date,
  '2027-02-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000695-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000695-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'C.R.A.F.T.',
  'ca-uls-c9-0000696-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Limited Boutique Supply, Inc..',
  NULL,
  'C9-0000696-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000696-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-02-06'::date,
  '2027-02-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000696-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000696-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'MOAB DELIVERY',
  'ca-uls-c9-0000698-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Moab Delivery LLC.',
  NULL,
  'C9-0000698-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000698-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-02-21'::date,
  '2027-02-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000698-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000698-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Higher Ground Holdings LLC',
  'ca-uls-c9-0000699-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Higher Ground Holdings LLC.',
  NULL,
  'C9-0000699-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000699-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-02'::date,
  '2027-03-01'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000699-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000699-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Relief Delivered',
  'ca-uls-c9-0000700-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ca Quantum Md LLC.',
  NULL,
  'C9-0000700-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000700-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-07'::date,
  '2027-03-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000700-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000700-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Social Wellness',
  'ca-uls-c9-0000705-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kinfolk Holistics, LLC.',
  NULL,
  'C9-0000705-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000705-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-16'::date,
  '2027-03-15'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000705-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000705-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CannaQuik Deliveries',
  'ca-uls-c9-0000706-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Holistic Holdings, Inc..',
  NULL,
  'C9-0000706-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000706-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-16'::date,
  '2027-03-15'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000706-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000706-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'FROST',
  'ca-uls-c9-0000707-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Dankory, LLC.',
  NULL,
  'C9-0000707-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000707-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-17'::date,
  '2027-03-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000707-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000707-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SHRYNE LA HABRA LLC',
  'ca-uls-c9-0000708-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Shryne La Habra LLC.',
  NULL,
  'C9-0000708-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000708-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-03-17'::date,
  '2027-03-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000708-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000708-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'TRESTL, INC',
  'ca-uls-c9-0000712-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Trestl, Inc.',
  NULL,
  'C9-0000712-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000712-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-04-07'::date,
  '2026-04-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000712-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000712-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bud Nest',
  'ca-uls-c9-0000715-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Farmdale Delivery LLC..',
  NULL,
  'C9-0000715-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000715-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-04-25'::date,
  '2026-04-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000715-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000715-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Harvest House LLC.',
  'ca-uls-c9-0000716-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Harvest House LLC..',
  NULL,
  'C9-0000716-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000716-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-04-25'::date,
  '2026-04-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000716-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000716-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Green Light Cannabis',
  'ca-uls-c9-0000718-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Eric Sedrakyan.',
  NULL,
  'C9-0000718-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000718-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-04-26'::date,
  '2026-04-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000718-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000718-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Happy High Delivery',
  'ca-uls-c9-0000719-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Eric Sedrakyan.',
  NULL,
  'C9-0000719-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000719-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-04-27'::date,
  '2026-04-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000719-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000719-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'High Roller LLC',
  'ca-uls-c9-0000720-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: High Roller Club LLC.',
  NULL,
  'C9-0000720-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000720-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-03'::date,
  '2026-05-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000720-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000720-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Flower Policy',
  'ca-uls-c9-0000721-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Flower Policy LLC.',
  NULL,
  'C9-0000721-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000721-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-03'::date,
  '2026-05-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000721-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000721-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GETGO DELIVERY LLC',
  'ca-uls-c9-0000723-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Getgo Delivery LLC.',
  NULL,
  'C9-0000723-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000723-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-11'::date,
  '2026-05-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000723-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000723-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CANNA LA LA',
  'ca-uls-c9-0000724-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Canna La La LLC.',
  NULL,
  'C9-0000724-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000724-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-12'::date,
  '2026-05-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000724-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000724-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Rose Town Investment Group',
  'ca-uls-c9-0000725-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Rose Town Investment Group.',
  NULL,
  'C9-0000725-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000725-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-12'::date,
  '2026-05-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000725-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000725-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Real Fire Society',
  'ca-uls-c9-0000728-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mgpi.',
  NULL,
  'C9-0000728-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000728-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-12'::date,
  '2026-05-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000728-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000728-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'EUPHORIA GRAS',
  'ca-uls-c9-0000729-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Khldun Issa.',
  NULL,
  'C9-0000729-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000729-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-15'::date,
  '2026-05-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000729-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000729-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CORNERBOY',
  'ca-uls-c9-0000730-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Security Pacific Corporation.',
  NULL,
  'C9-0000730-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000730-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-18'::date,
  '2026-05-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000730-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000730-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CN PACHECO',
  'ca-uls-c9-0000731-lic',
  'Licensed delivery · Contra Costa County',
  'California licensed non-storefront cannabis retailer (delivery). County: Contra Costa. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cn Pacheco.',
  NULL,
  'C9-0000731-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Contra Costa County, CA',
  'Martinez',
  'CA',
  '94553',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000731-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-22'::date,
  '2026-05-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000731-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000731-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'G LION',
  'ca-uls-c9-0000732-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Fabulous Creations Inc..',
  NULL,
  'C9-0000732-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000732-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-22'::date,
  '2026-05-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000732-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000732-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Wakery Bakery Delivery',
  'ca-uls-c9-0000733-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Lonnell Crawford.',
  NULL,
  'C9-0000733-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000733-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-22'::date,
  '2026-05-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000733-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000733-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Fast Flavors',
  'ca-uls-c9-0000734-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Onyi Mitchell, LLC.',
  NULL,
  'C9-0000734-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000734-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-05-31'::date,
  '2026-05-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000734-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000734-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SK Delivery Inc.',
  'ca-uls-c9-0000742-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sk Delivery Inc..',
  NULL,
  'C9-0000742-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000742-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-06'::date,
  '2026-06-05'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000742-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000742-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SK Delivery Inc.',
  'ca-uls-c9-0000745-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sk Delivery Inc..',
  NULL,
  'C9-0000745-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000745-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-06'::date,
  '2026-06-05'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000745-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000745-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HEAVEN''S HERB',
  'ca-uls-c9-0000747-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Arg Group LLC.',
  NULL,
  'C9-0000747-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000747-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-06'::date,
  '2026-06-05'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000747-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000747-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DT California LLC',
  'ca-uls-c9-0000748-lic',
  'Licensed delivery · Stanislaus County',
  'California licensed non-storefront cannabis retailer (delivery). County: Stanislaus. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Dt California LLC.',
  NULL,
  'C9-0000748-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Stanislaus County, CA',
  'Modesto',
  'CA',
  '95354',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000748-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-06'::date,
  '2026-06-05'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000748-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000748-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'TELOS LOGISTICAL SOLUTIONS LLC',
  'ca-uls-c9-0000750-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Telos Logistical Solutions LLC.',
  NULL,
  'C9-0000750-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000750-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-07'::date,
  '2026-06-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000750-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000750-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bishop Boyz LLC',
  'ca-uls-c9-0000752-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bishop Boyz LLC.',
  NULL,
  'C9-0000752-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000752-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-14'::date,
  '2026-06-13'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000752-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000752-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SMOOTH ELEVATIONS HOLDINGS L.L.C.',
  'ca-uls-c9-0000753-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Smooth Elevations Holdings L.L.C..',
  NULL,
  'C9-0000753-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000753-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-15'::date,
  '2026-06-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000753-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000753-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Groovy Doobie LLC',
  'ca-uls-c9-0000756-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Groovy Doobie LLC.',
  NULL,
  'C9-0000756-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000756-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-22'::date,
  '2026-06-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000756-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000756-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SMART MED SOLUTIONS',
  'ca-uls-c9-0000758-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Smart Med Solutions.',
  NULL,
  'C9-0000758-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000758-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-23'::date,
  '2026-06-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000758-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000758-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Newstein Corporation',
  'ca-uls-c9-0000759-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Newstein Corporation.',
  NULL,
  'C9-0000759-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000759-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-23'::date,
  '2026-06-22'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000759-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000759-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CSA MEDICAL REMEDIES',
  'ca-uls-c9-0000763-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Csa Medical Remedies LLC.',
  NULL,
  'C9-0000763-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000763-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-26'::date,
  '2026-06-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000763-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000763-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Norcanna Farms',
  'ca-uls-c9-0000764-lic',
  'Licensed delivery · El Dorado County',
  'California licensed non-storefront cannabis retailer (delivery). County: El Dorado. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Uphill Incorporated.',
  NULL,
  'C9-0000764-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — El Dorado County, CA',
  'Placerville',
  'CA',
  '95667',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000764-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-26'::date,
  '2026-06-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000764-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000764-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'MRS. BUDZ LLC',
  'ca-uls-c9-0000766-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mrs. Budz LLC.',
  NULL,
  'C9-0000766-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000766-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-27'::date,
  '2026-06-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000766-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000766-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Deli Boys Delivery',
  'ca-uls-c9-0000770-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kushizm Inc.',
  NULL,
  'C9-0000770-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000770-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-29'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000770-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000770-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Springs Angeles',
  'ca-uls-c9-0000771-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Springs Angeles LLC.',
  NULL,
  'C9-0000771-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000771-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-29'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000771-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000771-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'LS7 Logistics, LLC.',
  'ca-uls-c9-0000772-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ls7 Logistics, LLC..',
  NULL,
  'C9-0000772-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000772-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-29'::date,
  '2026-06-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000772-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000772-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HIGHER PURPOSE DELIVERY SERVICE',
  'ca-uls-c9-0000779-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Trd Associates, LLC.',
  NULL,
  'C9-0000779-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000779-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-30'::date,
  '2026-06-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000779-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000779-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Bonnet Shores Management Company LLC',
  'ca-uls-c9-0000782-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bonnet Shores Management Company LLC.',
  NULL,
  'C9-0000782-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000782-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-30'::date,
  '2026-06-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000782-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000782-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GUPPYGO',
  'ca-uls-c9-0000785-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Guppygo LLC.',
  NULL,
  'C9-0000785-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000785-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-30'::date,
  '2026-06-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000785-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000785-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'JD Simcha',
  'ca-uls-c9-0000786-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Jd Simcha.',
  NULL,
  'C9-0000786-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000786-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-30'::date,
  '2026-06-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000786-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000786-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'THE DELIVERY LA, LLC',
  'ca-uls-c9-0000787-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Delivery La, LLC.',
  NULL,
  'C9-0000787-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000787-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-06-30'::date,
  '2026-06-29'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000787-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000787-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Zen Life Organics LLC',
  'ca-uls-c9-0000791-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Zen Life Organics LLC.',
  NULL,
  'C9-0000791-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000791-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-07-18'::date,
  '2026-07-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000791-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000791-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'C3 Delivery',
  'ca-uls-c9-0000793-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: C3 Delivery, Inc..',
  NULL,
  'C9-0000793-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000793-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-08-19'::date,
  '2026-08-18'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000793-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000793-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Abc Commerce LLC',
  'ca-uls-c9-0000795-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Abc Commerce LLC.',
  NULL,
  'C9-0000795-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000795-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-08-29'::date,
  '2026-08-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000795-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000795-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CMX Distribution, Inc.',
  'ca-uls-c9-0000796-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cmx Distribution, Inc..',
  NULL,
  'C9-0000796-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000796-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-09-06'::date,
  '2026-09-05'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000796-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000796-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'West Coast Safe Delivery, Inc.',
  'ca-uls-c9-0000797-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: A & D Couriers.',
  NULL,
  'C9-0000797-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000797-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-09-21'::date,
  '2026-09-20'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000797-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000797-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Fresh Green Express, LLC',
  'ca-uls-c9-0000805-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Fresh Green Express, LLC.',
  NULL,
  'C9-0000805-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000805-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2023-11-29'::date,
  '2026-11-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000805-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000805-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Green Giant Delivery',
  'ca-uls-c9-0000806-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Prospect Beach LLC.',
  NULL,
  'C9-0000806-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000806-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-01-31'::date,
  '2027-01-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000806-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000806-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Marin Gardens',
  'ca-uls-c9-0000807-lic',
  'Licensed delivery · Marin County',
  'California licensed non-storefront cannabis retailer (delivery). County: Marin. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Bjork Group.',
  NULL,
  'C9-0000807-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Marin County, CA',
  'San Rafael',
  'CA',
  '94901',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000807-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-02-01'::date,
  '2027-01-31'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000807-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000807-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Paisley Project LLC',
  'ca-uls-c9-0000809-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Paisley Project LLC.',
  NULL,
  'C9-0000809-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000809-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-04-03'::date,
  '2026-04-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000809-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000809-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'TOP NOTCH FLOWERS',
  'ca-uls-c9-0000810-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Top Notch Flowers, Inc..',
  NULL,
  'C9-0000810-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000810-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-04-16'::date,
  '2026-04-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000810-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000810-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GREEN GOLD DELIVERY',
  'ca-uls-c9-0000812-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Green Gold Investment Corporation.',
  NULL,
  'C9-0000812-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000812-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-04-30'::date,
  '2026-04-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000812-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000812-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GREEN RUSH ALLIANCES, LLC',
  'ca-uls-c9-0000813-lic',
  'Licensed delivery · Santa Barbara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Barbara. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Green Rush Alliances, LLC.',
  NULL,
  'C9-0000813-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Barbara County, CA',
  'Santa Barbara',
  'CA',
  '93101',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000813-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-05-09'::date,
  '2026-05-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000813-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000813-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'WEEDYY',
  'ca-uls-c9-0000814-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Dazzert, Inc..',
  NULL,
  'C9-0000814-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000814-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-06-10'::date,
  '2026-06-10'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000814-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000814-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Osos Flower, LLC',
  'ca-uls-c9-0000815-lic',
  'Licensed delivery · San Luis Obispo County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Luis Obispo. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Osos Flower, LLC.',
  NULL,
  'C9-0000815-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Luis Obispo County, CA',
  'San Luis Obispo',
  'CA',
  '93401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000815-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-06-21'::date,
  '2026-06-21'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000815-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000815-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'KK Delivery',
  'ca-uls-c9-0000816-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Kk Deliveries Inc..',
  NULL,
  'C9-0000816-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000816-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-06-25'::date,
  '2026-06-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000816-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000816-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'OFL Delivery Sacramento LLC',
  'ca-uls-c9-0000817-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ofl Delivery Sacramento LLC.',
  NULL,
  'C9-0000817-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000817-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-07-12'::date,
  '2026-07-12'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000817-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000817-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HITS LA',
  'ca-uls-c9-0000819-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Yan B Delivery.',
  NULL,
  'C9-0000819-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000819-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-07-31'::date,
  '2026-07-31'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000819-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000819-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'CANNABUS',
  'ca-uls-c9-0000820-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Ap & K Management LLC.',
  NULL,
  'C9-0000820-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000820-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-09-16'::date,
  '2026-09-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000820-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000820-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'UplyftLA',
  'ca-uls-c9-0000821-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Rubibi Capital LLC.',
  NULL,
  'C9-0000821-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000821-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-09-17'::date,
  '2026-09-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000821-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000821-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Legacy Pharms',
  'ca-uls-c9-0000823-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Amacoa Partners LLC.',
  NULL,
  'C9-0000823-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000823-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-09-24'::date,
  '2026-09-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000823-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000823-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SA HOLDING LLC',
  'ca-uls-c9-0000824-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sa Holding LLC.',
  NULL,
  'C9-0000824-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000824-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-10-11'::date,
  '2026-10-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000824-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000824-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Gas Station',
  'ca-uls-c9-0000825-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Shasta Street LLC.',
  NULL,
  'C9-0000825-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000825-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-10-14'::date,
  '2026-10-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000825-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000825-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Upnorth Distribution Inc',
  'ca-uls-c9-0000826-lic',
  'Licensed delivery · Humboldt County',
  'California licensed non-storefront cannabis retailer (delivery). County: Humboldt. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Upnorth Distribution Inc.',
  NULL,
  'C9-0000826-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Humboldt County, CA',
  'Eureka',
  'CA',
  '95501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000826-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-10-15'::date,
  '2026-10-15'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000826-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000826-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'MX3',
  'ca-uls-c9-0000827-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mx3 LLC.',
  NULL,
  'C9-0000827-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000827-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-11-06'::date,
  '2026-11-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000827-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000827-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Emerald Dragon Holdings',
  'ca-uls-c9-0000828-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Emerald Dragon Holdings.',
  NULL,
  'C9-0000828-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000828-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2024-11-12'::date,
  '2026-11-12'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000828-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000828-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'WAWG INC',
  'ca-uls-c9-0000830-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Wawg Inc.',
  NULL,
  'C9-0000830-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000830-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-01-28'::date,
  '2027-01-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000830-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000830-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Padre Mu',
  'ca-uls-c9-0000831-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Pm Oak LLC.',
  NULL,
  'C9-0000831-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000831-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-02-04'::date,
  '2027-02-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000831-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000831-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Local Choice',
  'ca-uls-c9-0000832-lic',
  'Licensed delivery · San Bernardino County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Bernardino. Designation: Medicinal. Synced from CA DCC ULS. Legal entity: Locals Choice Inc..',
  NULL,
  'C9-0000832-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Bernardino County, CA',
  'San Bernardino',
  'CA',
  '92401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000832-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-02-18'::date,
  '2027-02-18'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000832-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000832-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'SUNDERSTORM BAY LLC',
  'ca-uls-c9-0000834-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Sunderstorm Bay LLC.',
  NULL,
  'C9-0000834-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000834-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-02-25'::date,
  '2027-02-25'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000834-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000834-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Cloud7',
  'ca-uls-c9-0000835-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: The Kom LLC.',
  NULL,
  'C9-0000835-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000835-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-02-26'::date,
  '2027-02-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000835-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000835-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Elder Creek Delivery Inc.',
  'ca-uls-c9-0000837-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Elder Creek Delivery Inc..',
  NULL,
  'C9-0000837-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000837-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-03-06'::date,
  '2027-03-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000837-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000837-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Thornwood Distribution LLC',
  'ca-uls-c9-0000840-lic',
  'Licensed delivery · Santa Barbara County',
  'California licensed non-storefront cannabis retailer (delivery). County: Santa Barbara. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Thornwood Distribution LLC.',
  NULL,
  'C9-0000840-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Santa Barbara County, CA',
  'Santa Barbara',
  'CA',
  '93101',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000840-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-04-28'::date,
  '2026-04-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000840-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000840-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Top Shelf LLC',
  'ca-uls-c9-0000841-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Top Shelf LLC.',
  NULL,
  'C9-0000841-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000841-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-05-02'::date,
  '2026-05-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000841-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000841-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'The Yucca Valley Dispensary',
  'ca-uls-c9-0000842-lic',
  'Licensed delivery · San Bernardino County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Bernardino. Designation: Medicinal. Synced from CA DCC ULS. Legal entity: M&C14, Inc..',
  NULL,
  'C9-0000842-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Bernardino County, CA',
  'San Bernardino',
  'CA',
  '92401',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000842-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-05-12'::date,
  '2026-05-12'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000842-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000842-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Smoakland',
  'ca-uls-c9-0000843-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Smoakland Weed Delivery Corp..',
  'https://logo.clearbit.com/smoakland.com',
  'C9-0000843-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000843-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-06-04'::date,
  '2026-06-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000843-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000843-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Elev8ted Delivery',
  'ca-uls-c9-0000844-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Bnn One LLC.',
  NULL,
  'C9-0000844-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000844-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-06-24'::date,
  '2026-06-24'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000844-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000844-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Ounce Kings',
  'ca-uls-c9-0000845-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Norcal Trading LLC.',
  NULL,
  'C9-0000845-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000845-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-07-07'::date,
  '2026-07-07'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000845-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000845-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Banana Budda',
  'ca-uls-c9-0000846-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Anmr LLC.',
  NULL,
  'C9-0000846-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000846-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-07-08'::date,
  '2026-07-08'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000846-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000846-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Erba Catalina',
  'ca-uls-c9-0000847-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Medicinal. Synced from CA DCC ULS. Legal entity: Erba Catalina.',
  NULL,
  'C9-0000847-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000847-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-07-14'::date,
  '2026-07-14'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000847-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000847-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'StashCo',
  'ca-uls-c9-0000848-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Brandon Utke.',
  NULL,
  'C9-0000848-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000848-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-08-04'::date,
  '2026-08-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000848-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000848-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Greenway Highway',
  'ca-uls-c9-0000849-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Greenway Highway Inc..',
  NULL,
  'C9-0000849-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000849-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-08-06'::date,
  '2026-08-06'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000849-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000849-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'DISTRO DEPOT, INC.',
  'ca-uls-c9-0000850-lic',
  'Licensed delivery · Riverside County',
  'California licensed non-storefront cannabis retailer (delivery). County: Riverside. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Distro Depot, Inc..',
  NULL,
  'C9-0000850-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Riverside County, CA',
  'Riverside',
  'CA',
  '92501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000850-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-08-27'::date,
  '2026-08-27'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000850-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000850-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Quickie Cannabis Delivery',
  'ca-uls-c9-0000851-lic',
  'Licensed delivery · Riverside County',
  'California licensed non-storefront cannabis retailer (delivery). County: Riverside. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Quickie Delivery LLC.',
  NULL,
  'C9-0000851-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Riverside County, CA',
  'Riverside',
  'CA',
  '92501',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000851-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-09-02'::date,
  '2026-09-02'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000851-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000851-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Stealthee Delivery',
  'ca-uls-c9-0000852-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Wmjh Logistics LLC.',
  NULL,
  'C9-0000852-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000852-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-09-17'::date,
  '2026-09-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000852-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000852-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  '100 Gram Dash',
  'ca-uls-c9-0000853-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: 100 Gram Dash, LLC.',
  NULL,
  'C9-0000853-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000853-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-09-26'::date,
  '2026-09-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000853-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000853-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'POUNDS, INC.',
  'ca-uls-c9-0000854-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Pounds, Inc..',
  NULL,
  'C9-0000854-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000854-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-09-30'::date,
  '2026-09-30'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000854-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000854-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GEKT, Inc.',
  'ca-uls-c9-0000855-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Gekt, Inc..',
  NULL,
  'C9-0000855-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000855-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-10-23'::date,
  '2026-10-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000855-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000855-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  't.h.chi',
  'ca-uls-c9-0000856-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Golden Garden LLC.',
  NULL,
  'C9-0000856-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000856-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-10-28'::date,
  '2026-10-28'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000856-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000856-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'GOLD PHOENIX',
  'ca-uls-c9-0000857-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Gold Phoenix LLC.',
  NULL,
  'C9-0000857-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000857-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-11-04'::date,
  '2026-11-04'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000857-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000857-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Cannabashery',
  'ca-uls-c9-0000858-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Cannabashery, LLC.',
  NULL,
  'C9-0000858-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000858-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-11-17'::date,
  '2026-11-17'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000858-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000858-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Dream Bisss LLC',
  'ca-uls-c9-0000859-lic',
  'Licensed delivery · Sacramento County',
  'California licensed non-storefront cannabis retailer (delivery). County: Sacramento. Designation: Adult-Use. Synced from CA DCC ULS. Legal entity: Dream Bisss LLC..',
  NULL,
  'C9-0000859-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Sacramento County, CA',
  'Sacramento',
  'CA',
  '95814',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000859-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-12-11'::date,
  '2026-12-11'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000859-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000859-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Curbside Collective',
  'ca-uls-c9-0000860-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Greenspeed LLC.',
  NULL,
  'C9-0000860-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000860-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-12-16'::date,
  '2026-12-16'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000860-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000860-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Jay & Silent Bob Deliver',
  'ca-uls-c9-0000861-lic',
  'Licensed delivery · Los Angeles County',
  'California licensed non-storefront cannabis retailer (delivery). County: Los Angeles. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Mariposa Oak LLC.',
  NULL,
  'C9-0000861-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Los Angeles County, CA',
  'Los Angeles',
  'CA',
  '90012',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000861-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-12-23'::date,
  '2026-12-23'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000861-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000861-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Kannabis, Curbside Collective',
  'ca-uls-c9-0000862-lic',
  'Licensed delivery · Alameda County',
  'California licensed non-storefront cannabis retailer (delivery). County: Alameda. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Olympian Ventures Inc.',
  NULL,
  'C9-0000862-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Alameda County, CA',
  'Oakland',
  'CA',
  '94612',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000862-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2025-12-26'::date,
  '2026-12-26'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000862-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000862-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'Indo Nation',
  'ca-uls-c9-0000863-lic',
  'Licensed delivery · San Francisco County',
  'California licensed non-storefront cannabis retailer (delivery). County: San Francisco. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Indo Nation LLC.',
  NULL,
  'C9-0000863-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — San Francisco County, CA',
  'San Francisco',
  'CA',
  '94102',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000863-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2026-01-09'::date,
  '2027-01-09'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000863-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000863-LIC'
  );


insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  'HERA DISTRIBUTION LLC',
  'ca-uls-c9-0000864-lic',
  'Licensed delivery · Orange County',
  'California licensed non-storefront cannabis retailer (delivery). County: Orange. Designation: Adult-Use and Medicinal. Synced from CA DCC ULS. Legal entity: Hera Distribution LLC.',
  NULL,
  'C9-0000864-LIC',
  true,
  'approved',
  true,
  true,
  'basic',
  'Service area — Orange County, CA',
  'Santa Ana',
  'CA',
  '92701',
  true,
  false,
  false,
  true
)
on conflict (slug) do nothing;


insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  'C9-0000864-LIC',
  'retail',
  'California Department of Cannabis Control (DCC)',
  '2026-03-03'::date,
  '2027-03-03'::date,
  'verified'
from public.vendors v
where v.slug = 'ca-uls-c9-0000864-lic'
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = 'C9-0000864-LIC'
  );

