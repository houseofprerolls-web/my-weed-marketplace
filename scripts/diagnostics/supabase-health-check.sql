-- Run in Supabase SQL Editor for the project that matches NEXT_PUBLIC_SUPABASE_URL.
-- Plan: deep dive strains / SKUs / listing (migrations 0061, 0021, 0114, 0115).

-- 1) Strains table shape (0061 adds has_hero_image)
select count(*) as strain_rows from public.strains;
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'strains'
  and column_name in ('has_hero_image', 'popularity_score', 'slug', 'name')
order by column_name;

-- 2) Sample vendor visibility (replace :id with a listing URL uuid)
-- select id, is_live, license_status from public.vendors where id = '00000000-0000-0000-0000-000000000000';

-- 3) Public SKUs gate (0021): in_stock + parent vendor live + approved
-- select count(*) from public.products p
-- join public.vendors v on v.id = p.vendor_id
-- where p.vendor_id = '00000000-0000-0000-0000-000000000000'
--   and p.in_stock = true and v.is_live = true and v.license_status = 'approved';

-- 4) Migration presence (manual): apply repo files if missing
-- supabase/migrations/0061_strains_has_hero_image_sort.sql
-- supabase/migrations/0021_catalog_stock_vendor_guard_approve.sql (products RLS)
-- supabase/migrations/0114_vendor_staff_may_manage_bypass_vendors_rls_recursion.sql
-- supabase/migrations/0115_vendors_select_if_owner_authenticated_only.sql
