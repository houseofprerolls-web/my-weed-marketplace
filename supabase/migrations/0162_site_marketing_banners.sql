-- Replace smokers_club_homepage_banners with a slimmer site_marketing_banners model.
-- Drops banner_kind and slot_preset (UI uses fixed wide layout). Status "approved" becomes "active".

create table if not exists public.site_marketing_banners (
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

create index if not exists site_marketing_banners_placement_status_idx
  on public.site_marketing_banners (placement_key, status);

create index if not exists site_marketing_banners_vendor_idx
  on public.site_marketing_banners (vendor_id)
  where vendor_id is not null;

create index if not exists site_marketing_banners_status_placement_market_idx
  on public.site_marketing_banners (status, placement_key, listing_market_id);

create unique index if not exists site_marketing_banners_one_active_vendor_placement_market
  on public.site_marketing_banners (vendor_id, placement_key, listing_market_id)
  where status = 'active' and vendor_id is not null;

create unique index if not exists site_marketing_banners_one_active_vendor_placement_global
  on public.site_marketing_banners (vendor_id, placement_key)
  where status = 'active' and vendor_id is not null and listing_market_id is null;

comment on table public.site_marketing_banners is
  'Carousel slides for homepage, discover, deals, etc. Public reads rows with status=active only.';

do $migrate$
begin
  if to_regclass('public.smokers_club_homepage_banners') is null then
    return;
  end if;

  insert into public.site_marketing_banners (
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
    coalesce(b.placement_key, 'homepage_hero'),
    null,
    b.image_url,
    b.link_url,
    0,
    b.listing_market_id,
    b.vendor_id,
    b.admin_note,
    case b.status
      when 'approved' then 'active'
      when 'pending' then 'pending'
      when 'rejected' then 'rejected'
      when 'archived' then 'archived'
      else 'archived'
    end,
    b.created_at,
    coalesce(b.updated_at, b.created_at)
  from public.smokers_club_homepage_banners b;
end
$migrate$;

drop table if exists public.smokers_club_homepage_banners cascade;

alter table public.site_marketing_banners enable row level security;

drop policy if exists site_marketing_banners_public_select_active on public.site_marketing_banners;
create policy site_marketing_banners_public_select_active
  on public.site_marketing_banners for select
  using (status = 'active');

drop policy if exists site_marketing_banners_admin_all on public.site_marketing_banners;
create policy site_marketing_banners_admin_all
  on public.site_marketing_banners for all
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists site_marketing_banners_vendor_select_own on public.site_marketing_banners;
create policy site_marketing_banners_vendor_select_own
  on public.site_marketing_banners for select
  to authenticated
  using (
    vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

drop policy if exists site_marketing_banners_vendor_insert on public.site_marketing_banners;
create policy site_marketing_banners_vendor_insert
  on public.site_marketing_banners for insert
  to authenticated
  with check (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_smokers_club_banner_submit_ok(vendor_id)
  );

drop policy if exists site_marketing_banners_vendor_delete_pending on public.site_marketing_banners;
create policy site_marketing_banners_vendor_delete_pending
  on public.site_marketing_banners for delete
  to authenticated
  using (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

grant select on public.site_marketing_banners to anon;
grant select, insert, delete on public.site_marketing_banners to authenticated;
