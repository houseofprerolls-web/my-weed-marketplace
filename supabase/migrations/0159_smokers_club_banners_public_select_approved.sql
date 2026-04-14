-- Restore anonymous/public read of approved homepage banner rows for carousels (anon + logged-out shoppers).
-- Migration 0120 recreated admin/vendor policies but omitted the original public SELECT from 0058.

do $scb$
begin
  if to_regclass('public.smokers_club_homepage_banners') is null then
    return;
  end if;

  drop policy if exists smokers_club_banners_public_select_approved on public.smokers_club_homepage_banners;

  create policy smokers_club_banners_public_select_approved
    on public.smokers_club_homepage_banners
    for select
    using (status = 'approved');
end
$scb$;

comment on policy smokers_club_banners_public_select_approved on public.smokers_club_homepage_banners is
  'Anyone may read approved slides for homepage / discover / deals ad carousels.';
