/**
 * Import findweedny.com scraper CSV into Supabase for listing_markets.slug = 'new-york':
 * - Upsert directory vendors (slug ny-{dispensary_id} from item_page_link)
 * - vendor_market_operations approved for new-york only
 * - vendor_market_listings club_lane=treehouse, slot_rank 1–7 (fills free slots in CSV order; batched writes)
 * - set_vendor_geog_point RPC (ZIP anchor + jitter)
 * - Seed default menu when vendor has no products
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 *   node scripts/import-findweedny-csv.mjs
 *   node scripts/import-findweedny-csv.mjs --dry-run
 *   node scripts/import-findweedny-csv.mjs --csv=C:\path\to\file.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');
const NY_MARKET_SLUG = 'new-york';
const SLOT_MIN = 1;
const SLOT_MAX = 7;

const csvArg = process.argv.find((a) => a.startsWith('--csv='));
const DEFAULT_CSV = path.join(__dirname, '..', 'data', 'findweedny-com-2026-04-01.csv');

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function extractZip5(z) {
  const d = String(z || '').replace(/\D/g, '');
  return d.length >= 5 ? d.slice(0, 5) : '';
}

/** "Kingston, NY 12401" → city, state, zip */
function parseCityStateZip(cityCol) {
  const s = String(cityCol || '').trim();
  if (!s) return { city: null, state: 'NY', zip: '' };
  const zipM = s.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipM ? zipM[1] : '';
  const comma = s.indexOf(',');
  let city = comma >= 0 ? s.slice(0, comma).trim() : s.replace(/\s+\d{5}.*$/, '').trim();
  let state = 'NY';
  if (comma >= 0) {
    const rest = s.slice(comma + 1).trim();
    const sm = rest.match(/^([A-Za-z]{2})\s/);
    if (sm) state = sm[1].toUpperCase();
  }
  if (!city) city = null;
  return { city, state, zip };
}

function mapCenterForNyZip(zip) {
  const z5 = extractZip5(zip);
  if (z5.length !== 5) return { lat: 42.95, lng: -75.5 };
  const p = parseInt(z5.slice(0, 3), 10);
  if (p >= 100 && p <= 104) return { lat: 40.7128, lng: -74.006 };
  if (p >= 105 && p <= 115) return { lat: 41.05, lng: -73.75 };
  if (p >= 116 && p <= 125) return { lat: 42.65, lng: -73.75 };
  if (p >= 126 && p <= 137) return { lat: 42.8864, lng: -78.8784 };
  if (p >= 138 && p <= 149) return { lat: 42.45, lng: -76.5 };
  return { lat: 42.95, lng: -75.5 };
}

function hashJitter(id, zip, center) {
  let h = 2166136261;
  const s = id + (zip || '');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const dx = (((h >>> 0) % 180) / 1800 - 0.05) * 1.2;
  const dy = ((((h >>> 10) % 180) / 1800 - 0.05) * 0.9) / Math.cos((center.lat * Math.PI) / 180);
  return { lat: center.lat + dy, lng: center.lng + dx };
}

function slugFromItemPageLink(link) {
  const u = String(link || '').trim();
  const seg = u.split('/').filter(Boolean).pop();
  if (!seg) return null;
  const id = seg.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) return null;
  return `ny-${id}`;
}

function licenseFromAbout(about) {
  const m = String(about || '').match(/License:\s*([A-Z0-9\-]+)/i);
  return m ? m[1].toUpperCase() : null;
}

function normRow(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    o[String(k).trim()] = v;
  }
  return o;
}

const MENU_ITEMS = [
  {
    name: 'House Flower 3.5g',
    category: 'flower',
    price_cents: 3500,
    inventory_count: 48,
    potency_thc: 24,
    potency_cbd: 0.1,
    description: 'Seasonal hybrid — seed menu item.',
    images: ['https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800'],
  },
  {
    name: 'Infused Pre-roll 1g',
    category: 'preroll',
    price_cents: 1600,
    inventory_count: 80,
    potency_thc: 28,
    potency_cbd: 0,
    description: 'Single infused joint.',
    images: ['https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800'],
  },
  {
    name: 'Live Resin Cart 1g',
    category: 'vape',
    price_cents: 4200,
    inventory_count: 36,
    potency_thc: 78,
    potency_cbd: 0,
    description: '510-thread cartridge.',
    images: ['https://images.pexels.com/photos/3780108/pexels-photo-3780108.jpeg?auto=compress&w=800'],
  },
  {
    name: 'Sour Gummies 100mg',
    category: 'edible',
    price_cents: 1800,
    inventory_count: 60,
    potency_thc: null,
    potency_cbd: null,
    description: 'Fruit chews — start low, go slow.',
    images: ['https://images.pexels.com/photos/7937618/pexels-photo-7937618.jpeg?auto=compress&w=800'],
  },
  {
    name: 'Cold Cure Rosin 1g',
    category: 'concentrate',
    price_cents: 5500,
    inventory_count: 20,
    potency_thc: 72,
    potency_cbd: 0,
    description: 'Solventless extract.',
    images: ['https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&w=800'],
  },
  {
    name: 'CBD Relief Balm',
    category: 'topical',
    price_cents: 2400,
    inventory_count: 30,
    potency_thc: 0,
    potency_cbd: 12,
    description: 'Topical balm.',
    images: ['https://images.pexels.com/photos/7667731/pexels-photo-7667731.jpeg?auto=compress&w=800'],
  },
];

