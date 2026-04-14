-- THC min/max: 20–38%, wide variety (tiers + spreads), many strains with mins in the 30s.
-- Indica biased higher; sativa a bit lower. Deterministic from slug + type + optional seed.
-- Requires public.strains (0060).

with s as (
  select
    id,
    slug,
    lower(coalesce(type, 'hybrid')) as stype,
    coalesce(nullif(thc_min, 0), nullif(thc_max, 0))::double precision as seed_thc
  from public.strains
),
h as (
  select
    s.*,
    abs(hashtext(s.slug::text)) as h1,
    abs(hashtext(coalesce(s.slug, '') || '!')) as h2,
    abs(hashtext(coalesce(s.slug, '') || '@')) as h3
  from s
),
tier as (
  select
    id,
    slug,
    stype,
    seed_thc,
    mod(h1, 12) as tier12,
    (2.5 + mod(h2, 14))::double precision * 0.55 as spread_w,
    case lower(stype)
      when 'indica' then 1.6 + (mod(h3, 6))::double precision * 0.4
      when 'sativa' then -(0.8 + (mod(h2, 5))::double precision * 0.35)
      else (mod(h1, 5))::double precision * 0.25 - 0.5
    end as type_adj,
    case
      when mod(h1, 12) < 3 then 30.2 + (mod(h3, 16))::double precision * 0.48
      when mod(h1, 12) < 6 then 25.5 + (mod(h2, 17))::double precision * 0.52
      when mod(h1, 12) < 9 then 22.0 + (mod(h3, 15))::double precision * 0.58
      else 20.0 + (mod(h2, 12))::double precision * 0.52
    end as tier_anchor
  from h
),
merged as (
  select
    id,
    slug,
    stype,
    spread_w,
    type_adj,
    case
      when seed_thc is not null and seed_thc >= 20 then
        seed_thc * 0.42 + tier_anchor * 0.58 + type_adj
          + (mod(abs(hashtext(coalesce(slug, '') || '^')), 19))::double precision * 0.18
      else
        tier_anchor + type_adj
          + (mod(abs(hashtext(coalesce(slug, '') || '^')), 19))::double precision * 0.22
    end as hi_raw
  from tier
),
clamped as (
  select
    id,
    spread_w,
    least(38::double precision, greatest(20::double precision, hi_raw)) as hi
  from merged
),
lo_calc as (
  select
    id,
    hi,
    spread_w,
    greatest(
      20::double precision,
      least(hi - 0.7, hi - spread_w)
    ) as lo
  from clamped
),
fixed as (
  select
    id,
    case
      when lo >= hi - 0.6 then hi - 2.8
      else lo
    end as lo2,
    hi
  from lo_calc
)
update public.strains s
set
  thc_min = round(greatest(20::numeric, least(f.hi::numeric - 0.5, f.lo2))::numeric, 1),
  thc_max = round(
    least(
      38::numeric,
      greatest(greatest(20::numeric, f.lo2) + 0.9, f.hi::numeric)
    )::numeric,
    1
  )
from fixed f
where s.id = f.id;
