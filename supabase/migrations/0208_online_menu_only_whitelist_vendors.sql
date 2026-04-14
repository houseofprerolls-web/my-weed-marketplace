-- Turn off public online menus for all vendors except the four launch partners.
-- Slug variants match prior banner / cleanup migrations (0149, 0197).

do $whitelist_menu$
begin
  if to_regclass('public.vendors') is null then
    return;
  end if;

  execute $sql$update public.vendors set online_menu_enabled = false$sql$;

  execute $sql$
    update public.vendors
    set online_menu_enabled = true
    where lower(slug) in (
      'house-of-prerolls',
      'super-fresh-farms',
      'superfresh-farms',
      'super-fresh',
      'uncle-green',
      'unclegreen',
      'uncle-green-dispensary',
      'green-haven',
      'green-haven-la',
      'greenhaven'
    )
  $sql$;
end $whitelist_menu$;
