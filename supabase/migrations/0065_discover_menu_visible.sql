/*
  Public online menu + cart. When false, listing is contact-only; shop stays on Discover/directory.
  Optional contact_email for shoppers when the menu is off.
*/

alter table public.vendors
  add column if not exists online_menu_enabled boolean not null default true;

alter table public.vendors
  add column if not exists contact_email text;

comment on column public.vendors.online_menu_enabled is
  'When false, public listing hides menu and cart/checkout; phone / optional storefront address / contact_email only.';

comment on column public.vendors.contact_email is
  'Optional store email shown on public listing (especially when online menu is off).';
