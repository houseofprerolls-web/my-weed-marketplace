-- Allow platform/admin spotlight banners without a vendor; keep one approved creative per vendor when vendor_id is set.
alter table public.smokers_club_homepage_banners
  add column if not exists banner_kind text not null default 'vendor'
    check (banner_kind in ('vendor', 'admin'));

comment on column public.smokers_club_homepage_banners.banner_kind is
  'vendor = submitted by shop; admin = curated homepage-only (no vendor_id).';

alter table public.smokers_club_homepage_banners
  alter column vendor_id drop not null;

alter table public.smokers_club_homepage_banners
  drop constraint if exists smokers_club_homepage_banners_vendor_kind_chk;

alter table public.smokers_club_homepage_banners
  add constraint smokers_club_homepage_banners_vendor_kind_chk
  check (
    (banner_kind = 'vendor' and vendor_id is not null)
    or (banner_kind = 'admin' and vendor_id is null)
  );

drop index if exists smokers_club_homepage_banners_one_approved_per_vendor;

create unique index smokers_club_homepage_banners_one_approved_per_vendor
  on public.smokers_club_homepage_banners (vendor_id)
  where status = 'approved' and vendor_id is not null;

-- Vendor may only see rows that belong to their shop (not admin rows).
drop policy if exists smokers_club_banners_vendor_select_own on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_select_own
  on public.smokers_club_homepage_banners
  for select
  to authenticated
  using (
    vendor_id is not null
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists smokers_club_banners_vendor_delete_pending on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_delete_pending
  on public.smokers_club_homepage_banners
  for delete
  to authenticated
  using (
    status = 'pending'
    and vendor_id is not null
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );
