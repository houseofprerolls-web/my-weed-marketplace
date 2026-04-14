-- Rebrand master QA storefront Saferock → House of Prerolls (slug `house-of-prerolls`)
-- and seed additional in-stock SKUs with image URLs for a full launch-style menu.

do $hop$
declare
  vid uuid;
begin
  if to_regclass('public.vendors') is null then
    raise notice '0145: vendors missing — skipped';
    return;
  end if;

  select v.id into vid from public.vendors v where v.slug = 'saferock' limit 1;
  if vid is null then
    select v.id into vid from public.vendors v where v.slug = 'house-of-prerolls' limit 1;
  end if;

  if vid is null then
    raise notice '0145: no vendor saferock / house-of-prerolls — skipped';
    return;
  end if;

  update public.vendors v
  set
    name = 'House of Prerolls',
    slug = 'house-of-prerolls',
    tagline = 'Premium prerolls, small-batch flower, vapes & edibles.',
    description = 'Licensed California retailer — curated infused and classic prerolls, flower, concentrates, and vapes. Fast pickup and delivery where available.',
    website = coalesce(nullif(trim(v.website), ''), 'https://houseofprerolls.example'),
    license_number = coalesce(nullif(trim(v.license_number), ''), 'HOP-CA-DEMO')
  where v.id = vid;

  update public.products p
  set name = replace(p.name, 'Saferock', 'House of Prerolls')
  where p.vendor_id = vid
    and p.name like '%Saferock%';

  if to_regclass('public.products') is null then
    raise notice '0145: products missing — vendor rename only';
    return;
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
  select
    vid,
    null,
    s.name,
    s.cat,
    s.price_cents,
    s.inv,
    s.thc,
    s.cbd,
    s.descr,
    s.imgs,
    true
  from (
    values
      ('Wedding Cake Infused Preroll 5-pack', 'preroll', 4200, 40, 32::numeric, 0::numeric, 'Infused five-pack; smooth burn.'::text, array['https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800']::text[]),
      ('Gelato Live Rosin Infused 1g', 'preroll', 2800, 55, 38::numeric, 0::numeric, 'Single infused joint, live rosin layer.'::text, array['https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=800']::text[]),
      ('Classic OG 10-pack minis', 'preroll', 3600, 48, 24::numeric, 0.1::numeric, 'Ten mini joints, everyday value.'::text, array['https://images.pexels.com/photos/7937618/pexels-photo-7937618.jpeg?auto=compress&w=800']::text[]),
      ('Lemon Cherry blunt 2g', 'preroll', 3200, 30, 29::numeric, 0::numeric, 'Hemp wrap, slow burn.'::text, array['https://images.pexels.com/photos/3780108/pexels-photo-3780108.jpeg?auto=compress&w=800']::text[]),
      ('CBD:THC 1:1 Preroll 5-pack', 'preroll', 3000, 44, 12::numeric, 12::numeric, 'Balanced five-pack.'::text, array['https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&w=800']::text[]),
      ('Ice Cream Cake 3.5g', 'flower', 4800, 28, 26::numeric, 0.1::numeric, 'Dense nugs, dessert profile.'::text, array['https://images.pexels.com/photos/7661424/pexels-photo-7661424.jpeg?auto=compress&w=800']::text[]),
      ('Runtz smalls 14g', 'flower', 7800, 22, 25::numeric, 0::numeric, 'Small buds, big terps.'::text, array['https://images.pexels.com/photos/9853824/pexels-photo-9853824.jpeg?auto=compress&w=800']::text[]),
      ('Sour Diesel eighth', 'flower', 3800, 35, 22::numeric, 0::numeric, 'Sativa-leaning classic.'::text, array['https://images.pexels.com/photos/6224616/pexels-photo-6224616.jpeg?auto=compress&w=800']::text[]),
      ('Purple Punch 7g', 'flower', 6200, 26, 20::numeric, 0.1::numeric, 'Quarter jar, grape candy notes.'::text, array['https://images.pexels.com/photos/6224550/pexels-photo-6224550.jpeg?auto=compress&w=800']::text[]),
      ('MAC 1 premium 3.5g', 'flower', 5200, 20, 28::numeric, 0::numeric, 'Caps cut, frosty.'::text, array['https://images.pexels.com/photos/14663354/pexels-photo-14663354.jpeg?auto=compress&w=800']::text[]),
      ('Badder 1g — Garlic Cookies', 'concentrate', 4400, 32, 75::numeric, 0::numeric, 'Whipped badder, loud nose.'::text, array['https://images.pexels.com/photos/14353272/pexels-photo-14353272.jpeg?auto=compress&w=800']::text[]),
      ('Shatter 1g — Blue Dream', 'concentrate', 3600, 40, 70::numeric, 0::numeric, 'Stable slab.'::text, array['https://images.pexels.com/photos/1070850/pexels-photo-1070850.jpeg?auto=compress&w=800']::text[]),
      ('Diamonds & sauce 1g', 'concentrate', 5200, 24, 82::numeric, 0::numeric, 'High-THCA diamonds.'::text, array['https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&w=800']::text[]),
      ('Full spectrum RSO 1g syringe', 'concentrate', 3400, 28, 68::numeric, 1::numeric, 'Oral / dab versatile.'::text, array['https://images.pexels.com/photos/420239/pexels-photo-420239.jpeg?auto=compress&w=800']::text[]),
      ('Cured resin cart 1g — Pineapple', 'vape', 4600, 36, 78::numeric, 0::numeric, '510 thread, botanically true.'::text, array['https://images.pexels.com/photos/1080696/pexels-photo-1080696.jpeg?auto=compress&w=800']::text[]),
      ('Disposable live resin 0.5g', 'vape', 3800, 44, 80::numeric, 0::numeric, 'All-in-one, ready to go.'::text, array['https://images.pexels.com/photos/2292941/pexels-photo-2292941.jpeg?auto=compress&w=800']::text[]),
      ('Strawberry gummies 100mg', 'edible', 2200, 50, null::numeric, null::numeric, '10x10mg pieces.'::text, array['https://images.pexels.com/photos/2818892/pexels-photo-2818892.jpeg?auto=compress&w=800']::text[]),
      ('Dark chocolate sea salt 100mg', 'edible', 2400, 42, null::numeric, null::numeric, 'Segmented bar.'::text, array['https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&w=800']::text[]),
      ('Sparkling peach beverage 10mg', 'edible', 800, 80, null::numeric, null::numeric, 'Fast onset seltzer.'::text, array['https://images.pexels.com/photos/4646783/pexels-photo-4646783.jpeg?auto=compress&w=800']::text[]),
      ('Mints microdose 20-pack', 'edible', 1600, 60, null::numeric, null::numeric, '2.5mg per mint.'::text, array['https://images.pexels.com/photos/5273001/pexels-photo-5273001.jpeg?auto=compress&w=800']::text[]),
      ('Recovery balm 500mg CBD', 'topical', 2800, 25, 0::numeric, 0::numeric, 'Broad spectrum, no scent.'::text, array['https://images.pexels.com/photos/3780464/pexels-photo-3780464.jpeg?auto=compress&w=800']::text[]),
      ('Transdermal patch 20mg THC', 'topical', 1200, 40, null::numeric, null::numeric, 'Slow release up to 8h.'::text, array['https://images.pexels.com/photos/5414011/pexels-photo-5414011.jpeg?auto=compress&w=800']::text[]),
      ('House mix pre-ground 14g', 'other', 5200, 30, 18::numeric, 0::numeric, 'Ready for cones.'::text, array['https://images.pexels.com/photos/7667933/pexels-photo-7667933.jpeg?auto=compress&w=800']::text[]),
      ('Glass tip cone 3-pack', 'other', 900, 100, null::numeric, null::numeric, 'Premium papers + glass crutch.'::text, array['https://images.pexels.com/photos/6065061/pexels-photo-6065061.jpeg?auto=compress&w=800']::text[])
  ) as s(name, cat, price_cents, inv, thc, cbd, descr, imgs)
  where not exists (select 1 from public.products p where p.vendor_id = vid and p.name = s.name);

  if to_regclass('public.product_unit_costs') is not null then
    insert into public.product_unit_costs (product_id, unit_cost_cents)
    select p.id,
      case
        when p.price_cents <= 2000 then 700
        when p.price_cents <= 4000 then 1400
        else 2200
      end
    from public.products p
    where p.vendor_id = vid
      and not exists (select 1 from public.product_unit_costs c where c.product_id = p.id);
  end if;

  raise notice '0145: House of Prerolls vendor % — menu extended', vid;
end;
$hop$;

-- Ensure launch partners can appear on the homepage tree when ZIP-gated.
update public.vendors
set smokers_club_eligible = true
where slug in ('greenhaven', 'house-of-prerolls', 'ca-uls-c9-0000568-lic');
