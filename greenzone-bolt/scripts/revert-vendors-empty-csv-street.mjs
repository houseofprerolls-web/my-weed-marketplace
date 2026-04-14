/**
 * Clear vendors.address for slugs whose **committed seed CSV** had no street line,
 * matching the vendor import scripts’ column rules.
 *
 * **Delivery-only:** Migration `0194_vendors_global_single_lane_service_modes.sql` installs
 * `vendors_enforce_service_mode_from_address` (before insert/update on `vendors`). When
 * `address` is cleared while `city`/`state` often remain, the street line is empty → trigger
 * sets `offers_storefront = false` and `offers_delivery = true`. Do not rely on manually
 * setting `offers_*` here.
 *
 * **Map pin:** This script does **not** change `vendors.location` (ZIP+jitter / geocode stays).
 *
 * **CA gov CSV:** Importer skips rows without `data` (street) and valid ZIP, so this file
 * usually contributes **zero** slugs to the revert set; we still scan for completeness.
 *
 * Defaults (override with flags below):
 *   --smokers-csv / --findweedny-csv / --ca-gov-csv  (path, or --flag=path)
 *
 *   node scripts/revert-vendors-empty-csv-street.mjs              # dry-run (default)
 *   node scripts/revert-vendors-empty-csv-street.mjs --apply      # perform updates
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local via load below)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APPLY = process.argv.includes('--apply');

const DEFAULT_SMOKERS = path.join(__dirname, '..', 'data', 'smokers_club_retailer_seed_by_ca_region.csv');
const DEFAULT_FINDWEEDNY = path.join(__dirname, '..', 'data', 'findweedny-com-2026-04-01.csv');
const DEFAULT_CA_GOV = path.join(__dirname, '..', 'data', 'real-cannabis-ca-gov-2026-04-06-2.csv');

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

/** @param {string} flag e.g. '--smokers-csv' */
function argPath(flag) {
  const eqArg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) return eqArg.slice(flag.length + 1).trim() || null;
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1];
  }
  return null;
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

function slugFromItemPageLink(link) {
  const u = String(link || '').trim();
  const seg = u.split('/').filter(Boolean).pop();
  if (!seg) return null;
  const id = seg.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) return null;
  return `ny-${id}`;
}

function normRow(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    o[String(k).trim()] = v;
  }
  return o;
}

/**
 * @param {string} smokersPath
 * @returns {Map<string, Set<string>>}
 */
function collectSmokers(smokersPath) {
  const bySlug = new Map();
  const lines = fs.readFileSync(smokersPath, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  if (idx.slug == null || idx.address == null) {
    throw new Error(`Smokers CSV missing slug or address column: ${smokersPath}`);
  }
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < header.length) continue;
    const slug = String(cells[idx.slug] ?? '').trim();
    if (!slug) continue;
    const addr = String(cells[idx.address] ?? '').trim();
    if (addr !== '') continue;
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug).add('smokers');
  }
  return bySlug;
}

/**
 * @param {string} findweednyPath
 * @returns {Map<string, Set<string>>}
 */
function collectFindweedny(findweednyPath) {
  const bySlug = new Map();
  const raw = fs.readFileSync(findweednyPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  for (const rawRow of records) {
    const r = normRow(rawRow);
    const slug = slugFromItemPageLink(r.item_page_link);
    if (!slug) continue;
    const street = String(r.streetAddress || '').trim();
    if (street !== '') continue;
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug).add('findweedny');
  }
  return bySlug;
}

/**
 * Rows with empty street were skipped by importer, but we record slugs for completeness.
 * @param {string} caGovPath
 * @returns {Map<string, Set<string>>}
 */
function collectCaGov(caGovPath) {
  const bySlug = new Map();
  const lines = fs.readFileSync(caGovPath, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < header.length) continue;
    const name = (cells[col.name] ?? '').trim();
    const street = (cells[col.data] ?? '').trim();
    const zip = extractZip5(cells[col.data6] ?? '');
    if (street !== '') continue;
    if (!name || zip.length !== 5) continue;
    const slug = slugFromKey(rowDedupKey(name, street, zip));
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug).add('ca-gov');
  }
  return bySlug;
}

