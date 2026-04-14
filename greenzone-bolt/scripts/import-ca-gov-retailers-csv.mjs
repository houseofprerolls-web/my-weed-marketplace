/**
 * Import CA DCC licensed retailer CSV (real.cannabis.ca.gov scrape format) into public.vendors.
 *
 * - Deterministic slug from name + street + ZIP so re-imports overwrite the same row.
 * - Does NOT set website (scraper URL is ignored; existing websites are left unchanged on update).
 * - online_menu_enabled = false, logo/map_marker cleared → map shows small dots (see MapboxEmbed).
 * - Geocodes full address via Mapbox when NEXT_PUBLIC_MAPBOX_TOKEN is set; else ZIP + jitter fallback.
 * - Approves vendor in every listing_market (same pattern as smokers-club CSV import).
 *
 *   node scripts/import-ca-gov-retailers-csv.mjs
 *   node scripts/import-ca-gov-retailers-csv.mjs --csv "C:/path/to/file.csv"
 *   node scripts/import-ca-gov-retailers-csv.mjs --dry-run
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 * Optional: NEXT_PUBLIC_MAPBOX_TOKEN (geocoding)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes('--dry-run');
const csvArgIdx = process.argv.indexOf('--csv');
const CSV_PATH =
  csvArgIdx >= 0 && process.argv[csvArgIdx + 1]
    ? process.argv[csvArgIdx + 1]
    : path.join(__dirname, '..', 'data', 'real-cannabis-ca-gov-2026-04-06-2.csv');

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

function normKeyPart(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s#/-]/g, '')
    .trim();
}

function rowDedupKey(name, street, zip5) {
  return `${normKeyPart(name)}|${normKeyPart(street)}|${zip5}`;
}

function slugFromKey(key) {
  const h = crypto.createHash('sha256').update(key).digest('hex').slice(0, 20);
  return `ca-gov-${h}`;
}

async function geocodeMapbox(fullAddress, token) {
  const q = encodeURIComponent(fullAddress);
  const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?limit=1&country=US&types=address&access_token=${token}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const j = await r.json();
  const f = j.features?.[0];
  if (!f?.center) return null;
  return { lng: f.center[0], lat: f.center[1] };
}

async function main() {
  loadEnvLocal();

  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    process.exit(1);
  }

  const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const col = Object.fromEntries(header.map((h, i) => [h, i]));

  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < header.length) continue;
    rows.push(cells);
  }

  const mapboxToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || '').trim();

  if (DRY) {
    console.log(`Dry run: ${rows.length} rows from ${CSV_PATH}`);
    console.log('Mapbox token:', mapboxToken ? 'present' : 'absent (will use ZIP+jitter)');
    for (const cells of rows.slice(0, 3)) {
      const name = cells[col.name] ?? '';
      const street = cells[col.data] ?? '';
      const zip = extractZip5(cells[col.data6] ?? '');
      const key = rowDedupKey(name, street, zip);
      console.log('  ', slugFromKey(key), name.slice(0, 40));
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: markets, error: mErr } = await supabase.from('listing_markets').select('id,slug');
  if (mErr || !markets?.length) {
    console.error('Could not load listing_markets:', mErr?.message);
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;
  let geoOk = 0;
  let geoFallback = 0;
  let geoFail = 0;
  let opsBatches = 0;

  for (const cells of rows) {
    const name = (cells[col.name] ?? '').trim();
    const street = (cells[col.data] ?? '').trim();
    const city = (cells[col.data2] ?? '').trim();
    const zip = extractZip5(cells[col.data6] ?? '');
    const state = (cells[col.data7] ?? 'CA').trim() || 'CA';
    const equityTag = (cells[col.data8] ?? '').trim();
    if (!name || !street || zip.length !== 5) {
      console.warn('Skip incomplete row:', name || '(no name)');
      continue;
    }

    const dedupKey = rowDedupKey(name, street, zip);
    const slug = slugFromKey(dedupKey);
    const fullAddress = `${street}, ${city}, ${state} ${zip}`;
    const socialEquity = /equity/i.test(equityTag);

    let lat;
    let lng;
    if (mapboxToken) {
      try {
        await new Promise((r) => setTimeout(r, 105));
        const pt = await geocodeMapbox(fullAddress, mapboxToken);
        if (pt) {
          lat = pt.lat;
          lng = pt.lng;
          geoOk++;
        } else {
          geoFail++;
        }
      } catch (e) {
        console.warn('Geocode error', slug, e?.message || e);
        geoFail++;
      }
    }
    if (lat == null || lng == null) {
      const center = mapCenterForCaZipOrDefault(zip);
      const j = hashJitter(slug, zip, center);
      lat = j.lat;
      lng = j.lng;
      geoFallback++;
    }

    const licenseNumber = `CA-GOV-${slug.slice(-12)}`;

    const insertPayload = {
      user_id: null,
      name,
      slug,
      tagline: null,
      description: null,
      logo_url: null,
      banner_url: null,
      map_marker_image_url: null,
      license_number: licenseNumber,
      verified: true,
      license_status: 'approved',
      is_live: true,
      is_directory_listing: true,
      subscription_tier: 'basic',
      address: street,
      city: city || null,
      state,
      zip,
      phone: null,
      offers_delivery: false,
      offers_storefront: true,
      smokers_club_eligible: false,
      online_menu_enabled: false,
      map_visible_override: true,
      social_equity_badge_visible: socialEquity,
    };

    const { data: existing } = await supabase.from('vendors').select('id').eq('slug', slug).maybeSingle();
    let vid = existing?.id;

    if (vid) {
      const { error: uErr } = await supabase
        .from('vendors')
        .update({
          name: insertPayload.name,
          tagline: insertPayload.tagline,
          description: insertPayload.description,
          logo_url: null,
          banner_url: null,
          map_marker_image_url: null,
          license_number: insertPayload.license_number,
          verified: insertPayload.verified,
          license_status: insertPayload.license_status,
          is_live: true,
          is_directory_listing: true,
          subscription_tier: insertPayload.subscription_tier,
          address: insertPayload.address,
          city: insertPayload.city,
          state: insertPayload.state,
          zip: insertPayload.zip,
          phone: null,
          offers_delivery: false,
          offers_storefront: true,
          smokers_club_eligible: false,
          online_menu_enabled: false,
          map_visible_override: true,
          social_equity_badge_visible: socialEquity,
        })
        .eq('id', vid);
      if (uErr) {
        console.error('Update vendor', slug, uErr.message);
        continue;
      }
      updated++;
    } else {
      const { data: ins, error: iErr } = await supabase.from('vendors').insert(insertPayload).select('id').single();
      if (iErr) {
        console.error('Insert vendor', slug, iErr.message);
        continue;
      }
      vid = ins.id;
      inserted++;
    }

    const { error: rpcErr } = await supabase.rpc('set_vendor_geog_point', {
      p_vendor_id: vid,
      p_lng: lng,
      p_lat: lat,
    });
    if (rpcErr) {
      console.error('set_vendor_geog_point', slug, rpcErr.message);
    }

    const allMarketOps = markets.map((m) => ({
      vendor_id: vid,
      market_id: m.id,
      approved: true,
      note: 'ca-gov-csv-import',
    }));
    const { error: opErr } = await supabase
      .from('vendor_market_operations')
      .upsert(allMarketOps, { onConflict: 'vendor_id,market_id' });
    if (opErr) console.error('vendor_market_operations', slug, opErr.message);
    else opsBatches++;
  }

  console.log(
    JSON.stringify(
      {
        csv: CSV_PATH,
        rows: rows.length,
        vendorsInserted: inserted,
        vendorsUpdated: updated,
        marketsLinked: opsBatches,
        geocodeHit: geoOk,
        coordinatesFromZipJitter: geoFallback,
        geocodeFailedAttempts: geoFail,
        usedMapboxGeocoding: Boolean(mapboxToken),
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
