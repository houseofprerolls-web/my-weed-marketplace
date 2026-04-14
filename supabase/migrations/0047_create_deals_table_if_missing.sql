-- Create public.deals + RLS when the table is missing (0001_init never applied, but vendor UI expects deals).
-- Includes deal_options jsonb (0039 / vendor deals form).
-- After this runs, re-apply 0046 if deals_vendor_write was skipped earlier.

do $mig_create_deals_if_missing$
begin
  if to_regclass('public.deals') is not null then
    raise notice '0047: public.deals already exists — skipped';
    return;
  end if;

  if to_regclass('public.vendors') is null then
    raise exception
      '0047: public.vendors is missing. Apply vendor schema first, then re-run.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception
      '0047: public.profiles is missing. Apply profiles migrations first.';
  end if;

  create table public.deals (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references public.vendors (id) on delete cascade,
    title text not null,
    description text,
    discount_percent int not null check (discount_percent >= 0 and discount_percent <= 100),
    products uuid[] not null default '{}'::uuid[],
    start_date date not null default current_date,
    end_date date not null default current_date,
    deal_options jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create index if not exists deals_vendor_idx on public.deals (vendor_id);

  alter table public.deals enable row level security;

  create policy deals_public_select on public.deals
    for select
    using (
      exists (
        select 1
        from public.vendors v
        where v.id = vendor_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
      and current_date >= start_date
      and current_date <= end_date
    );

  -- Owner match only (aligned with 0046); no profiles.role = vendor requirement.
  create policy deals_vendor_write on public.deals
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
    create policy deals_admin_all on public.deals
      for all
      using (public.auth_is_profile_admin())
      with check (public.auth_is_profile_admin());
  else
    create policy deals_admin_all on public.deals
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

  grant select on table public.deals to anon;
  grant select, insert, update, delete on table public.deals to authenticated;
  grant all on table public.deals to service_role;

  raise notice '0047: created public.deals, indexes, RLS, and grants';
end;
$mig_create_deals_if_missing$;
