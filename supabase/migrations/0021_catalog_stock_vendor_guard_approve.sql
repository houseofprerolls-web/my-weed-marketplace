-- Hide out-of-stock products from public (anon) catalog; keep vendor dashboard visibility via vendor policy.
-- Lock identity fields when approved vendors edit their row (non-admin).
-- Approve directory listings (no user_id) without failing.

-- ---------------------------------------------------------------------------
-- products: public SELECT only in-stock
-- ---------------------------------------------------------------------------
drop policy if exists products_public_select on public.products;
create policy products_public_select
  on public.products for select
  using (
    in_stock = true
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.is_live = true
        and v.license_status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- vendors: non-admin cannot change identity once row exists (applicants exempt)
-- ---------------------------------------------------------------------------
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

  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    return new;
  end if;

  -- Applicants (pending / rejected / needs_review) may edit freely
  if old.license_status is distinct from 'approved' then
    return new;
  end if;

  -- Approved owner: only cosmetic / contact fields may change in UI; lock core identity
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

drop trigger if exists trg_vendors_preserve_identity on public.vendors;
create trigger trg_vendors_preserve_identity
  before update on public.vendors
  for each row
  execute function public.vendors_preserve_identity_on_update();

-- ---------------------------------------------------------------------------
-- Approve owned OR directory-only vendors
-- ---------------------------------------------------------------------------
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

  if not exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  ) then
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
