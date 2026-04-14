/**
 * Match CA DCC ULS export (Non-Storefront retailer licenses) to `public.vendors` by license number,
 * clear storefront street (`address` only — trigger 0194 sets delivery-only), and upsert
 * `business_licenses.expiry_date` / `issue_date` from the CSV.
 *
 *   node scripts/sync-uls-nonstorefront-csv.mjs                    # dry-run
 *   node scripts/sync-uls-nonstorefront-csv.mjs --apply
 *   node scripts/sync-uls-nonstorefront-csv.mjs --csv "C:/path/uls.csv"
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APPLY = process.argv.includes('--apply');

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
    path.join('C:', 'Users', 'itssj', 'Downloads', 'uls-export-04-13-2026.csv'),
    path.join(__dirname, '..', 'data', 'uls-export-04-13-2026.csv'),
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

/** Match importers: trim, lower, collapse spaces, strip trailing `-lic` for comparison. */
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

async function fetchAllVendorsLicenseAndAddress(supabase) {
  /** @type {Map<string, string>} */
  const byNorm = new Map();
  /** @type {Map<string, boolean>} */
  const hasStreetById = new Map();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, license_number, address')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const r of rows) {
      const id = String(r.id || '');
      const lic = String(r.license_number || '').trim();
      if (id) hasStreetById.set(id, String(r.address ?? '').trim() !== '');
      if (!id || !lic) continue;
      const k = normalizeLicenseKey(lic);
      if (k) byNorm.set(k, id);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return { byNorm, hasStreetById };
}

async function fetchAllBusinessLicenseVendorMap(supabase) {
  /** @type {Map<string, string>} vendor_id by normalized license */
  const byNorm = new Map();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('business_licenses')
      .select('vendor_id, license_number')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const r of rows) {
      const vid = String(r.vendor_id || '');
      const lic = String(r.license_number || '').trim();
      if (!vid || !lic) continue;
      const k = normalizeLicenseKey(lic);
      if (k && !byNorm.has(k)) byNorm.set(k, vid);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return byNorm;
}

const DCC_AUTHORITY = 'California Department of Cannabis Control (DCC)';

async function upsertBusinessLicense(supabase, vendorId, canonicalLicense, issueIso, expiryIso, dryRun) {
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
    issue_date: issueIso,
    expiry_date: expiryIso,
    updated_at: new Date().toISOString(),
  };

  if (dryRun) return { action: row ? 'update' : 'insert' };

  if (row?.id) {
    const { error } = await supabase.from('business_licenses').update(payload).eq('id', row.id);
    if (error) throw new Error(error.message);
    return { action: 'updated' };
  }
  const { error } = await supabase.from('business_licenses').insert({
    vendor_id: vendorId,
    ...payload,
    verification_status: 'verified',
  });
  if (error) throw new Error(error.message);
  return { action: 'inserted' };
}

async function main() {
  loadEnvLocal();
  const csvPath = resolveDefaultCsvPath();
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    console.error('Pass --csv "C:/full/path/to/uls-export.csv"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const { byNorm: vendorByLic, hasStreetById } = await fetchAllVendorsLicenseAndAddress(supabase);
  const vendorByBlLic = await fetchAllBusinessLicenseVendorMap(supabase);

  let csvNonStorefront = 0;
  let matchedByVendor = 0;
  let matchedByBusinessLicense = 0;
  const unmatched = [];
  let wouldClearAddress = 0;
  let wouldUpsertLicense = 0;
  let appliedVendorUpdates = 0;
  let appliedLicense = 0;

  for (const rec of records) {
    const licenseType = rec.licenseType ?? rec['licenseType'];
    if (!isNonStorefrontRetailRow(licenseType)) continue;
    csvNonStorefront++;

    const rawNum = String(rec.licenseNumber ?? rec['licenseNumber'] ?? '').trim();
    if (!rawNum) continue;
    const k = normalizeLicenseKey(rawNum);
    let vendorId = vendorByLic.get(k);
    if (vendorId) matchedByVendor++;
    else {
      vendorId = vendorByBlLic.get(k);
      if (vendorId) matchedByBusinessLicense++;
    }

    if (!vendorId) {
      unmatched.push(rawNum);
      continue;
    }

    const issueIso = parseUsDateToIsoDate(rec.issueDate ?? rec['issueDate']);
    const expiryIso = parseUsDateToIsoDate(rec.expirationDate ?? rec['expirationDate']);
    if (!expiryIso) {
      unmatched.push(`${rawNum} (bad expiry)`);
      continue;
    }

    if (hasStreetById.get(vendorId) === true) wouldClearAddress++;
    wouldUpsertLicense++;

    if (APPLY) {
      const { error: uErr } = await supabase.from('vendors').update({ address: null }).eq('id', vendorId);
      if (uErr) throw new Error(`vendor ${vendorId}: ${uErr.message}`);
      appliedVendorUpdates++;

      await upsertBusinessLicense(supabase, vendorId, rawNum, issueIso, expiryIso, false);
      appliedLicense++;
    }
  }

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    csvPath,
    csvNonStorefrontRows: csvNonStorefront,
    csvRowsMatchedToVendor: matchedByVendor + matchedByBusinessLicense,
    matchedByVendorLicenseColumn: matchedByVendor,
    matchedByBusinessLicensesOnly: matchedByBusinessLicense,
    unmatchedCount: unmatched.length,
    sampleUnmatched: unmatched.slice(0, 25),
    wouldClearAddressWithStreet: wouldClearAddress,
    wouldUpsertBusinessLicenses: wouldUpsertLicense,
    appliedVendorAddressClears: APPLY ? appliedVendorUpdates : 0,
    appliedLicenseWrites: APPLY ? appliedLicense : 0,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