function mergeSources(maps) {
  /** @type {Map<string, Set<string>>} */
  const out = new Map();
  for (const m of maps) {
    for (const [slug, tags] of m) {
      if (!out.has(slug)) out.set(slug, new Set());
      for (const t of tags) out.get(slug).add(t);
    }
  }
  return out;
}

function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  loadEnvLocal();

  const smokersPath = argPath('--smokers-csv') || DEFAULT_SMOKERS;
  const findweednyPath = argPath('--findweedny-csv') || DEFAULT_FINDWEEDNY;
  const caGovPath = argPath('--ca-gov-csv') || DEFAULT_CA_GOV;

  for (const [label, p] of [
    ['Smokers', smokersPath],
    ['FindWeedNY', findweednyPath],
    ['CA gov', caGovPath],
  ]) {
    if (!fs.existsSync(p)) {
      console.error(`${label} CSV not found:`, p);
      process.exit(1);
    }
  }

  const merged = mergeSources([
    collectSmokers(smokersPath),
    collectFindweedny(findweednyPath),
    collectCaGov(caGovPath),
  ]);

  const allSlugs = [...merged.keys()].sort();
  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'apply' : 'dry-run',
        smokersCsv: smokersPath,
        findweednyCsv: findweednyPath,
        caGovCsv: caGovPath,
        uniqueSlugsWithEmptyStreetInCsv: allSlugs.length,
        bySource: {
          smokers: [...merged.entries()].filter(([, s]) => s.has('smokers')).length,
          findweedny: [...merged.entries()].filter(([, s]) => s.has('findweedny')).length,
          caGov: [...merged.entries()].filter(([, s]) => s.has('ca-gov')).length,
        },
      },
      null,
      2
    )
  );

  if (allSlugs.length === 0) {
    console.log('\nNo CSV rows with empty street — nothing to check in DB.');
    if (!APPLY) {
      console.log('Dry-run complete. If you add rows without street later, re-run (with --apply when ready).');
    }
    return;
  }

  if (allSlugs.length <= 20) {
    for (const slug of allSlugs) {
      console.log('  slug:', slug, [...merged.get(slug)].join('+'));
    }
  } else {
    for (const slug of allSlugs.slice(0, 10)) {
      console.log('  slug:', slug, [...merged.get(slug)].join('+'));
    }
    console.log('  …', allSlugs.length - 10, 'more');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let existingWithNonNullAddress = 0;
  let existingAlreadyNull = 0;
  let missingVendor = 0;
  const sampleWouldChange = [];

  for (const batch of chunks(allSlugs, 100)) {
    const { data, error } = await supabase
      .from('vendors')
      .select('slug,address,city,state,offers_storefront,offers_delivery')
      .in('slug', batch);
    if (error) {
      console.error('select vendors:', error.message);
      process.exit(1);
    }
    const seen = new Set((data || []).map((r) => r.slug));
    for (const slug of batch) {
      if (!seen.has(slug)) {
        missingVendor++;
        continue;
      }
    }
    for (const row of data || []) {
      const a = row.address != null ? String(row.address).trim() : '';
      if (a === '') existingAlreadyNull++;
      else {
        existingWithNonNullAddress++;
        if (sampleWouldChange.length < 12) {
          sampleWouldChange.push({
            slug: row.slug,
            addressPreview: a.slice(0, 48),
            city: row.city,
            offers_storefront: row.offers_storefront,
            offers_delivery: row.offers_delivery,
          });
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dbRowsMatched: allSlugs.length - missingVendor,
        missingVendorSlugInDb: missingVendor,
        matchedWithAddressNonEmpty: existingWithNonNullAddress,
        matchedWithAddressAlreadyNull: existingAlreadyNull,
        sampleWouldClearAddress: sampleWouldChange,
      },
      null,
      2
    )
  );

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to set address = NULL for matched slugs (trigger enforces delivery-only).');
    return;
  }

  let updated = 0;
  for (const batch of chunks(allSlugs, 80)) {
    const { data, error } = await supabase.from('vendors').update({ address: null }).in('slug', batch).select('slug');
    if (error) {
      console.error('update vendors:', error.message);
      process.exit(1);
    }
    updated += (data || []).length;
  }

  console.log(JSON.stringify({ applied: true, vendorRowsReturnedFromUpdate: updated }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
