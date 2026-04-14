-- Allow a single user to be linked to multiple vendor/dispensary rows.
-- Previously, admin_link_vendor_user/admin_reassign_vendor_user blocked this to enforce "one store per account".
-- This breaks multi-store owners editing their separate storefront menus/addresses.

-- ---------------------------------------------------------------------------
-- Admin: link an unclaimed directory dispensary to a user (multi-vendor owners)
-- ---------------------------------------------------------------------------
create or replace function public.admin_link_vendor_user(p_vendor_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_uid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.auth_is_profile_admin() then
    raise exception 'not admin';
  end if;

  if p_user_id is null then
    raise exception 'user id required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'user not found';
  end if;

  select v.user_id into cur_uid
  from public.vendors v
  where v.id = p_vendor_id
  for update;

  if not found then
    raise exception 'vendor not found';
  end if;

  if cur_uid is not null and cur_uid <> p_user_id then
    raise exception 'vendor already linked to another user';
  end if;

  -- No-op if already linked to this same user.
  if cur_uid = p_user_id then
    return;
  end if;

  update public.vendors
  set
    user_id = p_user_id,
    is_directory_listing = false
  where id = p_vendor_id;

  update public.profiles
  set role = 'vendor'
  where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: reassign owner of a vendor row (multi-vendor owners)
-- ---------------------------------------------------------------------------
create or replace function public.admin_reassign_vendor_user(p_vendor_id uuid, p_new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_uid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.auth_is_profile_admin() then
    raise exception 'not admin';
  end if;

  if p_new_user_id is null then
    raise exception 'user id required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_new_user_id) then
    raise exception 'user not found';
  end if;

  select v.user_id into old_uid
  from public.vendors v
  where v.id = p_vendor_id
  for update;

  if not found then
    raise exception 'vendor not found';
  end if;

  if old_uid is not null and old_uid <> p_new_user_id then
    -- Prevent pointless reassign to the same user? (still allowed; no-op is fine)
    -- Note: we intentionally do NOT block multi-vendor ownership anymore.
    null;
  end if;

  update public.vendors
  set
    user_id = p_new_user_id,
    is_directory_listing = false
  where id = p_vendor_id;

  update public.profiles
  set role = 'vendor'
  where id = p_new_user_id;

  -- Demote old owner to customer ONLY if they no longer own any vendor rows and aren't staff on any.
  if old_uid is not null and old_uid <> p_new_user_id then
    if not exists (select 1 from public.vendors v2 where v2.user_id = old_uid) then
      if not exists (select 1 from public.vendor_team_members m where m.user_id = old_uid) then
        update public.profiles p
        set role = 'customer'
        where p.id = old_uid
          and p.role = 'vendor';
      end if;
    end if;
  end if;
end;
$$;

-- Keep grants consistent with prior migrations.
revoke all on function public.admin_link_vendor_user(uuid, uuid) from public;
grant execute on function public.admin_link_vendor_user(uuid, uuid) to authenticated;

revoke all on function public.admin_reassign_vendor_user(uuid, uuid) from public;
grant execute on function public.admin_reassign_vendor_user(uuid, uuid) to authenticated;

