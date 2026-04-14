-- Brand page managers (self-serve editors assigned by admin) + safe showcase updates via RPC.

create table if not exists public.brand_page_managers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (brand_id, user_id)
);

create index if not exists brand_page_managers_user_idx on public.brand_page_managers (user_id);
create index if not exists brand_page_managers_brand_idx on public.brand_page_managers (brand_id);

alter table public.brand_page_managers enable row level security;

drop policy if exists brand_page_managers_select on public.brand_page_managers;
create policy brand_page_managers_select
  on public.brand_page_managers for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists brand_page_managers_insert_admin on public.brand_page_managers;
create policy brand_page_managers_insert_admin
  on public.brand_page_managers for insert
  to authenticated
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists brand_page_managers_delete_admin on public.brand_page_managers;
create policy brand_page_managers_delete_admin
  on public.brand_page_managers for delete
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

-- Managers can read their assigned brand even when not yet verified (for editing before go-live).
drop policy if exists brands_select_for_page_managers on public.brands;
create policy brands_select_for_page_managers
  on public.brands for select
  to authenticated
  using (
    exists (
      select 1
      from public.brand_page_managers m
      where m.brand_id = brands.id
        and m.user_id = auth.uid()
    )
  );

alter table public.brands add column if not exists updated_at timestamptz;

-- Whitelisted showcase fields only; managers or admins. Unknown json keys rejected.
create or replace function public.brand_manager_update_showcase(p_brand_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  k text;
  allowed constant text[] := array[
    'tagline', 'about', 'website_url', 'social_instagram', 'hero_image_url', 'page_theme', 'logo_url'
  ];
  themes constant text[] := array['emerald', 'violet', 'sunset', 'ocean', 'mono'];
  may_edit boolean;
  v_theme text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_patch is null then
    p_patch := '{}'::jsonb;
  end if;

  for k in select * from jsonb_object_keys(p_patch)
  loop
    if not (k = any (allowed)) then
      raise exception 'invalid field: %', k;
    end if;
  end loop;

  may_edit :=
    exists (
      select 1
      from public.brand_page_managers m
      where m.brand_id = p_brand_id
        and m.user_id = auth.uid()
    )
    or public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin();

  if not may_edit then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.brands b where b.id = p_brand_id) then
    raise exception 'brand not found';
  end if;

  v_theme := null;
  if p_patch ? 'page_theme' then
    v_theme := lower(trim(coalesce(p_patch->>'page_theme', '')));
    if v_theme is null or v_theme = '' then
      raise exception 'page_theme cannot be empty when provided';
    end if;
    if not (v_theme = any (themes)) then
      raise exception 'invalid page_theme';
    end if;
  end if;

  update public.brands b
  set
    tagline = case
      when p_patch ? 'tagline' then nullif(trim(p_patch->>'tagline'), '')
      else b.tagline
    end,
    about = case
      when p_patch ? 'about' then nullif(trim(p_patch->>'about'), '')
      else b.about
    end,
    website_url = case
      when p_patch ? 'website_url' then nullif(trim(p_patch->>'website_url'), '')
      else b.website_url
    end,
    social_instagram = case
      when p_patch ? 'social_instagram' then nullif(trim(p_patch->>'social_instagram'), '')
      else b.social_instagram
    end,
    hero_image_url = case
      when p_patch ? 'hero_image_url' then nullif(trim(p_patch->>'hero_image_url'), '')
      else b.hero_image_url
    end,
    logo_url = case
      when p_patch ? 'logo_url' then nullif(trim(p_patch->>'logo_url'), '')
      else b.logo_url
    end,
    page_theme = case
      when p_patch ? 'page_theme' then v_theme
      else b.page_theme
    end,
    updated_at = now()
  where b.id = p_brand_id;
end;
$$;

comment on function public.brand_manager_update_showcase(uuid, jsonb) is
  'Brand page managers and admins may update whitelisted showcase columns on brands; rejects unknown JSON keys.';

comment on table public.brand_page_managers is
  'Users who may edit public brand showcase fields via brand_manager_update_showcase; assigned by admins only (v1).';

revoke all on function public.brand_manager_update_showcase(uuid, jsonb) from public;
grant execute on function public.brand_manager_update_showcase(uuid, jsonb) to authenticated;
