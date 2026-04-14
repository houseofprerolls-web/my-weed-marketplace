/**
 * Reads CA DCC ULS CSV (non-storefront / delivery retailers) and writes
 * supabase/migrations/0067_seed_ca_uls_delivery_vendors.sql
 *
 * Usage: node scripts/generate-uls-delivery-vendors-sql.mjs [path/to/uls-export.csv]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/* County seat or primary city ZIP (CA). "Nevada" = Nevada County, CA. */
const COUNTY_TO_LOCATION = {
  Sacramento: { city: 'Sacramento', zip: '95814' },
  'San Luis Obispo': { city: 'San Luis Obispo', zip: '93401' },
  Marin: { city: 'San Rafael', zip: '94901' },
  Alameda: { city: 'Oakland', zip: '94612' },
  'Los Angeles': { city: 'Los Angeles', zip: '90012' },
  'San Francisco': { city: 'San Francisco', zip: '94102' },
  Monterey: { city: 'Monterey', zip: '93940' },
  Nevada: { city: 'Nevada City', zip: '95959' },
  'San Mateo': { city: 'Redwood City', zip: '94063' },
  'Santa Barbara': { city: 'Santa Barbara', zip: '93101' },
  Yolo: { city: 'Woodland', zip: '95695' },
  Imperial: { city: 'El Centro', zip: '92243' },
  Sonoma: { city: 'Santa Rosa', zip: '95404' },
  Humboldt: { city: 'Eureka', zip: '95501' },
  Kern: { city: 'Bakersfield', zip: '93301' },
  'San Joaquin': { city: 'Stockton', zip: '95202' },
  Ventura: { city: 'Ventura', zip: '93001' },
  Riverside: { city: 'Riverside', zip: '92501' },
  'San Bernardino': { city: 'San Bernardino', zip: '92401' },
  Orange: { city: 'Santa Ana', zip: '92701' },
  Tulare: { city: 'Visalia', zip: '93291' },
  'Contra Costa': { city: 'Martinez', zip: '94553' },
  'Santa Clara': { city: 'San Jose', zip: '95113' },
  Stanislaus: { city: 'Modesto', zip: '95354' },
  'El Dorado': { city: 'Placerville', zip: '95667' },
  'San Diego': { city: 'San Diego', zip: '92101' },
  Fresno: { city: 'Fresno', zip: '93721' },
  Madera: { city: 'Madera', zip: '93637' },
  Merced: { city: 'Merced', zip: '95340' },
  Butte: { city: 'Chico', zip: '95928' },
  Shasta: { city: 'Redding', zip: '96001' },
  Mendocino: { city: 'Ukiah', zip: '95482' },
  Lake: { city: 'Lakeport', zip: '95453' },
  Tehama: { city: 'Red Bluff', zip: '96080' },
  Glenn: { city: 'Willows', zip: '95988' },
  Colusa: { city: 'Colusa', zip: '95932' },
  Sutter: { city: 'Yuba City', zip: '95991' },
  Yuba: { city: 'Marysville', zip: '95901' },
  Placer: { city: 'Auburn', zip: '95603' },
  Amador: { city: 'Jackson', zip: '95642' },
  Calaveras: { city: 'San Andreas', zip: '95249' },
  Tuolumne: { city: 'Sonora', zip: '95370' },
  Mariposa: { city: 'Mariposa', zip: '95338' },
  Mono: { city: 'Bridgeport', zip: '93517' },
  Inyo: { city: 'Bishop', zip: '93514' },
  Alpine: { city: 'Markleeville', zip: '96120' },
  'San Benito': { city: 'Hollister', zip: '95023' },
  Napa: { city: 'Napa', zip: '94559' },
  'Del Norte': { city: 'Crescent City', zip: '95531' },
  Trinity: { city: 'Weaverville', zip: '96093' },
  Siskiyou: { city: 'Yreka', zip: '96097' },
  Modoc: { city: 'Alturas', zip: '96101' },
  Lassen: { city: 'Susanville', zip: '96130' },
  Plumas: { city: 'Quincy', zip: '95971' },
  Sierra: { city: 'Loyalton', zip: '96118' },
};

/** Optional logo URLs (Clearbit logo API — best-effort; null if unknown). */
const LOGO_BY_LICENSE = {
  'C9-0000298-LIC': 'https://logo.clearbit.com/eaze.com',
  'C9-0000034-LIC': 'https://logo.clearbit.com/caliva.com',
  'C9-0000174-LIC': 'https://logo.clearbit.com/smoakland.com',
  'C9-0000843-LIC': 'https://logo.clearbit.com/smoakland.com',
  'C9-0000411-LIC': 'https://logo.clearbit.com/710labs.com',
  'C9-0000579-LIC': 'https://logo.clearbit.com/710labs.com',
  'C9-0000414-LIC': 'https://logo.clearbit.com/bleudiamond.com',
  'C9-0000045-LIC': 'https://logo.clearbit.com/bleudiamond.com',
  'C9-0000463-LIC': 'https://logo.clearbit.com/erbamarkets.com',
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
      if (c === '\r') i++;
      row.push(cur);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      cur = '';
    } else if (c === '\r') {
      row.push(cur);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  return rows;
}

