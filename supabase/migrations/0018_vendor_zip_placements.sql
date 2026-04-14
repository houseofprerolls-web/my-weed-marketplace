-- Premium / sponsored ordering per customer ZIP (5-digit US).
-- Public read for catalog API; only admins manage rows.

create table if not exists public.vendor_zip_placements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  zip text not null
    check (char_length(zip) = 5 and zip ~ '^[0-9]{5}$'),
  -- Lower = closer to top of premium list for this ZIP.
  slot_rank int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (vendor_id, zip)
);

create index if not exists vendor_zip_placements_zip_rank_idx
  on public.vendor_zip_placements (zip, slot_rank);

alter table public.vendor_zip_placements enable row level security;

drop policy if exists vendor_zip_placements_public_select on public.vendor_zip_placements;
create policy vendor_zip_placements_public_select
  on public.vendor_zip_placements for select
  using (true);

drop policy if exists vendor_zip_placements_admin_all on public.vendor_zip_placements;
create policy vendor_zip_placements_admin_all
  on public.vendor_zip_placements for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
