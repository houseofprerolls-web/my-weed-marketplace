-- Homepage Smokers Club banner ads: vendor submits → admin approves; carousel uses tree slot for dwell time weighting.
create table if not exists public.smokers_club_homepage_banners (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  image_url text not null,
  link_url text,
  slot_preset text not null default 'wide_banner'
    check (slot_preset in (
      'wide_banner',
      'hero_strip',
      'square_tile',
      'tall_sidebar',
      'leaderboard'
    )),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'archived')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smokers_club_homepage_banners_vendor_idx
  on public.smokers_club_homepage_banners (vendor_id);
create index if not exists smokers_club_homepage_banners_status_idx
  on public.smokers_club_homepage_banners (status);

-- Only one live creative per vendor at a time.
create unique index if not exists smokers_club_homepage_banners_one_approved_per_vendor
  on public.smokers_club_homepage_banners (vendor_id)
  where status = 'approved';

comment on table public.smokers_club_homepage_banners is
  'Smokers Club vendors submit homepage banner art; admins approve. Public sees approved rows only.';

alter table public.smokers_club_homepage_banners enable row level security;

drop policy if exists smokers_club_banners_public_select_approved on public.smokers_club_homepage_banners;
create policy smokers_club_banners_public_select_approved
  on public.smokers_club_homepage_banners
  for select
  using (status = 'approved');

drop policy if exists smokers_club_banners_vendor_select_own on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_select_own
  on public.smokers_club_homepage_banners
  for select
  to authenticated
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists smokers_club_banners_admin_all on public.smokers_club_homepage_banners;
create policy smokers_club_banners_admin_all
  on public.smokers_club_homepage_banners
  for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists smokers_club_banners_vendor_insert on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_insert
  on public.smokers_club_homepage_banners
  for insert
  to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
        and coalesce(v.smokers_club_eligible, false) = true
    )
  );

drop policy if exists smokers_club_banners_vendor_delete_pending on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_delete_pending
  on public.smokers_club_homepage_banners
  for delete
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );
