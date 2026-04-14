-- Strain encyclopedia + catalog columns for /strains UI and CSV seed scripts.
-- Safe when 0001_init was never applied: creates core tables first, then adds any missing columns.
-- Do not store third-party editorial/marketing text in `description`; use original summaries.

-- Parent lookup tables (needed if strain junction tables are used later).
create table if not exists public.effects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.terpenes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.strains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,

  type text not null
    check (type in ('indica', 'sativa', 'hybrid')),

  thc_min numeric,
  thc_max numeric,
  cbd_min numeric,
  cbd_max numeric,

  terpenes jsonb not null default '{}'::jsonb,
  effects text[] not null default '{}'::text[],
  flavors text[] not null default '{}'::text[],

  genetics text,
  description text,
  cannabis_guide_colors jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  image_url text,
  popularity_score integer not null default 0,
  rating numeric default 0,
  review_count integer not null default 0,
  best_time text default 'anytime',
  updated_at timestamptz not null default now(),
  data_source text
);

create table if not exists public.strain_effects (
  strain_id uuid not null references public.strains (id) on delete cascade,
  effect_id uuid not null references public.effects (id) on delete cascade,
  primary key (strain_id, effect_id)
);

create table if not exists public.strain_terpenes (
  strain_id uuid not null references public.strains (id) on delete cascade,
  terpene_id uuid not null references public.terpenes (id) on delete cascade,
  primary key (strain_id, terpene_id)
);

-- Legacy DBs that already had `strains` without catalog columns:
alter table public.strains
  add column if not exists image_url text;

alter table public.strains
  add column if not exists popularity_score integer not null default 0;

alter table public.strains
  add column if not exists rating numeric default 0;

alter table public.strains
  add column if not exists review_count integer not null default 0;

alter table public.strains
  add column if not exists best_time text default 'anytime';

alter table public.strains
  add column if not exists updated_at timestamptz not null default now();

alter table public.strains
  add column if not exists data_source text;

comment on column public.strains.image_url is 'Optional hero image URL (respect hotlinking/CDN terms of the host).';
comment on column public.strains.popularity_score is 'Higher sorts first in /strains; seed from import order or manual.';
comment on column public.strains.data_source is 'Import provenance label (e.g. csv_metadata); not third-party prose.';

create index if not exists strains_slug_idx on public.strains (slug);

create index if not exists strains_popularity_score_idx
  on public.strains (popularity_score desc nulls last);

-- RLS (idempotent if 0002 already ran).
alter table public.effects enable row level security;
alter table public.terpenes enable row level security;
alter table public.strains enable row level security;
alter table public.strain_effects enable row level security;
alter table public.strain_terpenes enable row level security;

drop policy if exists "effects_public_select" on public.effects;
create policy "effects_public_select"
  on public.effects for select using (true);

drop policy if exists "terpenes_public_select" on public.terpenes;
create policy "terpenes_public_select"
  on public.terpenes for select using (true);

drop policy if exists "strains_public_select" on public.strains;
create policy "strains_public_select"
  on public.strains for select using (true);

drop policy if exists "strain_effects_public_select" on public.strain_effects;
create policy "strain_effects_public_select"
  on public.strain_effects for select using (true);

drop policy if exists "strain_terpenes_public_select" on public.strain_terpenes;
create policy "strain_terpenes_public_select"
  on public.strain_terpenes for select using (true);

drop policy if exists "effects_admin_write" on public.effects;
create policy "effects_admin_write"
  on public.effects for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "terpenes_admin_write" on public.terpenes;
create policy "terpenes_admin_write"
  on public.terpenes for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "strains_admin_write" on public.strains;
create policy "strains_admin_write"
  on public.strains for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "strain_effects_admin_write" on public.strain_effects;
create policy "strain_effects_admin_write"
  on public.strain_effects for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "strain_terpenes_admin_write" on public.strain_terpenes;
create policy "strain_terpenes_admin_write"
  on public.strain_terpenes for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
