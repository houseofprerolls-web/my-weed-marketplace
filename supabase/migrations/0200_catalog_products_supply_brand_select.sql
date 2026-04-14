-- Idempotent patch: supply members can SELECT catalog_products for brands linked to their supply account.
-- Run after 0198. Safe to re-apply (same as tail of 0198 for databases that applied an older 0198 only).
--
-- LANGUAGE plpgsql (not sql) so CREATE FUNCTION does not require supply_* tables to exist yet; those
-- queries are planned at first call. If tables are missing, non-admin callers get false.

create or replace function public.supply_staff_may_read_catalog_for_brand(p_brand_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if public.auth_profiles_role_is_admin() or public.auth_is_profile_admin() then
    return true;
  end if;

  if to_regclass('public.supply_accounts') is null
     or to_regclass('public.supply_account_members') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.supply_accounts sa
    join public.supply_account_members m on m.supply_account_id = sa.id
    where m.user_id = auth.uid()
      and sa.brand_id is not null
      and sa.brand_id = p_brand_id
  );
end;
$$;

revoke all on function public.supply_staff_may_read_catalog_for_brand(uuid) from public;
grant execute on function public.supply_staff_may_read_catalog_for_brand(uuid) to authenticated;

comment on function public.supply_staff_may_read_catalog_for_brand(uuid) is
  'True when user is supply_account_member for a supply_accounts row with this brand_id, or admin.';

drop policy if exists catalog_products_supply_brand_select on public.catalog_products;
create policy catalog_products_supply_brand_select
  on public.catalog_products for select
  to authenticated
  using (
    exists (
      select 1 from public.brands b
      where b.id = catalog_products.brand_id
        and b.verified = true
    )
    and public.supply_staff_may_read_catalog_for_brand(catalog_products.brand_id)
  );
