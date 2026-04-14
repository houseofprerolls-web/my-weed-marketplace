/**
 * Re-run the same quasi-random county-blob pin layout as `lib/countyQuasiPinLayout.ts` and persist via
 * `set_vendor_geog_point` so DB coords match the map (optional follow-up from natural-county-pin plan).
 *
 *   node scripts/relayout-uls-ns-vendor-pins.mjs
 *   node scripts/relayout-uls-ns-vendor-pins.mjs --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Keep in sync with: greenzone-bolt/lib/countyQuasiPinLayout.ts (quasiRandomLatLngInBoundingBox + grouping).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

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

function normalizeCountyLookupKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function premiseCountyNameFromVendorCity(city) {
  const t = String(city ?? '').trim();
  const m = t.match(/^(.+?)\s+County$/i);
  if (!m) return null;
  const inner = m[1].trim();
  return inner.length > 0 ? inner : null;
}

const BOUNDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'ca-county-map-bounds.json'), 'utf8')
);

function halton(index, base) {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

function insetBoundingBox(bbox) {
  const padLat = (bbox.north - bbox.south) * 0.05;
  const padLng = (bbox.east - bbox.west) * 0.05;
  return {
    s: bbox.south + padLat,
    n: bbox.north - padLat,
    w: bbox.west + padLng,
    e: bbox.east - padLng,
  };
}

function clampLatLngToInset(ll, box) {
  return {
    lat: Math.min(box.n, Math.max(box.s, ll.lat)),
    lng: Math.min(box.e, Math.max(box.w, ll.lng)),
  };
}

function haversineMeters(a, b) {
  const R = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/** Sync with countyQuasiPinLayout.ts */
function quasiRandomLatLngInBoundingBox(ids, bbox) {
  const out = new Map();
  const num = ids.length;
  if (num === 0) return out;
  const blobFrac = Math.min(0.27, 0.14 + Math.sqrt(Math.max(num, 1)) * 0.0095);
  const { s, n, w, e } = insetBoundingBox(bbox);
  const latSpan = Math.max(n - s, 1e-6);
  const lngSpan = Math.max(e - w, 1e-6);
  const anchorLat = (s + n) / 2;
  const anchorLng = (w + e) / 2;
  const minSpan = Math.min(latSpan, lngSpan);
  const halfLat = (blobFrac * minSpan) / 2;
  const halfLng = (blobFrac * minSpan) / 2;

  if (num === 1) {
    out.set(ids[0], clampLatLngToInset({ lat: anchorLat, lng: anchorLng }, { s, n, w, e }));
    return out;
  }

  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  for (let i = 0; i < sorted.length; i++) {
    const hi = i + 1;
    const u = halton(hi, 2) * 2 - 1;
    const v = halton(hi, 3) * 2 - 1;
    const lat = anchorLat + u * halfLat;
    const lng = anchorLng + v * halfLng;
    out.set(sorted[i], clampLatLngToInset({ lat, lng }, { s, n, w, e }));
  }

  const MIN_SEP_M = 220;
  const cosMid = Math.cos((anchorLat * Math.PI) / 180);
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.max(0.25, Math.abs(cosMid));

  for (let i = 0; i < sorted.length; i++) {
    const idI = sorted[i];
    let pi = out.get(idI);
    for (let j = 0; j < i; j++) {
      const pj = out.get(sorted[j]);
      const d = haversineMeters(pi, pj);
      if (d >= MIN_SEP_M || d < 1e-6) continue;
      const push = MIN_SEP_M - d + 12;
      const dlat = pi.lat - pj.lat;
      const dlng = pi.lng - pj.lng;
      const flat = Math.hypot(dlat * mPerLat, dlng * mPerLng);
      if (flat < 1e-12) {
        const ang = (i * 2.39996322972865332) % (2 * Math.PI);
        pi = {
          lat: pi.lat + (Math.sin(ang) * push) / mPerLat,
          lng: pi.lng + (Math.cos(ang) * push) / mPerLng,
        };
      } else {
        const nx = ((dlat * mPerLat) / flat) * (push / mPerLat);
        const ny = ((dlng * mPerLng) / flat) * (push / mPerLng);
        pi = { lat: pi.lat + nx, lng: pi.lng + ny };
      }
      pi = clampLatLngToInset(pi, { s, n, w, e });
      out.set(idI, pi);
    }
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: vendors, error: vErr } = await supabase
    .from('vendors')
    .select('id,city,state')
    .like('slug', 'uls-ns-%');
  if (vErr) throw vErr;
  if (!vendors?.length) {
    console.log(JSON.stringify({ message: 'No uls-ns- vendors found', count: 0 }, null, 2));
    return;
  }

  const ids = vendors.map((v) => v.id);
  const positions = new Map();
  const CHUNK = 80;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    const { data: coords, error: cErr } = await supabase
      .from('vendors_public_coords')
      .select('vendor_id, geo_lat, geo_lng')
      .in('vendor_id', part);
    if (cErr) throw cErr;
    for (const r of coords || []) {
      const lat = r.geo_lat;
      const lng = r.geo_lng;
      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        positions.set(r.vendor_id, { lat, lng });
      }
    }
  }

  const byCountyKey = new Map();
  const meta = new Map(vendors.map((v) => [v.id, v]));
  for (const v of vendors) {
    const state = String(v.state ?? '').trim().toUpperCase();
    const isCA = !state || state === 'CA';
    const countyName = premiseCountyNameFromVendorCity(v.city);
    const bbox = countyName && isCA ? BOUNDS[normalizeCountyLookupKey(countyName)] : null;
    if (countyName && isCA && bbox) {
      const k = normalizeCountyLookupKey(countyName);
      let arr = byCountyKey.get(k);
      if (!arr) {
        arr = [];
        byCountyKey.set(k, arr);
      }
      arr.push(v.id);
    }
  }

  const next = new Map();
  for (const [countyKey, groupIds] of Array.from(byCountyKey.entries())) {
    const bbox = BOUNDS[countyKey];
    if (!bbox || !groupIds.length) continue;
    const sorted = [...groupIds].sort((a, b) => a.localeCompare(b));
    const laid = quasiRandomLatLngInBoundingBox(sorted, bbox);
    for (const [id, ll] of laid) next.set(id, ll);
  }

  let rpcOk = 0;
  let skipped = 0;
  for (const [id, ll] of next) {
    if (!APPLY) continue;
    const { error } = await supabase.rpc('set_vendor_geog_point', {
      p_vendor_id: id,
      p_lng: ll.lng,
      p_lat: ll.lat,
    });
    if (error) {
      console.error('RPC', id, error.message);
      skipped++;
    } else rpcOk++;
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'apply' : 'dry-run',
        ulsNsVendorRows: vendors.length,
        countyGroups: byCountyKey.size,
        positionsToWrite: next.size,
        rpcUpdates: APPLY ? rpcOk : 0,
        rpcErrors: APPLY ? skipped : 0,
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
