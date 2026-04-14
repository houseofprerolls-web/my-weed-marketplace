/*
  Directory / admin-seeded vendors (no owner menu) should not show cart or public product menu.
*/

update public.vendors
set online_menu_enabled = false
where is_directory_listing is true;
