-- Supply account deals (deal-first, then catalog products) + brand showcase edits for supply staff.

-- ---------------------------------------------------------------------------
-- brand_manager_update_showcase: allow supply_account_members for linked brand
-- ---------------------------------------------------------------------------

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
    or exists (
      select 1
      from public.supply_account_members m
      join public.supply_accounts sa on sa.id = m.supply_account_id
      where sa.brand_id = p_brand_id
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
  'Brand page managers, supply staff on linked supply_accounts.brand_id, and admins may update whitelisted showcase columns.';

-- Authenticated users linked via supply may read their brand row even if not yet verified (for editing).
drop policy if exists brands_select_for_supply_brand_linked on public.brands;
create policy brands_select_for_supply_brand_linked
  on public.brands for select
  to authenticated
  using (
    exists (
      select 1
      from public.supply_account_members m
      join public.supply_accounts sa on sa.id = m.supply_account_id
      where sa.brand_id = brands.id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- b2b_supply_deals + b2b_supply_deal_items
-- ---------------------------------------------------------------------------

create table if not exists public.b2b_supply_deals (
  id uuid primary key default gen_random_uuid(),
  supply_account_id uuid not null references public.supply_accounts (id) on delete cascade,
  headline text not null,
  description text,
  discount_percent numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_supply_deals_supply_account_idx on public.b2b_supply_deals (supply_account_id);

create table if not exists public.b2b_supply_deal_items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.b2b_supply_deals (id) on delete cascade,
  catalog_product_id uuid not null references public.catalog_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint b2b_supply_deal_items_deal_product unique (deal_id, catalog_product_id)
);

create index if not exists b2b_supply_deal_items_deal_idx on public.b2b_supply_deal_items (deal_id);
create index if not exists b2b_supply_deal_items_product_idx on public.b2b_supply_deal_items (catalog_product_id);

create or replace function public.touch_b2b_supply_deals_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists b2b_supply_deals_touch_updated on public.b2b_supply_deals;
create trigger b2b_supply_deals_touch_updated
  before update on public.b2b_supply_deals
  for each row execute function public.touch_b2b_supply_deals_updated_at();

create or replace function public.b2b_supply_deal_items_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sa uuid;
  v_brand uuid;
  v_prod_brand uuid;
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    select d.supply_account_id into v_sa
    from public.b2b_supply_deals d
    where d.id = new.deal_id;
    if v_sa is null then
      raise exception 'deal not found';
    end if;
    select sa.brand_id into v_brand
    from public.supply_accounts sa
    where sa.id = v_sa;
    if v_brand is null then
      raise exception 'supply account has no brand; attach catalog products only when brand-linked';
    end if;
    select cp.brand_id into v_prod_brand
    from public.catalog_products cp
    where cp.id = new.catalog_product_id;
    if v_prod_brand is null or v_prod_brand <> v_brand then
      raise exception 'catalog product must belong to this supply account brand';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists b2b_supply_deal_items_validate_trg on public.b2b_supply_deal_items;
create trigger b2b_supply_deal_items_validate_trg
  before insert or update on public.b2b_supply_deal_items
  for each row
  execute function public.b2b_supply_deal_items_validate();

alter table public.b2b_supply_deals enable row level security;
alter table public.b2b_supply_deal_items enable row level security;

drop policy if exists b2b_supply_deals_select on public.b2b_supply_deals;
create policy b2b_supply_deals_select
  on public.b2b_supply_deals for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
    or (
      exists (
        select 1 from public.supply_accounts sa
        where sa.id = supply_account_id and sa.is_published = true
      )
      and public.auth_has_any_vendor_access()
    )
  );

drop policy if exists b2b_supply_deals_write on public.b2b_supply_deals;
create policy b2b_supply_deals_write
  on public.b2b_supply_deals for all
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or public.supply_account_staff_may_manage(supply_account_id)
  );

drop policy if exists b2b_supply_deal_items_select on public.b2b_supply_deal_items;
create policy b2b_supply_deal_items_select
  on public.b2b_supply_deal_items for select
  to authenticated
  using (
    exists (
      select 1 from public.b2b_supply_deals d
      where d.id = b2b_supply_deal_items.deal_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(d.supply_account_id)
          or (
            exists (
              select 1 from public.supply_accounts sa
              where sa.id = d.supply_account_id and sa.is_published = true
            )
            and public.auth_has_any_vendor_access()
          )
        )
    )
  );

drop policy if exists b2b_supply_deal_items_write on public.b2b_supply_deal_items;
create policy b2b_supply_deal_items_write
  on public.b2b_supply_deal_items for all
  to authenticated
  using (
    exists (
      select 1 from public.b2b_supply_deals d
      where d.id = b2b_supply_deal_items.deal_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(d.supply_account_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.b2b_supply_deals d
      where d.id = b2b_supply_deal_items.deal_id
        and (
          public.auth_profiles_role_is_admin()
          or public.auth_is_profile_admin()
          or public.supply_account_staff_may_manage(d.supply_account_id)
        )
    )
  );

grant select, insert, update, delete on public.b2b_supply_deals to authenticated;
grant select, insert, update, delete on public.b2b_supply_deal_items to authenticated;

comment on table public.b2b_supply_deals is
  'Wholesale deals for a supply account; products attached in b2b_supply_deal_items.';
comment on table public.b2b_supply_deal_items is
  'Catalog products included in a supply deal (brand must match supply_accounts.brand_id).';
