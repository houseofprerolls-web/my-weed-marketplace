-- =============================================================================
-- 0211 — Global Smokers Club slot pins (Direction B)
-- Replaces per-market vendor_market_listings reads for club lanes at runtime.
-- =============================================================================

create table if not exists public.smokers_club_slot_pins (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  slot_rank int not null,
  club_lane text not null,
  active boolean not null default true,
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smokers_club_slot_pins_slot_rank_check
    check (slot_rank >= 1 and slot_rank <= 7),
  constraint smokers_club_slot_pins_club_lane_check
    check (club_lane in ('delivery', 'storefront', 'treehouse')),
  constraint smokers_club_slot_pins_lane_slot_key unique (club_lane, slot_rank)
);

create index if not exists smokers_club_slot_pins_lane_active_idx
  on public.smokers_club_slot_pins (club_lane, active);

comment on table public.smokers_club_slot_pins is
  'Admin-managed Smokers Club feature slots (global, not per listing_market). Public read; admin write.';

-- Backfill: one row per (club_lane, slot_rank); if multiple markets conflict, keep most recently created row.
insert into public.smokers_club_slot_pins (
  vendor_id,
  slot_rank,
  club_lane,
  active,
  note,
  expires_at,
  created_at,
  updated_at
)
select distinct on (vml.club_lane, vml.slot_rank)
  vml.vendor_id,
  vml.slot_rank,
  vml.club_lane,
  vml.active,
  vml.note,
  null,
  vml.created_at,
  now()
from public.vendor_market_listings vml
where vml.club_lane in ('delivery', 'storefront', 'treehouse')
  and vml.slot_rank between 1 and 7
order by vml.club_lane, vml.slot_rank, vml.created_at desc
on conflict (club_lane, slot_rank) do update set
  vendor_id = excluded.vendor_id,
  active = excluded.active,
  note = excluded.note,
  updated_at = now();

alter table public.smokers_club_slot_pins enable row level security;

drop policy if exists smokers_club_slot_pins_public_select on public.smokers_club_slot_pins;
create policy smokers_club_slot_pins_public_select
  on public.smokers_club_slot_pins for select
  using (true);

drop policy if exists smokers_club_slot_pins_admin_all on public.smokers_club_slot_pins;
create policy smokers_club_slot_pins_admin_all
  on public.smokers_club_slot_pins for all
  using (
    public.auth_profiles_role_is_admin()
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  )
  with check (
    public.auth_profiles_role_is_admin()
    or lower(trim(coalesce((auth.jwt() ->> 'email')::text, ''))) = 'houseofprerolls@gmail.com'
  );
