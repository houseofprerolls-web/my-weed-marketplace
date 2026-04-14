/**
 * Insert DCC ULS Non-Storefront retailer rows that are not yet tied to any vendor (by license number).
 *
 * Each new row:
 * - `user_id` null (unclaimed)
 * - `address` null + county as `city` / `CA` → trigger 0194 sets delivery-only (red map dots when `online_menu_enabled` is false)
 * - `online_menu_enabled` false → compact dot markers (same size as directory storefront dots)
 * - `business_licenses` row with issue/expiry from CSV
 * - `set_vendor_geog_point` from Mapbox geocode of "{premiseCounty} County, CA" (or CA fallback + jitter)
 * - `vendor_market_operations` approved for all listing markets (same pattern as import-ca-gov-retailers-csv.mjs)
 *
 *   node scripts/seed-uls-nonstorefront-unmatched-vendors.mjs
 *   node scripts/seed-uls-nonstorefront-unmatched-vendors.mjs --apply
 *   node scripts/seed-uls-nonstorefront-unmatched-vendors.mjs --apply --jitter-only
 *     (skip Mapbox; pins use CA centroid + deterministic jitter — fastest bulk load)
 *   node scripts/seed-uls-nonstorefront-unmatched-vendors.mjs --csv "C:/path/uls.csv"
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 * Optional: NEXT_PUBLIC_MAPBOX_TOKEN (county centroid geocode)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APPLY = process.argv.includes('--apply');
const JITTER_ONLY = process.argv.includes('--jitter-only');

function argPath(flag) {
  const eqArg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) return eqArg.slice(flag.length + 1).trim() || null;
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1];
  }
  return null;
}

function resolveDefaultCsvPath() {
  const explicit = argPath('--csv');
  if (explicit && fs.existsSync(explicit)) return explicit;
  const candidates = [
    path.join(__dirname, '..', 'data', 'uls-export-04-13-2026.csv'),
    path.join('C:', 'Users', 'itssj', 'Downloads', 'uls-export-04-13-2026.csv'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

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

function normalizeLicenseKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-lic$/i, '');
}

function parseUsDateToIsoDate(s) {
  const t = String(s || '').trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const mon = Number.parseInt(m[1], 10);
  const day = Number.parseInt(m[2], 10);
  const y = Number.parseInt(m[3], 10);
  if (!Number.isFinite(mon) || !Number.isFinite(day) || !Number.isFinite(y)) return null;
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isNonStorefrontRetailRow(licenseType) {
  const t = String(licenseType || '').toLowerCase();
  return t.includes('non-storefront') && t.includes('retailer');
}

function slugFromLicense(rawNum) {
  const h = crypto.createHash('sha256').update(String(rawNum).trim()).digest('hex').slice(0, 20);
  return `uls-ns-${h}`;
}

function hashJitter(id, seed2, center) {
  let h = 2166136261;
  const s = id + (seed2 || '');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const dx = (((h >>> 0) % 180) / 1800 - 0.05) * 1.2;
  const dy = ((((h >>> 10) % 180) / 1800 - 0.05) * 0.9) / Math.cos((center.lat * Math.PI) / 180);
  return { lat: center.lat + dy, lng: center.lng + dx };
}

async function fetchAllVendorsLicenseKeys(supabase) {
  const keys = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('vendors').select('license_number').range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const r of rows) {
      const lic = String(r.license_number || '').trim();
      const k = normalizeLicenseKey(lic);
      if (k) keys.add(k);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

async function fetchAllBusinessLicenseKeys(supabase) {
  const keys = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('business_licenses').select('license_number').range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const r of rows) {
      const lic = String(r.license_number || '').trim();
      const k = normalizeLicenseKey(lic);
      if (k) keys.add(k);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

const DCC_AUTHORITY = 'California Department of Cannabis Control (DCC)';

async function geocodeCountyCa(countyName, token) {
  const county = String(countyName || '').trim();
  const q = encodeURIComponent(county ? `${county} County, California` : 'California, United States');
  const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?limit=1&country=US&access_token=${token}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const j = await r.json();
  const f = j.features?.[0];
  if (!f?.center) return null;
  return { lng: f.center[0], lat: f.center[1] };
}

async function upsertBusinessLicense(supabase, vendorId, canonicalLicense, issueIso, expiryIso) {
  const { data: rows, error: selErr } = await supabase
    .from('business_licenses')
    .select('id, license_number')
    .eq('vendor_id', vendorId);
  if (selErr) throw new Error(selErr.message);
  const list = rows || [];
  const norm = normalizeLicenseKey(canonicalLicense);
  let row = list.find((r) => normalizeLicenseKey(r.license_number) === norm);
  if (!row && list.length === 1) row = list[0];
  if (!row && list.length > 1) {
    row = list.sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
  }

  const payload = {
    license_number: canonicalLicense.trim(),
    license_type: 'retail',
    issuing_authority: DCC_AUTHORITY,
    issue_date: issueIso || null,
    expiry_date: expiryIso,
    updated_at: new Date().toISOString(),
  };

  if (row?.id) {
    const { error } = await supabase.from('business_licenses').update(payload).eq('id', row.id);
    if (error) throw new Error(error.message);
    return 'updated';
  }
  const { error } = await supabase.from('business_licenses').insert({
    vendor_id: vendorId,
    ...payload,
    verification_status: 'verified',
  });
  if (error) throw new Error(error.message);
  return 'inserted';
}

function displayName(rec) {
  const legal = String(rec.businessLegalName ?? rec['businessLegalName'] ?? '').trim();
  const dba = String(rec.businessDbaName ?? rec['businessDbaName'] ?? '').trim();
  const rawNum = String(rec.licenseNumber ?? rec['licenseNumber'] ?? '').trim();
  const name = legal || dba || rawNum;
  return name.length > 180 ? `${name.slice(0, 177)}…` : name;
}

function countyCity(rec) {
  const c = String(rec.premiseCounty ?? rec['premiseCounty'] ?? '').trim();
  if (c) return `${c} County`;
  return 'California';
}

async function main() {
  loadEnvLocal();
  const csvPath = resolveDefaultCsvPath();
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const mapboxToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || '').trim();

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const vendorLicKeys = await fetchAllVendorsLicenseKeys(supabase);
  const blLicKeys = await fetchAllBusinessLicenseKeys(supabase);
  const knownKeys = new Set([...vendorLicKeys, ...blLicKeys]);

  const { data: markets, error: mErr } = await supabase.from('listing_markets').select('id,slug');
  if (mErr || !markets?.length) {
    console.error('Could not load listing_markets:', mErr?.message);
    process.exit(1);
  }

  const toSeed = [];
  const seen = new Set();
  for (const rec of records) {
    const licenseType = rec.licenseType ?? rec['licenseType'];
    if (!isNonStorefrontRetailRow(licenseType)) continue;

    const rawNum = String(rec.licenseNumber ?? rec['licenseNumber'] ?? '').trim();
    if (!rawNum) continue;
    const k = normalizeLicenseKey(rawNum);
    if (!k || seen.has(k)) continue;
    seen.add(k);

    if (knownKeys.has(k)) continue;

    const expiryIso = parseUsDateToIsoDate(rec.expirationDate ?? rec['expirationDate']);
    if (!expiryIso) continue;

    const issueIso = parseUsDateToIsoDate(rec.issueDate ?? rec['issueDate']);
    toSeed.push({ rec, rawNum, k, expiryIso, issueIso });
  }

  let inserted = 0;
  let skippedSlugCollision = 0;
  let geoOk = 0;
  let geoFallback = 0;

  const caCenter = { lat: 36.7783, lng: -119.4179 };

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          csvPath,
          eligibleUnmatchedRows: toSeed.length,
          hint: 'Re-run with --apply to insert vendors, licenses, map coordinates, and market ops.',
        },
        null,
        2
      )
    );
    return;
  }

  for (const row of toSeed) {
    const { rec, rawNum, expiryIso, issueIso } = row;
    const name = displayName(rec);
    const slug = slugFromLicense(rawNum);
    const city = countyCity(rec);
    const phoneRaw = String(rec.businessPhone ?? rec['businessPhone'] ?? '').trim();
    const phone = phoneRaw.length > 32 ? phoneRaw.slice(0, 32) : phoneRaw || null;

    let lat;
    let lng;
    if (mapboxToken && !JITTER_ONLY) {
      try {
        await new Promise((r) => setTimeout(r, 60));
        const countyName = String(rec.premiseCounty ?? rec['premiseCounty'] ?? '').trim();
        const pt = await geocodeCountyCa(countyName, mapboxToken);
        if (pt) {
          lat = pt.lat;
          lng = pt.lng;
          geoOk++;
        }
      } catch (e) {
        console.warn('Geocode error', slug, e?.message || e);
      }
    }
    if (lat == null || lng == null) {
      const j = hashJitter(slug, row.k, caCenter);
      lat = j.lat;
      lng = j.lng;
      geoFallback++;
    }

    const insertPayload = {
      user_id: null,
      name,
      slug,
      tagline: null,
      description:
        'California DCC non-storefront retailer (imported from ULS). No public storefront on file — delivery lane. Unclaimed listing.',
      logo_url: null,
      banner_url: null,
      map_marker_image_url: null,
      license_number: rawNum,
      verified: false,
      license_status: 'approved',
      is_live: true,
      is_directory_listing: true,
      subscription_tier: 'basic',
      address: null,
      city,
      state: 'CA',
      zip: null,
      phone,
      smokers_club_eligible: false,
      online_menu_enabled: false,
      map_visible_override: true,
      social_equity_badge_visible: false,
      billing_delinquent: false,
    };

    const { data: slugHit } = await supabase.from('vendors').select('id').eq('slug', slug).maybeSingle();
    if (slugHit?.id) {
      console.warn('Skip slug collision', slug);
      skippedSlugCollision++;
      continue;
    }

    const { data: ins, error: iErr } = await supabase.from('vendors').insert(insertPayload).select('id').single();
    if (iErr) {
      console.error('Insert vendor', slug, iErr.message);
      continue;
    }
    const vid = ins.id;
    inserted++;

    const { error: rpcErr } = await supabase.rpc('set_vendor_geog_point', {
      p_vendor_id: vid,
      p_lng: lng,
      p_lat: lat,
    });
    if (rpcErr) console.error('set_vendor_geog_point', slug, rpcErr.message);

    try {
      await upsertBusinessLicense(supabase, vid, rawNum, issueIso, expiryIso);
    } catch (e) {
      console.error('business_licenses', slug, e?.message || e);
    }

    const allMarketOps = markets.map((m) => ({
      vendor_id: vid,
      market_id: m.id,
      approved: true,
      note: 'uls-nonstorefront-seed',
    }));
    const { error: opErr } = await supabase
      .from('vendor_market_operations')
      .upsert(allMarketOps, { onConflict: 'vendor_id,market_id' });
    if (opErr) console.error('vendor_market_operations', slug, opErr.message);

    knownKeys.add(row.k);
  }

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        csvPath,
        eligibleUnmatchedRows: toSeed.length,
        vendorsInserted: inserted,
        skippedSlugCollision,
        geocodeHit: geoOk,
        coordinatesFromFallback: geoFallback,
        usedMapboxGeocoding: Boolean(mapboxToken) && !JITTER_ONLY,
        jitterOnly: JITTER_ONLY,
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
