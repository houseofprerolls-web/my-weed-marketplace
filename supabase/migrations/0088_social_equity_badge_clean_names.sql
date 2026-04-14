-- Social equity: vendor-controlled badge on public surfaces; strip legacy "equity retailer(s)" suffixes from names.
-- Remove vendor rows with empty names (cascades to dependent tables).

alter table public.vendors
  add column if not exists social_equity_badge_visible boolean not null default false;

comment on column public.vendors.social_equity_badge_visible is
  'When true, show a Social equity badge on listing/discover/map; business name should not include equity retailer wording.';

-- Strip trailing "equity retailer(s)" with optional dash, pipe, or parentheses (several passes for stacked suffixes).
update public.vendors
set name = trim(
  regexp_replace(
    trim(coalesce(name, '')),
    E'\\s*[-–—|]?\\s*\\(?\\s*equity\\s+retailers?\\s*\\)?\\s*$',
    '',
    'i'
  )
)
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(
  regexp_replace(
    trim(coalesce(name, '')),
    E'\\s*[-–—|]?\\s*\\(?\\s*equity\\s+retailers?\\s*\\)?\\s*$',
    '',
    'i'
  )
)
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(
  regexp_replace(
    trim(coalesce(name, '')),
    E'\\s*[-–—|]?\\s*\\(?\\s*equity\\s+retailers?\\s*\\)?\\s*$',
    '',
    'i'
  )
)
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\s+', ' ', 'g'))
where name is not null;

delete from public.vendors
where trim(coalesce(name, '')) = '';
