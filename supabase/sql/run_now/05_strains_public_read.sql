-- Ensure RLS is enabled and configure policies for the strain encyclopedia.
-- Tables are created in `0001_init.sql`.

alter table public.effects enable row level security;
alter table public.terpenes enable row level security;
alter table public.strains enable row level security;
alter table public.strain_effects enable row level security;
alter table public.strain_terpenes enable row level security;

-- Public reads (consumers see the encyclopedia).
drop policy if exists "effects_public_select" on public.effects;
create policy "effects_public_select"
  on public.effects
  for select
  using (true);

drop policy if exists "terpenes_public_select" on public.terpenes;
create policy "terpenes_public_select"
  on public.terpenes
  for select
  using (true);

drop policy if exists "strains_public_select" on public.strains;
create policy "strains_public_select"
  on public.strains
  for select
  using (true);

drop policy if exists "strain_effects_public_select" on public.strain_effects;
create policy "strain_effects_public_select"
  on public.strain_effects
  for select
  using (true);

drop policy if exists "strain_terpenes_public_select" on public.strain_terpenes;
create policy "strain_terpenes_public_select"
  on public.strain_terpenes
  for select
  using (true);

-- Admin writes (for ingestion/admin tooling).
-- Admin-only predicate comes from `public.profiles.role = 'admin'`.
drop policy if exists "effects_admin_write" on public.effects;
create policy "effects_admin_write"
  on public.effects
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "terpenes_admin_write" on public.terpenes;
create policy "terpenes_admin_write"
  on public.terpenes
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "strains_admin_write" on public.strains;
create policy "strains_admin_write"
  on public.strains
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "strain_effects_admin_write" on public.strain_effects;
create policy "strain_effects_admin_write"
  on public.strain_effects
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "strain_terpenes_admin_write" on public.strain_terpenes;
create policy "strain_terpenes_admin_write"
  on public.strain_terpenes
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );