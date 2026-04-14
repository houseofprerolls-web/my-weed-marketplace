-- Option B: Replace site_marketing_banners with marketing_banner_slides (copy rows, RLS, drop legacy).

create table if not exists public.marketing_banner_slides (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null default 'homepage_hero',
  title text,
  image_url text not null,
  link_url text,
  sort_order int not null default 0,
  listing_market_id uuid references public.listing_markets (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete cascade,
  admin_note text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.marketing_banner_slides is
  'Marketing carousel slides (homepage, discover, deals, etc.). Public reads status=active only. Replaces site_marketing_banners.';

do $migrate$
begin
  if to_regclass('public.site_marketing_banners') is null then
    raise notice '0167: site_marketing_banners missing — marketing_banner_slides left as created (empty or pre-seeded)';
    return;
  end if;

  insert into public.marketing_banner_slides (
    id,
    placement_key,
    title,
    image_url,
    link_url,
    sort_order,
    listing_market_id,
    vendor_id,
    admin_note,
    status,
    created_at,
    updated_at
  )
  select
    id,
    placement_key,
    title,
    image_url,
    link_url,
    sort_order,
    listing_market_id,
    vendor_id,
    admin_note,
    status,
    created_at,
    updated_at
  from public.site_marketing_banners
  on conflict (id) do nothing;
end
$migrate$;

create index if not exists marketing_banner_slides_placement_status_idx
  on public.marketing_banner_slides (placement_key, status);

create index if not exists marketing_banner_slides_vendor_idx
  on public.marketing_banner_slides (vendor_id)
  where vendor_id is not null;

create index if not exists marketing_banner_slides_status_placement_market_idx
  on public.marketing_banner_slides (status, placement_key, listing_market_id);

create unique index if not exists marketing_banner_slides_one_active_vendor_placement_market
  on public.marketing_banner_slides (vendor_id, placement_key, listing_market_id)
  where status = 'active' and vendor_id is not null;

create unique index if not exists marketing_banner_slides_one_active_vendor_placement_global
  on public.marketing_banner_slides (vendor_id, placement_key)
  where status = 'active' and vendor_id is not null and listing_market_id is null;

alter table public.marketing_banner_slides enable row level security;

drop policy if exists marketing_banner_slides_public_select_active on public.marketing_banner_slides;
create policy marketing_banner_slides_public_select_active
  on public.marketing_banner_slides for select
  using (status = 'active');

drop policy if exists marketing_banner_slides_admin_all on public.marketing_banner_slides;
create policy marketing_banner_slides_admin_all
  on public.marketing_banner_slides for all
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists marketing_banner_slides_vendor_select_own on public.marketing_banner_slides;
create policy marketing_banner_slides_vendor_select_own
  on public.marketing_banner_slides for select
  to authenticated
  using (
    vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

drop policy if exists marketing_banner_slides_vendor_insert on public.marketing_banner_slides;
create policy marketing_banner_slides_vendor_insert
  on public.marketing_banner_slides for insert
  to authenticated
  with check (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_smokers_club_banner_submit_ok(vendor_id)
  );

drop policy if exists marketing_banner_slides_vendor_delete_pending on public.marketing_banner_slides;
create policy marketing_banner_slides_vendor_delete_pending
  on public.marketing_banner_slides for delete
  to authenticated
  using (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

grant select on public.marketing_banner_slides to anon;
grant select, insert, update, delete on public.marketing_banner_slides to authenticated;

drop table if exists public.site_marketing_banners cascade;
