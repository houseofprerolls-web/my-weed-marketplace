/**
 * Import greenzone-bolt/data/smokers_club_retailer_seed_by_ca_region.csv into Supabase:
 * - Upsert vendors (by slug): live, approved, directory, smokers_club_eligible, map_visible_override, online_menu
 * - set_vendor_geog_point RPC for map coords (ZIP anchor + jitter)
 * - vendor_market_operations approved for every listing_market (Smokers Club + ZIP checks need per-market approval)
 * - vendor_market_listings club_lane=treehouse, slot_rank 1–10 if slot free
 * - Seed a small menu (products) when vendor has none
 *
 * Requires: migration 0089_set_vendor_geog_point_rpc.sql applied.
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (in .env.local)
 *
 *   node scripts/import-smokers-club-csv.mjs
 *   node scripts/import-smokers-club-csv.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');

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

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (!inQ && c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function extractZip5(z) {
  const d = String(z || '').replace(/\D/g, '');
  return d.length >= 5 ? d.slice(0, 5) : '';
}

function mapCenterForCaZipOrDefault(zip) {
  const z5 = extractZip5(zip);
  if (z5.length !== 5) return { lat: 34.0522, lng: -118.2437 };
  const p = parseInt(z5.slice(0, 3), 10);
  if (p < 900 || p > 961) return { lat: 34.0522, lng: -118.2437 };
  if (p <= 908) return { lat: 34.05, lng: -118.25 };
  if (p <= 918) return { lat: 34.15, lng: -118.05 };
  if (p <= 921) return { lat: 32.85, lng: -117.15 };
  if (p <= 925) return { lat: 33.98, lng: -117.38 };
  if (p <= 928) return { lat: 33.75, lng: -117.87 };
  if (p <= 934) return { lat: 34.65, lng: -120.45 };
  if (p <= 936) return { lat: 35.37, lng: -119.02 };
  if (p <= 938) return { lat: 36.74, lng: -119.77 };
  if (p === 939) return { lat: 36.68, lng: -121.66 };
  if (p === 940) return { lat: 37.55, lng: -122.32 };
  if (p === 941) return { lat: 37.77, lng: -122.42 };
  if (p <= 945) return { lat: 37.8, lng: -122.12 };
  if (p <= 948) return { lat: 37.8, lng: -122.27 };
  if (p === 949) return { lat: 38.04, lng: -122.55 };
  if (p <= 951) return { lat: 37.34, lng: -121.89 };
  if (p <= 953) return { lat: 37.79, lng: -121.22 };
  if (p <= 955) return { lat: 38.44, lng: -122.71 };
  if (p === 956) return { lat: 38.58, lng: -121.01 };
  if (p <= 958) return { lat: 38.58, lng: -121.49 };
  if (p === 959) return { lat: 39.73, lng: -121.84 };
  if (p <= 961) return { lat: 40.59, lng: -122.39 };
  return { lat: 34.0522, lng: -118.2437 };
}

function hashJitter(id, zip, center) {
  let h = 2166136261;
  const s = id + (zip || '');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const dx = (((h >>> 0) % 180) / 1800 - 0.05) * 1.2;
  const dy = ((((h >>> 10) % 180) / 1800 - 0.05) * 0.9) / Math.cos((center.lat * Math.PI) / 180);
  return { lat: center.lat + dy, lng: center.lng + dx };
}

function toBool(s) {
  return String(s).toLowerCase() === 'true';
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

  const csvPath = path.join(__dirname, '..', 'data', 'smokers_club_retailer_seed_by_ca_region.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < header.length) continue;
    rows.push(cells);
  }

  if (DRY) {
    console.log(`Dry run: ${rows.length} CSV rows (no database writes).`);
    for (const cells of rows.slice(0, 5)) {
      console.log('  sample:', cells[idx.slug], '→', cells[idx.listing_market_slug]);
    }
    if (rows.length > 5) console.log('  …');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment (.env.local).');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: markets, error: mErr } = await supabase.from('listing_markets').select('id,slug');
  if (mErr || !markets?.length) {
    console.error('Could not load listing_markets:', mErr?.message);
    process.exit(1);
  }
  const marketIdBySlug = new Map(markets.map((m) => [m.slug, m.id]));

  /** @type {Map<string, Set<number>>} */
  const occupiedTreeSlots = new Map();

  async function refreshOccupiedSlots(marketId) {
    const { data, error } = await supabase
      .from('vendor_market_listings')
      .select('slot_rank')
      .eq('market_id', marketId)
      .eq('club_lane', 'treehouse')
      .eq('active', true);
    if (error) {
      console.warn('Listings read:', error.message);
      return new Set();
    }
    return new Set((data || []).map((r) => r.slot_rank));
  }

  for (const m of markets) {
    occupiedTreeSlots.set(m.id, await refreshOccupiedSlots(m.id));
  }

  let vendorsInserted = 0;
  let vendorsUpdated = 0;
  let opsUpserted = 0;
  let listingsInserted = 0;
  let listingsSkipped = 0;
  let geoSet = 0;
  let productsInserted = 0;

  for (const cells of rows) {
    const g = (k) => cells[idx[k]] ?? '';

    const listingSlug = g('listing_market_slug');
    const marketId = marketIdBySlug.get(listingSlug);
    if (!marketId) {
      console.warn('Skip unknown market:', listingSlug, g('slug'));
      continue;
    }

    const name = g('name');
    const slug = g('slug');
    const zip = g('zip');
    const center = mapCenterForCaZipOrDefault(zip);
    const { lat, lng } = hashJitter(slug, zip, center);

    const licenseNumber = g('license_number').trim() || `SEED-${slug}`.slice(0, 80);

    const vendorPayload = {
      user_id: null,
      name,
      slug,
      tagline: g('tagline') || null,
      description: g('description') || null,
      logo_url: g('logo_url') || null,
      banner_url: g('banner_url') || null,
      map_marker_image_url: g('logo_url') || null,
      license_number: licenseNumber,
      verified: toBool(g('verified')),
      license_status: g('license_status') || 'approved',
      is_live: true,
      is_directory_listing: true,
      subscription_tier: g('subscription_tier') || 'basic',
      address: g('address') || null,
      city: g('city') || null,
      state: g('state') || 'CA',
      zip,
      phone: g('phone') || null,
      website: g('website') || null,
      offers_delivery: toBool(g('offers_delivery')),
      offers_storefront: toBool(g('offers_storefront')),
      smokers_club_eligible: true,
      online_menu_enabled: true,
      map_visible_override: true,
    };

    const { data: existing } = await supabase.from('vendors').select('id').eq('slug', slug).maybeSingle();
    let vid = existing?.id;

    if (vid) {
      const { error: uErr } = await supabase
        .from('vendors')
        .update({
          name: vendorPayload.name,
          tagline: vendorPayload.tagline,
          description: vendorPayload.description,
          logo_url: vendorPayload.logo_url,
          banner_url: vendorPayload.banner_url,
          map_marker_image_url: vendorPayload.map_marker_image_url,
          license_number: vendorPayload.license_number,
          verified: vendorPayload.verified,
          license_status: vendorPayload.license_status,
          is_live: true,
          is_directory_listing: true,
          subscription_tier: vendorPayload.subscription_tier,
          address: vendorPayload.address,
          city: vendorPayload.city,
          state: vendorPayload.state,
          zip: vendorPayload.zip,
          phone: vendorPayload.phone,
          website: vendorPayload.website,
          offers_delivery: vendorPayload.offers_delivery,
          offers_storefront: vendorPayload.offers_storefront,
          smokers_club_eligible: true,
          online_menu_enabled: true,
          map_visible_override: true,
        })
        .eq('id', vid);
      if (uErr) {
        console.error('Update vendor', slug, uErr.message);
        continue;
      }
      vendorsUpdated++;
    } else {
      const { data: ins, error: iErr } = await supabase.from('vendors').insert(vendorPayload).select('id').single();
      if (iErr) {
        console.error('Insert vendor', slug, iErr.message);
        continue;
      }
      vid = ins.id;
      vendorsInserted++;
    }

    const { error: rpcErr } = await supabase.rpc('set_vendor_geog_point', {
      p_vendor_id: vid,
      p_lng: lng,
      p_lat: lat,
    });
    if (rpcErr) {
      console.error('set_vendor_geog_point', slug, rpcErr.message);
    } else {
      geoSet++;
    }

    const allMarketOps = markets.map((m) => ({
      vendor_id: vid,
      market_id: m.id,
      approved: true,
      note: 'smokers-club-csv-all-markets',
    }));
    const { error: opErr } = await supabase
      .from('vendor_market_operations')
      .upsert(allMarketOps, { onConflict: 'vendor_id,market_id' });
    if (opErr) console.error('vendor_market_operations', slug, opErr.message);
    else opsUpserted++;

    const occ = occupiedTreeSlots.get(marketId) || new Set();
    const { data: existingListing } = await supabase
      .from('vendor_market_listings')
      .select('slot_rank')
      .eq('market_id', marketId)
      .eq('vendor_id', vid)
      .eq('club_lane', 'treehouse')
      .maybeSingle();

    let pref = parseInt(g('rank_in_region'), 10);
    if (!Number.isFinite(pref) || pref < 1 || pref > 10) pref = 10;

    let slot;
    if (existingListing?.slot_rank != null) {
      slot = existingListing.slot_rank;
    } else {
      slot = pref;
      if (occ.has(slot)) {
        slot = 0;
        for (let r = 1; r <= 10; r++) {
          if (!occ.has(r)) {
            slot = r;
            break;
          }
        }
      }
    }

    if (slot === 0 || slot == null) {
      console.warn('No free treehouse slot for market', listingSlug, 'vendor', slug);
      listingsSkipped++;
    } else {
      const { error: lErr } = await supabase.from('vendor_market_listings').upsert(
        {
          market_id: marketId,
          vendor_id: vid,
          slot_rank: slot,
          club_lane: 'treehouse',
          is_premium: true,
          active: true,
          note: 'csv-import',
        },
        { onConflict: 'market_id,vendor_id,club_lane' }
      );
      if (lErr) {
        console.error('vendor_market_listings', slug, lErr.message);
        listingsSkipped++;
      } else {
        if (!existingListing) occ.add(slot);
        occupiedTreeSlots.set(marketId, occ);
        listingsInserted++;
      }
    }

    const { count, error: cErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vid);
    if (cErr) {
      console.error('product count', slug, cErr.message);
      continue;
    }
    if ((count ?? 0) > 0) continue;

    const productRows = MENU_ITEMS.map((p) => ({
      vendor_id: vid,
      strain_id: null,
      name: p.name,
      category: p.category,
      price_cents: p.price_cents,
      inventory_count: p.inventory_count,
      potency_thc: p.potency_thc,
      potency_cbd: p.potency_cbd,
      description: p.description,
      images: p.images,
      in_stock: true,
    }));
    const { error: pErr } = await supabase.from('products').insert(productRows);
    if (pErr) console.error('products', slug, pErr.message);
    else productsInserted += productRows.length;
  }

  console.log(JSON.stringify({ vendorsInserted, vendorsUpdated, opsUpserted, listingsInserted, listingsSkipped, geoSet, productsInserted }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
