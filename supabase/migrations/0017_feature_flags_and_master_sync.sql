-- Master account: callable after login to force admin role from auth email
-- (covers profiles created before email trigger or edge cases).

create or replace function public.sync_master_profile_role()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  em text;
begin
  if auth.uid() is null then
    return;
  end if;

  select lower(u.email) into em from auth.users u where u.id = auth.uid();

  if em = 'houseofprerolls@gmail.com' then
    update public.profiles
    set role = 'admin'
    where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.sync_master_profile_role() to authenticated;

-- Feature toggles (master admin can flip; public read for UI)
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  label text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_select_all on public.feature_flags;
create policy feature_flags_select_all
  on public.feature_flags for select
  using (true);

drop policy if exists feature_flags_admin_all on public.feature_flags;
create policy feature_flags_admin_all
  on public.feature_flags for all
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

insert into public.feature_flags (key, label, sort_order) values
  ('catalog_map', 'Catalog: vendor map', 10),
  ('catalog_products', 'Catalog: product grid', 20),
  ('nav_vendor_hub', 'Navigation: Vendor Hub link', 30),
  ('auth_signup', 'Allow new sign-ups', 40)
on conflict (key) do nothing;

create or replace function public.touch_feature_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feature_flags_updated on public.feature_flags;
create trigger trg_feature_flags_updated
before update on public.feature_flags
for each row execute function public.touch_feature_flags_updated_at();
