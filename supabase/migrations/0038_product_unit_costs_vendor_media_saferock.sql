-- Per-SKU unit cost (COGS) for vendor profit; kept out of public.products SELECT surface via separate table + RLS.
-- Public bucket for vendor-uploaded images (first path segment = auth.uid()).
-- Saferock is the designated master QA storefront: link name/slug “Saferock” → houseofprerolls@gmail.com
-- so vendor dashboard / menu tests always use that auth user when present.
--
-- NOTE: `product_unit_costs` is skipped when `public.products` does not exist (e.g. project never ran
-- CannaHub `0001_init.sql`). Storage + Saferock still apply. After you create `products`, re-run the
-- block below manually or add a follow-up migration that only creates `product_unit_costs`.

-- ---------------------------------------------------------------------------
-- product_unit_costs (only if public.products exists)
-- ---------------------------------------------------------------------------
do $product_unit_costs_0038$
begin
  if to_regclass('public.products') is null then
    raise notice
      '0038: public.products does not exist — skipped product_unit_costs. Apply base schema (supabase/migrations/0001_init.sql) then create this table or re-run a migration that adds it.';
    return;
  end if;

  create table if not exists public.product_unit_costs (
    product_id uuid primary key references public.products (id) on delete cascade,
    unit_cost_cents int not null default 0 check (unit_cost_cents >= 0),
    updated_at timestamptz not null default now()
  );

  create index if not exists product_unit_costs_product_idx on public.product_unit_costs (product_id);

  alter table public.product_unit_costs enable row level security;

  drop policy if exists product_unit_costs_vendor_all on public.product_unit_costs;
  create policy product_unit_costs_vendor_all
    on public.product_unit_costs for all
    to authenticated
    using (
      exists (
        select 1
        from public.products p
        join public.vendors v on v.id = p.vendor_id
        where p.id = product_unit_costs.product_id
          and v.user_id = auth.uid()
      )
      and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'vendor')
    )
    with check (
      exists (
        select 1
        from public.products p
        join public.vendors v on v.id = p.vendor_id
        where p.id = product_unit_costs.product_id
          and v.user_id = auth.uid()
      )
      and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'vendor')
    );

  drop policy if exists product_unit_costs_admin_all on public.product_unit_costs;
  create policy product_unit_costs_admin_all
    on public.product_unit_costs for all
    to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

  comment on table public.product_unit_costs is
    'Vendor-only COGS per product unit (cents). Used with order line snapshots / catalog for margin.';
end
$product_unit_costs_0038$;

-- ---------------------------------------------------------------------------
-- Storage: vendor-media (public read; writes scoped to folder = user id)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-media',
  'vendor-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vendor_media_public_read on storage.objects;
create policy vendor_media_public_read
  on storage.objects for select
  using (bucket_id = 'vendor-media');

drop policy if exists vendor_media_insert_own on storage.objects;
create policy vendor_media_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-media'
    and coalesce((storage.foldername (name))[1], '') = auth.uid()::text
  );

drop policy if exists vendor_media_update_own on storage.objects;
create policy vendor_media_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and coalesce((storage.foldername (name))[1], '') = auth.uid()::text
  )
  with check (
    bucket_id = 'vendor-media'
    and coalesce((storage.foldername (name))[1], '') = auth.uid()::text
  );

drop policy if exists vendor_media_delete_own on storage.objects;
create policy vendor_media_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and coalesce((storage.foldername (name))[1], '') = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Link Saferock → master account (must exist in auth.users). Re-applied in 0043/0044 for slug `saferock`.
-- ---------------------------------------------------------------------------
do $saferock_0038$
declare
  master_id uuid;
  updated_count int;
begin
  if to_regclass('public.vendors') is null then
    raise notice '0038: public.vendors does not exist — Saferock link skipped';
    return;
  end if;

  select u.id
    into master_id
  from auth.users u
  where lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
  limit 1;

  if master_id is null then
    raise notice '0038: auth user houseofprerolls@gmail.com not found; Saferock link skipped';
    return;
  end if;

  update public.vendors v
  set
    user_id = master_id,
    is_directory_listing = false
  where (
    lower(v.name) like '%saferock%'
    or lower(v.slug) like '%saferock%'
  );

  get diagnostics updated_count = row_count;
  raise notice '0038: Saferock vendor rows updated: %', updated_count;
end
$saferock_0038$;