async function main() {
  loadEnvLocal();

  const csvPath = csvArg ? csvArg.slice('--csv='.length) : DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

  if (DRY) {
    console.log(`Dry run: ${records.length} rows from ${csvPath}`);
    for (let i = 0; i < Math.min(5, records.length); i++) {
      const r = normRow(records[i]);
      const slug = slugFromItemPageLink(r.item_page_link);
      const { city, zip } = parseCityStateZip(r.city);
      console.log('  sample:', slug, '|', r.title, '|', city, zip);
    }
    if (records.length > 5) console.log('  …');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: nyRow, error: nyErr } = await supabase
    .from('listing_markets')
    .select('id,slug')
    .eq('slug', NY_MARKET_SLUG)
    .maybeSingle();
  if (nyErr || !nyRow?.id) {
    console.error('listing_markets slug new-york missing. Apply migration 0142_new_york_listing_market.sql.', nyErr?.message);
    process.exit(1);
  }
  const marketId = nyRow.id;

  function chunks(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function inChunks(values, chunkSize, fn) {
    for (const part of chunks(values, chunkSize)) {
      await fn(part);
    }
  }

  async function runPool(tasks, concurrency) {
    let ix = 0;
    let ok = 0;
    let fail = 0;
    async function worker() {
      while (ix < tasks.length) {
        const i = ix++;
        try {
          await tasks[i]();
          ok++;
        } catch (e) {
          fail++;
          console.error(e?.message || e);
        }
      }
    }
    const n = Math.min(concurrency, Math.max(1, tasks.length));
    await Promise.all(Array.from({ length: n }, () => worker()));
    return { ok, fail };
  }

  let rowsSkipped = 0;
  /** @type {{ slug: string, vendorPayload: object, lat: number, lng: number }[]} */
  const prep = [];

  for (const rawRow of records) {
    const r = normRow(rawRow);
    const slug = slugFromItemPageLink(r.item_page_link);
    if (!slug) {
      rowsSkipped++;
      continue;
    }

    const name = String(r.title || r.name_1 || '').trim() || slug;
    const { city, state, zip } = parseCityStateZip(r.city);
    const zipFinal = zip || extractZip5(r.streetAddress);
    const center = mapCenterForNyZip(zipFinal);
    const { lat, lng } = hashJitter(slug, zipFinal, center);

    const about = r.about || r.about_1 || '';
    const licenseNumber = licenseFromAbout(about) || `FINDWEEDNY-${slug}`.slice(0, 80);
    const description = String(r.Description || r.about || '').trim() || null;
    const logo = String(r.image_2 || r.image || '').trim() || null;
    const banner = String(r.image_3 || r.image || '').trim() || null;
    const phone = String(r.telephone || r.telephone_2 || '').trim() || null;
    const website = String(r.item_page_link || '').trim() || null;

    prep.push({
      slug,
      lat,
      lng,
      vendorPayload: {
        user_id: null,
        name,
        slug,
        tagline: null,
        description,
        logo_url: logo,
        banner_url: banner,
        map_marker_image_url: logo,
        license_number: licenseNumber,
        verified: false,
        license_status: 'approved',
        is_live: true,
        is_directory_listing: true,
        subscription_tier: 'basic',
        address: String(r.streetAddress || '').trim() || null,
        city,
        state: state || 'NY',
        zip: zipFinal || null,
        phone,
        website,
        offers_delivery: true,
        offers_storefront: true,
        smokers_club_eligible: true,
        online_menu_enabled: true,
        map_visible_override: true,
      },
    });
  }

  const allSlugs = prep.map((p) => p.slug);
  const hadSlug = new Set();
  await inChunks(allSlugs, 120, async (slugPart) => {
    const { data, error } = await supabase.from('vendors').select('slug').in('slug', slugPart);
    if (error) {
      console.error('preload vendors', error.message);
      process.exit(1);
    }
    for (const row of data || []) hadSlug.add(row.slug);
  });

  let vendorsInserted = 0;
  let vendorsUpdated = 0;
  for (const p of prep) {
    if (hadSlug.has(p.slug)) vendorsUpdated++;
    else vendorsInserted++;
  }

  /** @type {Map<string, string>} */
  const slugToId = new Map();
  for (const batch of chunks(
    prep.map((p) => p.vendorPayload),
    80
  )) {
    const { data, error } = await supabase.from('vendors').upsert(batch, { onConflict: 'slug' }).select('id,slug');
    if (error) {
      console.error('vendors upsert batch', error.message);
      process.exit(1);
    }
    for (const row of data || []) slugToId.set(row.slug, row.id);
  }

  const geoRes = await runPool(
    prep.map(
      (p) => async () => {
        const { error } = await supabase.rpc('set_vendor_geog_point', {
          p_vendor_id: slugToId.get(p.slug),
          p_lng: p.lng,
          p_lat: p.lat,
        });
        if (error) throw new Error(`set_vendor_geog_point ${p.slug}: ${error.message}`);
      }
    ),
    12
  );
  const geoSet = geoRes.ok;

  const opRows = prep.map((p) => ({
    vendor_id: slugToId.get(p.slug),
    market_id: marketId,
    approved: true,
    note: 'findweedny-csv-new-york',
  }));
  let opsBatches = 0;
  for (const batch of chunks(opRows, 150)) {
    const { error } = await supabase.from('vendor_market_operations').upsert(batch, { onConflict: 'vendor_id,market_id' });
    if (error) {
      console.error('vendor_market_operations batch', error.message);
      process.exit(1);
    }
    opsBatches++;
  }

  const { data: existingListings, error: listReadErr } = await supabase
    .from('vendor_market_listings')
    .select('vendor_id,slot_rank')
    .eq('market_id', marketId)
    .eq('club_lane', 'treehouse')
    .eq('active', true);
  if (listReadErr) {
    console.error('listings read', listReadErr.message);
    process.exit(1);
  }

  const listingSlotByVendor = new Map((existingListings || []).map((r) => [r.vendor_id, r.slot_rank]));
  const occupied = new Set((existingListings || []).map((r) => r.slot_rank));

  function nextFreeSlot() {
    for (let r = SLOT_MIN; r <= SLOT_MAX; r++) {
      if (!occupied.has(r)) return r;
    }
    return 0;
  }

  const listingUpserts = [];
  let listingsSkipped = 0;
  for (const p of prep) {
    const vid = slugToId.get(p.slug);
    if (!vid) continue;

    let slot;
    if (listingSlotByVendor.has(vid)) {
      slot = listingSlotByVendor.get(vid);
    } else {
      slot = nextFreeSlot();
      if (slot > 0) {
        occupied.add(slot);
        listingSlotByVendor.set(vid, slot);
      }
    }

    if (slot === 0 || slot == null) {
      listingsSkipped++;
    } else {
      listingUpserts.push({
        market_id: marketId,
        vendor_id: vid,
        slot_rank: slot,
        club_lane: 'treehouse',
        is_premium: true,
        active: true,
        note: 'findweedny-import',
      });
    }
  }

  let listingsInserted = 0;
  for (const batch of chunks(listingUpserts, 100)) {
    const { error } = await supabase.from('vendor_market_listings').upsert(batch, { onConflict: 'market_id,vendor_id,club_lane' });
    if (error) {
      console.error('vendor_market_listings batch', error.message);
      process.exit(1);
    }
    listingsInserted += batch.length;
  }

  const allVendorIds = [...new Set(prep.map((p) => slugToId.get(p.slug)).filter(Boolean))];
  const vidsWithProducts = new Set();
  await inChunks(allVendorIds, 200, async (idPart) => {
    const { data, error } = await supabase.from('products').select('vendor_id').in('vendor_id', idPart);
    if (error) {
      console.error('products preload', error.message);
      process.exit(1);
    }
    for (const row of data || []) vidsWithProducts.add(row.vendor_id);
  });

  let productsInserted = 0;
  const productRows = [];
  for (const vid of allVendorIds) {
    if (vidsWithProducts.has(vid)) continue;
    for (const item of MENU_ITEMS) {
      productRows.push({
        vendor_id: vid,
        strain_id: null,
        name: item.name,
        category: item.category,
        price_cents: item.price_cents,
        inventory_count: item.inventory_count,
        potency_thc: item.potency_thc,
        potency_cbd: item.potency_cbd,
        description: item.description,
        images: item.images,
        in_stock: true,
      });
    }
  }
  for (const batch of chunks(productRows, 200)) {
    const { error } = await supabase.from('products').insert(batch);
    if (error) {
      console.error('products batch', error.message);
      process.exit(1);
    }
    productsInserted += batch.length;
  }

  console.log(
    JSON.stringify(
      {
        csvPath,
        nyMarket: NY_MARKET_SLUG,
        vendorsInserted,
        vendorsUpdated,
        vendorRows: prep.length,
        opsBatches,
        listingsInserted,
        listingsSkipped,
        geoSet,
        geoFailed: geoRes.fail,
        productsInserted,
        rowsSkippedNoSlug: rowsSkipped,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
