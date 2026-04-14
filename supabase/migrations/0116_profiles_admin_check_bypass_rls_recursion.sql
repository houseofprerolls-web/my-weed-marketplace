-- Fix "infinite recursion detected in policy for relation profiles" on anonymous reads
-- of public catalog tables (e.g. strains, effects).
--
-- Encyclopedia policies pair `*_public_select using (true)` with `*_admin_write for all`
-- whose USING clause was `exists (select 1 from public.profiles ...)`. Postgres still
-- evaluates admin policies; that subquery re-enters profiles RLS and can recurse with
-- profiles_vendor_select_order_customers (orders / vendor_staff paths).
--
-- Pattern matches 0114 vendor_staff_may_manage: SECURITY DEFINER + row_security = off.

create or replace function public.auth_profiles_role_is_admin()
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
        and p.role = 'admin'
    ),
    false
  );
$$;

revoke all on function public.auth_profiles_role_is_admin() from public;
grant execute on function public.auth_profiles_role_is_admin() to anon, authenticated, service_role;

comment on function public.auth_profiles_role_is_admin() is
  'True when auth.uid() has profiles.role = admin; row_security=off avoids RLS recursion when used from other policies/triggers.';

-- Strain encyclopedia + related junction tables (0060 / 0002)
drop policy if exists "effects_admin_write" on public.effects;
create policy "effects_admin_write"
  on public.effects for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists "terpenes_admin_write" on public.terpenes;
create policy "terpenes_admin_write"
  on public.terpenes for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists "strains_admin_write" on public.strains;
create policy "strains_admin_write"
  on public.strains for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists "strain_effects_admin_write" on public.strain_effects;
create policy "strain_effects_admin_write"
  on public.strain_effects for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists "strain_terpenes_admin_write" on public.strain_terpenes;
create policy "strain_terpenes_admin_write"
  on public.strain_terpenes for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

-- Vendor update trigger: same inline profiles exists under SECURITY DEFINER still hit RLS
create or replace function public.vendors_preserve_identity_on_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.auth_profiles_role_is_admin() then
    return new;
  end if;

  if old.license_status is distinct from 'approved' then
    return new;
  end if;

  if old.user_id is not null and old.user_id is distinct from auth.uid() then
    return new;
  end if;

  new.user_id := old.user_id;
  new.license_status := old.license_status;
  new.is_live := old.is_live;
  new.slug := old.slug;
  new.verified := old.verified;
  new.is_directory_listing := old.is_directory_listing;
  new.subscription_tier := old.subscription_tier;
  new.stripe_subscription_id := old.stripe_subscription_id;
  return new;
end;
$$;

-- RPC: admin check without recursive profiles read
create or replace function public.admin_approve_vendor(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner_id uuid;
  is_dir boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.auth_profiles_role_is_admin() then
    raise exception 'forbidden';
  end if;

  select v.user_id, coalesce(v.is_directory_listing, false)
    into owner_id, is_dir
  from public.vendors v
  where v.id = p_vendor_id;

  if not found then
    raise exception 'vendor not found';
  end if;

  if owner_id is null and not is_dir then
    raise exception 'vendor must have an owner account or be a directory listing (admin-managed, no owner)';
  end if;

  update public.vendors
  set
    license_status = 'approved',
    is_live = true,
    verified = true
  where id = p_vendor_id;

  if owner_id is not null then
    update public.profiles
    set role = 'vendor'
    where id = owner_id;
  end if;
end;
$$;
