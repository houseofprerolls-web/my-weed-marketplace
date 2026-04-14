-- New York listing market: ZIP prefixes 100–149 → `new-york`, tagged with region_key `ny`.
-- Existing California markets get region_key `ca` for partitioning ops / future NY-only hosts.
-- Removes cross-region vendor_market_operations where state or ZIP clearly belongs to the other coast.

-- ---------------------------------------------------------------------------
-- listing_markets.region_key
-- ---------------------------------------------------------------------------
alter table public.listing_markets
  add column if not exists region_key text not null default 'ca';

comment on column public.listing_markets.region_key is
  'Deployment partition: ca = California metro markets, ny = New York, etc.';

-- ---------------------------------------------------------------------------
-- NY market + ZIP prefixes (USPS 3-digit: 100–149 = New York State)
-- ---------------------------------------------------------------------------
insert into public.listing_markets (slug, name, subtitle, sort_order, region_key)
values (
  'new-york',
  'New York',
  'New York State — operating area separate from California listing markets',
  200,
  'ny'
)
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  sort_order = excluded.sort_order,
  region_key = excluded.region_key;

insert into public.market_zip_prefixes (prefix, market_id)
select lpad(i::text, 3, '0'), lm.id
from generate_series(100, 149) as i
cross join lateral (
  select id from public.listing_markets where slug = 'new-york' limit 1
) lm
on conflict (prefix) do nothing;

comment on table public.market_zip_prefixes is
  'Maps USPS ZIP first 3 digits to a listing_markets row (multi-state: CA + NY).';

-- ---------------------------------------------------------------------------
-- ZIP sync trigger: NY 100–149 before california-other fallback
-- ---------------------------------------------------------------------------
create or replace function public.sync_vendor_market_from_zip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  z text;
  pref text;
  m_id uuid;
  pref_n int;
begin
  z := regexp_replace(coalesce(new.zip, ''), '\D', '', 'g');
  if length(z) < 5 then
    return new;
  end if;
  pref := left(z, 3);

  select m.market_id into m_id
  from public.market_zip_prefixes m
  where m.prefix = pref
  limit 1;

  if m_id is null and pref ~ '^[0-9]{3}$' then
    pref_n := pref::int;
    if pref_n >= 100 and pref_n <= 149 then
      select lm.id into m_id
      from public.listing_markets lm
      where lm.slug = 'new-york'
      limit 1;
    end if;
  end if;

  if m_id is null then
    select lm.id into m_id
    from public.listing_markets lm
    where lm.slug = 'california-other'
    limit 1;
  end if;

  if m_id is not null then
    insert into public.vendor_market_operations (vendor_id, market_id, approved)
    values (new.id, m_id, false)
    on conflict (vendor_id, market_id) do nothing;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prune cross-region approvals (keeps data separated by coast)
-- ---------------------------------------------------------------------------
delete from public.vendor_market_operations vmo
using public.vendors v, public.listing_markets lm
where vmo.vendor_id = v.id
  and vmo.market_id = lm.id
  and lm.region_key = 'ca'
  and (
    upper(trim(coalesce(v.state, ''))) = 'NY'
    or (
      length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 3
      and left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3) ~ '^[0-9]{3}$'
      and left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3)::int between 100 and 149
    )
  );

delete from public.vendor_market_operations vmo
using public.vendors v, public.listing_markets lm
where vmo.vendor_id = v.id
  and vmo.market_id = lm.id
  and lm.region_key = 'ny'
  and (
    upper(trim(coalesce(v.state, ''))) = 'CA'
    or (
      length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 3
      and exists (
        select 1
        from public.market_zip_prefixes mzp
        join public.listing_markets lmca on lmca.id = mzp.market_id and lmca.region_key = 'ca'
        where mzp.prefix = left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- NY vendors: ensure approved ops on `new-york` after CA rows were pruned
-- ---------------------------------------------------------------------------
insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
select v.id, lm.id, true, '0142 ny market auto-approve'
from public.vendors v
cross join public.listing_markets lm
where lm.slug = 'new-york'
  and coalesce(v.is_live, false) = true
  and v.license_status = 'approved'
  and (
    upper(trim(coalesce(v.state, ''))) = 'NY'
    or (
      length(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g')) >= 3
      and left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3) ~ '^[0-9]{3}$'
      and left(regexp_replace(coalesce(v.zip, ''), '\D', '', 'g'), 3)::int between 100 and 149
    )
  )
on conflict (vendor_id, market_id) do update set
  approved = true;
