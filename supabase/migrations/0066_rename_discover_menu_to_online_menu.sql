/*
  Projects that already applied the older 0065 (discover_menu_visible) get renamed here.
  Fresh installs use 0065 only (online_menu_enabled).
*/

alter table public.vendors
  add column if not exists contact_email text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'discover_menu_visible'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'online_menu_enabled'
  ) then
    alter table public.vendors rename column discover_menu_visible to online_menu_enabled;
  end if;
end $$;

alter table public.vendors
  add column if not exists online_menu_enabled boolean not null default true;

comment on column public.vendors.online_menu_enabled is
  'When false, public listing hides menu and cart/checkout; phone / optional storefront address / contact_email only.';

comment on column public.vendors.contact_email is
  'Optional store email shown on public listing (especially when online menu is off).';
