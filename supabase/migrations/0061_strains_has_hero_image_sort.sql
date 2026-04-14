-- Sort strains with a non-empty image_url before those without (public + admin lists).
-- Generated column keeps PostgREST order-by simple and avoids client-side re-sorting pages.

alter table public.strains
  add column if not exists has_hero_image boolean
  generated always as (
    image_url is not null and btrim(image_url) <> ''
  ) stored;

comment on column public.strains.has_hero_image is 'True when image_url is set; used for directory sort (photos first).';

create index if not exists strains_has_hero_popularity_idx
  on public.strains (has_hero_image desc, popularity_score desc nulls last);

create index if not exists strains_has_hero_name_idx
  on public.strains (has_hero_image desc, name asc);
