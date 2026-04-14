-- Saferock = master QA storefront (houseofprerolls@gmail.com) for vendor dashboard / menu tests.
-- Creates vendor slug `saferock` if missing; seeds baseline menu rows (skipped per-name if already present).
-- Re-run safe: ownership is re-applied whenever the master auth user exists.

do $seed_saferock$
declare
  master_id uuid;
  vid uuid;
begin
  if to_regclass('public.vendors') is null or to_regclass('public.products') is null then
    raise notice '0043: vendors or products missing — skipped';
    return;
  end if;

  select u.id
    into master_id
  from auth.users u
  where lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
  limit 1;

  insert into public.vendors (
    user_id,
    name,
    tagline,
    description,
    logo_url,
    banner_url,
    map_marker_image_url,
    license_number,
    verified,
    license_status,
    is_live,
    subscription_tier,
    slug,
    address,
    city,
    state,
    zip,
    phone,
    website,
    location,
    is_directory_listing
  )
  values (
    null,
    'Saferock',
    'Master QA storefront',
    'Primary test shop for vendor dashboard, menu, cart, and checkout (owned by master account).',
    'https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=200',
    'https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=1200',
    'https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=200',
    'SAFEROCK-QA',
    true,
    'approved',
    true,
    'basic',
    'saferock',
    '200 Test Ave',
    'San Francisco',
    'CA',
    '94110',
    '415-555-0100',
    'https://example.com/saferock',
    ST_GeogFromText('POINT(-122.4098 37.7599)'),
    true
  )
  on conflict (slug) do nothing;

  select v.id into vid from public.vendors v where v.slug = 'saferock' limit 1;
  if vid is null then
    raise notice '0043: could not resolve Saferock vendor id';
    return;
  end if;

  if master_id is not null then
    update public.vendors v
    set
      user_id = master_id,
      is_directory_listing = false
    where v.id = vid;
  else
    raise notice '0043: houseofprerolls@gmail.com not in auth.users — Saferock left as directory listing until that user exists';
  end if;

  insert into public.products (
    vendor_id,
    strain_id,
    name,
    category,
    price_cents,
    inventory_count,
    potency_thc,
    potency_cbd,
    description,
    images,
    in_stock
  )
  select vid, null, s.name, s.cat, s.price_cents, s.inv, s.thc, s.cbd, s.descr, s.imgs, true
  from (
    values
      (
        'Saferock OG Flower (3.5g)',
        'flower',
        3500,
        40,
        22.5::numeric,
        0.1::numeric,
        'QA seed — classic hybrid profile.'::text,
        array[
          'https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'Blue Dream 7g',
        'flower',
        6500,
        25,
        20::numeric,
        0.2::numeric,
        'QA seed — larger jar.',
        array[
          'https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'Sour Gummies 100mg',
        'edible',
        1800,
        60,
        null::numeric,
        null::numeric,
        'QA seed — infused fruit chews.',
        array[
          'https://images.pexels.com/photos/7937618/pexels-photo-7937618.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'Live Resin Cart 1g',
        'vape',
        4200,
        35,
        78::numeric,
        0::numeric,
        'QA seed — 510 thread.',
        array[
          'https://images.pexels.com/photos/3780108/pexels-photo-3780108.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'Hash Rosin 1g',
        'concentrate',
        5500,
        15,
        72::numeric,
        0::numeric,
        'QA seed — cold cure.',
        array[
          'https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'Infused Pre-roll 1g',
        'preroll',
        1600,
        50,
        28::numeric,
        0::numeric,
        'QA seed — single joint.',
        array[
          'https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'CBD Relief Balm',
        'topical',
        2400,
        20,
        0::numeric,
        12::numeric,
        'QA seed — unscented base.',
        array[
          'https://images.pexels.com/photos/3780464/pexels-photo-3780464.jpeg?auto=compress&w=800'
        ]::text[]
      ),
      (
        'House Blend (smalls)',
        'other',
        2200,
        30,
        18::numeric,
        0.5::numeric,
        'QA seed — budget tier.',
        array[
          'https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=800'
        ]::text[]
      )
  ) as s(name, cat, price_cents, inv, thc, cbd, descr, imgs)
  where not exists (
    select 1 from public.products p where p.vendor_id = vid and p.name = s.name
  );

  if master_id is not null then
    update public.vendors v
    set
      user_id = master_id,
      is_directory_listing = false
    where v.slug = 'saferock';
  end if;

  raise notice '0043: Saferock vendor % — baseline menu rows ensured', vid;
end;
$seed_saferock$;

do $saferock_costs$
begin
  if to_regclass('public.product_unit_costs') is null then
    return;
  end if;

  insert into public.product_unit_costs (product_id, unit_cost_cents)
  select p.id,
    case
      when p.price_cents <= 2500 then 900
      when p.price_cents <= 4500 then 1600
      else 2200
    end
  from public.products p
  join public.vendors v on v.id = p.vendor_id and v.slug = 'saferock'
  on conflict (product_id) do update set
    unit_cost_cents = excluded.unit_cost_cents,
    updated_at = now();
end;
$saferock_costs$;
