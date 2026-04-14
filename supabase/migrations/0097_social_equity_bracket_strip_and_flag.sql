-- Strip "[Equity Retailer]" / bracket forms from vendor names; enable badge for affected rows.

update public.vendors
set social_equity_badge_visible = true
where name ~* 'equity\s+retailer';

-- Bracketed form (repeat for stacked / odd spacing)
update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\s*\\[\\s*equity\\s+retailers?\\s*\\]\\s*', ' ', 'gi'))
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\s*\\[\\s*equity\\s+retailers?\\s*\\]\\s*', ' ', 'gi'))
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\s*\\[\\s*equity\\s+retailers?\\s*\\]\\s*', ' ', 'gi'))
where trim(coalesce(name, '')) <> '';

-- Inline parens
update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\(\\s*equity\\s+retailers?\\s*\\)', ' ', 'gi'))
where trim(coalesce(name, '')) <> '';

update public.vendors
set name = trim(regexp_replace(trim(coalesce(name, '')), E'\\(\\s*equity\\s+retailers?\\s*\\)', ' ', 'gi'))
where trim(coalesce(name, '')) <> '';

-- Trailing dash / pipe / parens (same as 0088)
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