function sqlStr(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function slugFromLicense(lic) {
  const base = String(lic)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `ca-uls-${base}`;
}

function parseUsDate(s) {
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

const csvPath =
  process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads', 'uls-export-03-22-2026.csv');
const outPath = path.join(repoRoot, 'supabase', 'migrations', '0067_seed_ca_uls_delivery_vendors.sql');

if (!fs.existsSync(csvPath)) {
  console.error('CSV not found:', csvPath);
  process.exit(1);
}

const raw = fs.readFileSync(csvPath, 'utf8');
const table = parseCsv(raw);
if (table.length < 2) {
  console.error('No data rows');
  process.exit(1);
}

const header = table[0].map((h) => h.trim());
const idx = {
  licenseNumber: header.indexOf('licenseNumber'),
  licenseType: header.indexOf('licenseType'),
  licenseStatus: header.indexOf('licenseStatus'),
  businessDbaName: header.indexOf('businessDbaName'),
  businessLegalName: header.indexOf('businessLegalName'),
  premiseCounty: header.indexOf('premiseCounty'),
  issueDate: header.indexOf('issueDate'),
  expirationDate: header.indexOf('expirationDate'),
  licenseDesignation: header.indexOf('licenseDesignation'),
};

const missing = Object.entries(idx).filter(([, v]) => v < 0).map(([k]) => k);
if (missing.length) {
  console.error('Missing columns:', missing);
  process.exit(1);
}

const unknownCounties = new Set();
const lines = [];

lines.push(`/*
  Seed CA licensed non-storefront (delivery) retailers from ULS export.
  Idempotent: ON CONFLICT (slug) DO NOTHING on vendors; licenses skip if license_number exists.
  ZIP/city = representative location for premise county (not exact premise address).
  Source file: ${path.basename(csvPath)}
*/

`);

for (let r = 1; r < table.length; r++) {
  const row = table[r];
  if (row.length < header.length) continue;
  const lic = row[idx.licenseNumber]?.trim();
  if (!lic) continue;
  const status = row[idx.licenseStatus]?.trim();
  if (status && status.toLowerCase() !== 'active') continue;

  let dba = row[idx.businessDbaName]?.trim() || '';
  const legal = row[idx.businessLegalName]?.trim() || '';
  if (!dba || /^data not available$/i.test(dba) || /^no dba$/i.test(dba)) {
    dba = legal || dba || 'Licensed delivery (CA)';
  }

  const county = row[idx.premiseCounty]?.trim() || '';
  const loc = COUNTY_TO_LOCATION[county];
  if (!loc) {
    unknownCounties.add(county);
    continue;
  }

  const slug = slugFromLicense(lic);
  const issue = parseUsDate(row[idx.issueDate] || '');
  const expiry = parseUsDate(row[idx.expirationDate] || '');
  const designation = (row[idx.licenseDesignation] || '').trim();
  const licTypeRow = (row[idx.licenseType] || '').trim();

  const desc = `California licensed non-storefront cannabis retailer (delivery). County: ${county}. ${designation ? `Designation: ${designation}. ` : ''}Synced from CA DCC ULS. Legal entity: ${legal || 'n/a'}.`;
  const logo = LOGO_BY_LICENSE[lic] || null;
  const address = `Service area — ${county} County, CA`;

  lines.push(`insert into public.vendors (
  user_id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  license_number,
  verified,
  license_status,
  is_live,
  is_directory_listing,
  subscription_tier,
  address,
  city,
  state,
  zip,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled
) values (
  null,
  ${sqlStr(dba)},
  ${sqlStr(slug)},
  ${sqlStr(`Licensed delivery · ${county} County`)},
  ${sqlStr(desc)},
  ${logo ? sqlStr(logo) : 'NULL'},
  ${sqlStr(lic)},
  true,
  'approved',
  true,
  true,
  'basic',
  ${sqlStr(address)},
  ${sqlStr(loc.city)},
  'CA',
  ${sqlStr(loc.zip)},
  true,
  false,
  false,
  false
)
on conflict (slug) do nothing;

`);

  lines.push(`insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  ${sqlStr(lic)},
  'retail',
  'California Department of Cannabis Control (DCC)',
  ${issue ? sqlStr(issue) + '::date' : 'NULL'},
  ${expiry ? sqlStr(expiry) + '::date' : 'NULL'},
  'verified'
from public.vendors v
where v.slug = ${sqlStr(slug)}
  and not exists (
    select 1 from public.business_licenses bl where bl.license_number = ${sqlStr(lic)}
  );

`);
}

if (unknownCounties.size) {
  console.warn('Skipped rows — add COUNTY_TO_LOCATION for:', [...unknownCounties].sort().join(', '));
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath, 'statements for', table.length - 1, 'CSV rows (minus unknown counties).');
