-- Optional full-bleed background behind a vendor’s Smokers Club tree card (logo stays on solid tile).
alter table public.vendors
  add column if not exists smokers_club_tab_background_url text;

comment on column public.vendors.smokers_club_tab_background_url is
  'Public image URL for the Smokers Club tree/listing card backdrop; editable by vendor staff and admins.';
