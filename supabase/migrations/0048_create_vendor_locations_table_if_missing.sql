-- Create public.vendor_locations + baseline RLS when missing (0001_init never applied).
-- Requires PostGIS (geography) and public.vendors.
-- After this runs, re-run 0046 if vendor_locations_vendor_write was skipped earlier.

do $mig_create_vendor_locations_if_missing$
begin
  if to_regclass('public.vendor_locations') is not null then
    raise notice '0048: public.vendor_locations already exists — skipped';
    return;
  end if;

  if to_regclass('public.vendors') is null then
    raise exception
      '0048: public.vendors is missing. Apply vendor schema first, then re-run.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception
      '0048: public.profiles is missing. Apply profiles migrations first.';
  end if;

  create extension if not exists postgis;

  create table public.vendor_locations (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references public.vendors (id) on delete cascade,
    address text not null,
    city text,
    state text,
    zip text,
    lat double precision,
    lng double precision,
    location geography (Point, 4326),
    hours jsonb,
    services text[] not null default '{}'::text[],
    created_at timestamptz not null default now()
  );

  create index if not exists vendor_locations_vendor_idx on public.vendor_locations (vendor_id);

  alter table public.vendor_locations enable row level security;

  create policy vendor_locations_public_select on public.vendor_locations
    for select
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    );

  -- Owner match only (aligned with 0046); covers select/insert/update/delete for linked stores.
  create policy vendor_locations_vendor_write on public.vendor_locations
    for all
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.user_id = auth.uid()
      )
    );

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    create policy vendor_locations_admin_all on public.vendor_locations
      for all
      using (public.auth_is_profile_admin())
      with check (public.auth_is_profile_admin());
  else
    create policy vendor_locations_admin_all on public.vendor_locations
      for all
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;

  grant select on table public.vendor_locations to anon;
  grant select, insert, update, delete on table public.vendor_locations to authenticated;
  grant all on table public.vendor_locations to service_role;

  raise notice '0048: created public.vendor_locations, index, RLS, and grants';
end;
$mig_create_vendor_locations_if_missing$;
