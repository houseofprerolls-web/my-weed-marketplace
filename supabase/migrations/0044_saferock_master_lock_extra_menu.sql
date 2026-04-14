-- Keep Saferock (slug `saferock`) owned by the master QA account; add extra varied menu lines for testing.
-- Safe to re-run: master link is idempotent; products use NOT EXISTS on exact name.

do $saferock_master_and_extras$
declare
  master_id uuid;
  vid uuid;
begin
  if to_regclass('public.vendors') is null or to_regclass('public.products') is null then
    raise notice '0044: vendors or products missing — skipped';
    return;
  end if;

  select u.id
    into master_id
  from auth.users u
  where lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
  limit 1;

  select v.id into vid from public.vendors v where v.slug = 'saferock' limit 1;
  if vid is null then
    raise notice '0044: no vendor with slug saferock — run 0043 first';
    return;
  end if;

  if master_id is not null then
    update public.vendors v
    set
      user_id = master_id,
      is_directory_listing = false,
      name = 'Saferock'
    where v.slug = 'saferock';
  else
    raise notice '0044: houseofprerolls@gmail.com missing — Saferock ownership unchanged';
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
        'Wedding Cake 3.5g',
        'flower',
        3899,
        28,
        26.0::numeric,
        0.05::numeric,
        'Extra menu — vanilla frosting terps.',
        array['https://images.pexels.com/photos/10785400/pexels-photo-10785400.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Gelato 41 3.5g',
        'flower',
        4099,
        22,
        25.5::numeric,
        0.1::numeric,
        'Extra menu — dessert-line hybrid.',
        array['https://images.pexels.com/photos/10582252/pexels-photo-10582252.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Runtz Smallz 14g',
        'flower',
        7200,
        12,
        23.0::numeric,
        0.2::numeric,
        'Extra menu — bulk candy profile.',
        array['https://images.pexels.com/photos/5689041/pexels-photo-5689041.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Ice Cream Cake 7g',
        'flower',
        5899,
        18,
        24.0::numeric,
        0.15::numeric,
        'Extra menu — dense indica nugs.',
        array['https://images.pexels.com/photos/4069566/pexels-photo-4069566.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Mango Haze Disposable 0.5g',
        'vape',
        3600,
        44,
        82::numeric,
        0::numeric,
        'Extra menu — all-in-one draw.',
        array['https://images.pexels.com/photos/2951652/pexels-photo-2951652.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Lemon Cherry Cart 1g',
        'vape',
        4499,
        31,
        88::numeric,
        0::numeric,
        'Extra menu — live resin style.',
        array['https://images.pexels.com/photos/1467468/pexels-photo-1467468.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Caramel Chews 50mg (5pk)',
        'edible',
        1499,
        70,
        null::numeric,
        null::numeric,
        'Extra menu — soft caramel bites.',
        array['https://images.pexels.com/photos/6599028/pexels-photo-6599028.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Mint Dark Chocolate 100mg',
        'edible',
        2199,
        55,
        null::numeric,
        null::numeric,
        'Extra menu — bar segments.',
        array['https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'THC Seltzer 10mg (4pk)',
        'edible',
        1699,
        48,
        null::numeric,
        null::numeric,
        'Extra menu — sparkling citrus.',
        array['https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Shatter 1g — OG Kush',
        'concentrate',
        2999,
        26,
        75::numeric,
        0::numeric,
        'Extra menu — glass stability.',
        array['https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Badder 1g — Papaya',
        'concentrate',
        4799,
        19,
        71::numeric,
        0::numeric,
        'Extra menu — wet consistency.',
        array['https://images.pexels.com/photos/3780464/pexels-photo-3780464.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Jealousy Infused 2-pack',
        'preroll',
        1999,
        40,
        30::numeric,
        0::numeric,
        'Extra menu — glass-tipped cones.',
        array['https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Purple Punch Single 1g',
        'preroll',
        1299,
        65,
        22::numeric,
        0.1::numeric,
        'Extra menu — grape soda notes.',
        array['https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Cooling THC Gel 500mg',
        'topical',
        3299,
        16,
        null::numeric,
        null::numeric,
        'Extra menu — pump bottle.',
        array['https://images.pexels.com/photos/3780464/pexels-photo-3780464.jpeg?auto=compress&w=800']::text[]
      ),
      (
        '1:1 Tincture 300mg',
        'other',
        2799,
        24,
        null::numeric,
        null::numeric,
        'Extra menu — sublingual drops.',
        array['https://images.pexels.com/photos/3780108/pexels-photo-3780108.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Ceramic Grinder + Papers',
        'other',
        1299,
        80,
        null::numeric,
        null::numeric,
        'Extra menu — accessory bundle.',
        array['https://images.pexels.com/photos/7937618/pexels-photo-7937618.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'Zkittlez Mints 3.5g',
        'flower',
        3699,
        33,
        27.0::numeric,
        0.08::numeric,
        'Extra menu — candy-lime nose.',
        array['https://images.pexels.com/photos/10785400/pexels-photo-10785400.jpeg?auto=compress&w=800']::text[]
      ),
      (
        'MAC 1 3.5g',
        'flower',
        4299,
        20,
        29.0::numeric,
        0.05::numeric,
        'Extra menu — cap junky line.',
        array['https://images.pexels.com/photos/10582252/pexels-photo-10582252.jpeg?auto=compress&w=800']::text[]
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

  raise notice '0044: Saferock master lock + extra menu rows applied';
end;
$saferock_master_and_extras$;

do $saferock_costs_0044$
begin
  if to_regclass('public.product_unit_costs') is null then
    return;
  end if;

  -- Pseudo-random-ish COGS from product name hash (stable per row) for dashboard profit demos.
  insert into public.product_unit_costs (product_id, unit_cost_cents)
  select
    p.id,
    greatest(
      350,
      least(
        round(p.price_cents * (0.32 + (mod(abs(hashtext(p.name::text)), 15))::numeric / 100.0))::int,
        p.price_cents - 250
      )
    )
  from public.products p
  join public.vendors v on v.id = p.vendor_id and v.slug = 'saferock'
  on conflict (product_id) do update set
    unit_cost_cents = excluded.unit_cost_cents,
    updated_at = now();
end;
$saferock_costs_0044$;
