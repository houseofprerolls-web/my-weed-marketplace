/**
 * Enrich public.business_licenses from ULS storefront CSV (issue/expiry/type/status).
 *
 * CSV: ../../supabase/seed-data/uls-storefront-export-03-22-2026.csv
 * Column: licenseNumber (matches public.vendors.license_number)
 *
 * Requires (in .env.local or environment):
 *   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (service role — never expose to the browser)
 *
 * Run: npm run sync:uls-licenses
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.join(__dirname, '..', '..');
const csvPath = path.join(root, 'supabase', 'seed-data', 'uls-storefront-export-03-22-2026.csv');
const PAGE = 1000;

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function parseLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQ = !inQ;
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

function parseUsDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const mm = m[1].padStart(2, '0');
  const dd = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function mapLicenseType(csvType) {
  const t = String(csvType || '').toLowerCase();
  if (t.includes('retail')) return 'retail';
  if (t.includes('delivery')) return 'delivery';
  if (t.includes('microbusiness')) return 'microbusiness';
  if (t.includes('distributor')) return 'distributor';
  return 'cannabis';
}

function mapVerification(csvStatus) {
  const s = String(csvStatus || '').trim().toLowerCase();
  if (s === 'active') return 'verified';
  return 'pending';
}

function normLic(s) {
  return String(s || '').trim().toUpperCase();
}

function blKey(vendorId, lic) {
  return `${vendorId}|${normLic(lic)}`;
}

async function fetchAllVendorsByLicense(supabase) {
  const map = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id,license_number')
      .not('license_number', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);

    if (error) throw error;
    const rows = data || [];
    for (const r of rows) {
      const ln = normLic(r.license_number);
      if (ln) map.set(ln, r.id);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function fetchAllLicenseRows(supabase) {
  const map = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('business_licenses')
      .select('id,vendor_id,license_number')
      .order('id')
      .range(from, from + PAGE - 1);

    if (error) throw error;
    const rows = data || [];
    for (const r of rows) {
      map.set(blKey(r.vendor_id, r.license_number), r.id);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function runPool(tasks, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

loadEnvLocal();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('CSV not found:', csvPath);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
const header = parseLine(lines[0]);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error('Missing column: ' + name);
  return i;
};

const I = {
  licenseNumber: col('licenseNumber'),
  licenseStatus: col('licenseStatus'),
  licenseType: col('licenseType'),
  issueDate: col('issueDate'),
  expirationDate: col('expirationDate'),
};

async function main() {
  console.log('Loading vendors and existing business_licenses…');
  const [licToVendorId, existingBl] = await Promise.all([
    fetchAllVendorsByLicense(supabase),
    fetchAllLicenseRows(supabase),
  ]);
  console.log(`Vendors with license_number: ${licToVendorId.size}, existing license rows: ${existingBl.size}`);

  const issuing_authority = 'California Department of Cannabis Control (DCC)';
  const toInsert = [];
  const toUpdate = [];

  let skippedNoVendor = 0;
  let skippedRow = 0;

  for (let li = 1; li < lines.length; li++) {
    const cells = parseLine(lines[li]);
    if (cells.length < header.length) {
      skippedRow++;
      continue;
    }

    const lic = String(cells[I.licenseNumber] || '').trim();
    if (!lic) {
      skippedRow++;
      continue;
    }

    const vendorId = licToVendorId.get(normLic(lic));
    if (!vendorId) {
      skippedNoVendor++;
      continue;
    }

    const issueDate = parseUsDate(cells[I.issueDate]);
    const expiryDate = parseUsDate(cells[I.expirationDate]);
    const license_type = mapLicenseType(cells[I.licenseType]);
    const verification_status = mapVerification(cells[I.licenseStatus]);

    const payload = {
      license_type,
      issuing_authority,
      issue_date: issueDate,
      expiry_date: expiryDate,
      verification_status,
    };

    const id = existingBl.get(blKey(vendorId, lic));
    if (id) {
      toUpdate.push({ id, payload });
    } else {
      toInsert.push({
        vendor_id: vendorId,
        license_number: lic,
        ...payload,
      });
    }
  }

  let inserted = 0;
  let insertErrors = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { error } = await supabase.from('business_licenses').insert(chunk);
    if (error) {
      console.error('Batch insert error:', error.message);
      insertErrors += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  let updated = 0;
  let updateErrors = 0;
  const updateTasks = toUpdate.map(({ id, payload }) => async () => {
    const { error } = await supabase.from('business_licenses').update(payload).eq('id', id);
    if (error) {
      console.error('update id', id, error.message);
      updateErrors++;
    } else {
      updated++;
    }
  });
  await runPool(updateTasks, 24);

  console.log(
    JSON.stringify(
      {
        inserted,
        insertErrors,
        updated,
        updateErrors,
        skippedNoVendor,
        skippedRow,
        csvDataRows: lines.length - 1,
        plannedInsert: toInsert.length,
        plannedUpdate: toUpdate.length,
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
