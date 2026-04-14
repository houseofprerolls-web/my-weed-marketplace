-- Per-market operating approval: admins toggle which listing_markets a vendor may serve.
-- ZIP changes auto-create a pending row for that vendor's primary market (approved = false until admin turns on).

create table if not exists public.vendor_market_operations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  approved boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique (vendor_id, market_id)
);

create index if not exists vendor_market_operations_vendor_idx
  on public.vendor_market_operations (vendor_id);

create index if not exists vendor_market_operations_market_idx
  on public.vendor_market_operations (market_id);

comment on table public.vendor_market_operations is
  'Admin-approved markets where a vendor may operate (Smokers Club, placements, future directory scoping).';

alter table public.vendor_market_operations enable row level security;

drop policy if exists vendor_market_operations_public_select on public.vendor_market_operations;
create policy vendor_market_operations_public_select
  on public.vendor_market_operations for select
  using (approved = true);

drop policy if exists vendor_market_operations_admin_all on public.vendor_market_operations;
create policy vendor_market_operations_admin_all
  on public.vendor_market_operations for all
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

-- Optional: vendor sees own rows (pending + approved) for future vendor UI
drop policy if exists vendor_market_operations_owner_select on public.vendor_market_operations;
create policy vendor_market_operations_owner_select
  on public.vendor_market_operations for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

-- After INSERT/UPDATE zip: ensure a row exists for ZIP-derived market (pending until admin approves)
create or replace function public.sync_vendor_market_from_zip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  z text;
  pref text;
  m_id uuid;
begin
  z := regexp_replace(coalesce(new.zip, ''), '\D', '', 'g');
  if length(z) < 5 then
    return new;
  end if;
  pref := left(z, 3);

  select m.market_id into m_id
  from public.market_zip_prefixes m
  where m.prefix = pref
  limit 1;

  if m_id is null then
    select lm.id into m_id
    from public.listing_markets lm
    where lm.slug = 'california-other'
    limit 1;
  end if;

  if m_id is not null then
    insert into public.vendor_market_operations (vendor_id, market_id, approved)
    values (new.id, m_id, false)
    on conflict (vendor_id, market_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists vendors_zip_sync_markets on public.vendors;
create trigger vendors_zip_sync_markets
  after insert or update of zip on public.vendors
  for each row
  execute procedure public.sync_vendor_market_from_zip();

-- Backfill pending rows from existing ZIPs
do $$
declare
  r record;
  z text;
  pref text;
  m_id uuid;
begin
  for r in select id, zip from public.vendors loop
    z := regexp_replace(coalesce(r.zip, ''), '\D', '', 'g');
    continue when length(z) < 5;
    pref := left(z, 3);
    select m.market_id into m_id from public.market_zip_prefixes m where m.prefix = pref limit 1;
    if m_id is null then
      select lm.id into m_id from public.listing_markets lm where lm.slug = 'california-other' limit 1;
    end if;
    if m_id is not null then
      insert into public.vendor_market_operations (vendor_id, market_id, approved)
      values (r.id, m_id, false)
      on conflict (vendor_id, market_id) do nothing;
    end if;
  end loop;
end $$;
