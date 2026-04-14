-- Mirrors supabase/migrations/0033_reviews_select_author_and_public.sql — paste in Supabase SQL editor if migrations were skipped.

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid references auth.users (id) on delete set null,
  entity_type text not null
    check (entity_type in ('strain', 'product', 'vendor')),
  entity_id uuid not null,
  rating int not null check (rating >= 1 and rating <= 5),
  title text not null,
  body text,
  photos text[] not null default '{}'::text[],
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_entity_idx on public.reviews (entity_type, entity_id);

alter table public.reviews enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reviews_set_updated_at on public.reviews;
create trigger trg_reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- Public reads: your own rows + vendor reviews for live, approved shops.
-- (Strain/product review visibility can be added later if those tables exist in your project.)
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select
  on public.reviews for select
  using (
    reviewer_id = auth.uid()
    or (
      entity_type = 'vendor'
      and exists (
        select 1
        from public.vendors v
        where v.id = entity_id
          and v.is_live = true
          and v.license_status = 'approved'
      )
    )
  );

drop policy if exists reviews_reviewer_insert on public.reviews;
create policy reviews_reviewer_insert
  on public.reviews for insert
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_reviewer_write on public.reviews;
create policy reviews_reviewer_write
  on public.reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

comment on table public.reviews is
  'Ratings for strain, product, or vendor entities; listing page uses entity_type=vendor.';
