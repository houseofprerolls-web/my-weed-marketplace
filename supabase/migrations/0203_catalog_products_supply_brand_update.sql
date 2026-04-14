-- Supply portal: brand-linked staff may update catalog SKU presentation (not brand/category/strain identity).

create or replace function public.supply_staff_may_update_catalog_for_brand(p_brand_id uuid)
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
  if p_brand_id is null then
    return false;
  end if;
  if to_regclass('public.supply_accounts') is null or to_regclass('public.supply_account_members') is null then
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

revoke all on function public.supply_staff_may_update_catalog_for_brand(uuid) from public;
grant execute on function public.supply_staff_may_update_catalog_for_brand(uuid) to authenticated;

comment on function public.supply_staff_may_update_catalog_for_brand(uuid) is
  'True when user is supply_account_member for a supply_accounts row with this brand_id, or admin.';

create or replace function public.catalog_products_supply_update_guard()
returns trigger
language plpgsql
as $$
declare
  is_admin boolean;
  is_supply boolean;
begin
  is_admin := public.auth_profiles_role_is_admin() or public.auth_is_profile_admin();
  is_supply := public.supply_staff_may_update_catalog_for_brand(new.brand_id);

  if is_supply and not is_admin then
    if new.brand_id is distinct from old.brand_id
      or new.category is distinct from old.category
      or new.strain_id is distinct from old.strain_id
      or new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'supply catalog editors may only change name, description, images, potency, and updated_at';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists catalog_products_supply_update_guard_trg on public.catalog_products;
create trigger catalog_products_supply_update_guard_trg
  before update on public.catalog_products
  for each row
  execute function public.catalog_products_supply_update_guard();

drop policy if exists catalog_products_supply_brand_update on public.catalog_products;
create policy catalog_products_supply_brand_update
  on public.catalog_products for update
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_staff_may_update_catalog_for_brand(brand_id)
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_staff_may_update_catalog_for_brand(brand_id)
  );
