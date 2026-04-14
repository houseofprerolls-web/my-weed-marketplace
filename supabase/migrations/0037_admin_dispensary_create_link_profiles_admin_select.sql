-- Admin-created dispensaries (no user), link to vendor user later, admin user search for linking.
-- Prereq: vendors.is_directory_listing (0020 or 0036), offers_* (0023/0030).

create or replace function public.auth_is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.auth_is_profile_admin() to authenticated;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
  on public.profiles for select
  using (public.auth_is_profile_admin());

-- ---------------------------------------------------------------------------
-- Create dispensary with no owner (admin-managed until linked)
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_dispensary(
  p_name text,
  p_zip text,
  p_phone text,
  p_city text default null,
  p_state text default null,
  p_description text default null,
  p_license_number text default null,
  p_slug text default null,
  p_is_live boolean default true,
  p_contact_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  base_slug text;
  final_slug text;
  zip5 text;
  attempts int := 0;
  desc_final text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.auth_is_profile_admin() then
    raise exception 'not admin';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'name required';
  end if;

  zip5 := substring(regexp_replace(coalesce(p_zip, ''), '\D', '', 'g') from 1 for 5);
  if length(zip5) < 5 then
    raise exception 'invalid zip';
  end if;

  desc_final := nullif(btrim(coalesce(p_description, '')), '');
  if p_contact_note is not null and btrim(p_contact_note) <> '' then
    desc_final := coalesce(desc_final || E'\n\n', '') || 'Admin contact note: ' || btrim(p_contact_note);
  end if;

  if p_slug is not null and btrim(p_slug) <> '' then
    base_slug := lower(regexp_replace(btrim(p_slug), '[^a-zA-Z0-9]+', '-', 'g'));
  else
    base_slug := lower(regexp_replace(left(trim(p_name), 80), '[^a-zA-Z0-9]+', '-', 'g'));
  end if;
  if base_slug is null or btrim(base_slug) = '' or base_slug = '-' then
    base_slug := 'dispensary';
  end if;

  loop
    attempts := attempts + 1;
    if attempts > 15 then
      raise exception 'could not allocate unique slug';
    end if;
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    begin
      insert into public.vendors (
        user_id,
        name,
        slug,
        zip,
        phone,
        city,
        state,
        license_number,
        description,
        is_live,
        license_status,
        verified,
        is_directory_listing,
        offers_delivery,
        offers_storefront
      ) values (
        null,
        btrim(p_name),
        final_slug,
        zip5,
        nullif(btrim(p_phone), ''),
        nullif(btrim(p_city), ''),
        nullif(btrim(p_state), ''),
        nullif(btrim(p_license_number), ''),
        desc_final,
        coalesce(p_is_live, false),
        case when coalesce(p_is_live, false) then 'approved' else 'pending' end,
        coalesce(p_is_live, false),
        true,
        true,
        true
      )
      returning id into new_id;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return new_id;
end;
$$;

grant execute on function public.admin_create_dispensary(text, text, text, text, text, text, text, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Link an unclaimed directory dispensary to a user (gives them vendor dashboard)
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

  if cur_uid = p_user_id then
    return;
  end if;

  if exists (
    select 1 from public.vendors v2
    where v2.user_id = p_user_id and v2.id <> p_vendor_id
  ) then
    raise exception 'user already owns another vendor row; unlink or use a different account';
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

grant execute on function public.admin_link_vendor_user(uuid, uuid) to authenticated;

comment on function public.admin_create_dispensary is
  'Admin-only: insert vendors row with user_id null and is_directory_listing true until linked.';

comment on function public.admin_link_vendor_user is
  'Admin-only: set vendors.user_id and clear directory flag; set profile role to vendor.';
