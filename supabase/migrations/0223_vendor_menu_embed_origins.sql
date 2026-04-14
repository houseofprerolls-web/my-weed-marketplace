-- Per-vendor HTTPS origins allowed to iframe the public menu embed route (CSP frame-ancestors).

create table if not exists public.vendor_menu_embed_origins (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  origin text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, origin)
);

create index if not exists vendor_menu_embed_origins_vendor_idx
  on public.vendor_menu_embed_origins (vendor_id);

comment on table public.vendor_menu_embed_origins is
  'Storefront origins (https://host only) allowed to iframe /embed/menu/{slug}; enforced via CSP frame-ancestors.';

alter table public.vendor_menu_embed_origins enable row level security;

drop policy if exists vendor_menu_embed_origins_staff_all on public.vendor_menu_embed_origins;
create policy vendor_menu_embed_origins_staff_all
  on public.vendor_menu_embed_origins
  for all
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_menu_embed_origins_admin_all on public.vendor_menu_embed_origins;
create policy vendor_menu_embed_origins_admin_all
  on public.vendor_menu_embed_origins
  for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

-- Anon-safe: origins for CSP (no secrets); only when vendor is public and online menu is on.
create or replace function public.vendor_embed_frame_ancestors_for_slug(p_slug text)
returns text[]
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    array_agg(distinct e.origin order by e.origin),
    array[]::text[]
  )
  from public.vendors v
  inner join public.vendor_menu_embed_origins e on e.vendor_id = v.id
  where public.vendor_is_publicly_visible(v.id)
    and coalesce(v.online_menu_enabled, true) = true
    and (
      lower(trim(v.slug)) = lower(trim(p_slug))
      or v.id::text = trim(p_slug)
    );
$$;

revoke all on function public.vendor_embed_frame_ancestors_for_slug(text) from public;
grant execute on function public.vendor_embed_frame_ancestors_for_slug(text) to anon, authenticated, service_role;

comment on function public.vendor_embed_frame_ancestors_for_slug(text) is
  'Returns allowed iframe parent origins for /embed/menu when the listing slug resolves to a live vendor with online menu.';
