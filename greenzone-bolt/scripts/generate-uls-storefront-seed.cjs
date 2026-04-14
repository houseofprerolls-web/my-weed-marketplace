/**
 * Reads supabase/seed-data/uls-storefront-export-03-22-2026.csv
 * Writes supabase/migrations/0070_seed_ca_uls_storefront_vendors.sql
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const csvPath = path.join(root, 'supabase', 'seed-data', 'uls-storefront-export-03-22-2026.csv');
const outPath = path.join(root, 'supabase', 'migrations', '0070_seed_ca_uls_storefront_vendors.sql');

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

function sqlStr(s) {
  if (s == null) return "''";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function badDba(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  return /^(data not available|n\/a|not available|n\.a\.|none|unknown|—|-)$/i.test(t);
}

function displayName(dba, legal) {
  const l = String(legal || '').trim();
  if (!badDba(dba)) return String(dba).trim();
  return l || 'Unknown storefront';
}

function slugFromLicense(lic) {
  const u = String(lic || '').trim().toUpperCase();
  return 'ca-uls-' + u.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function parseUsDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const mm = m[1].padStart(2, '0');
  const dd = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

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
  licenseDesignation: col('licenseDesignation'),
  issueDate: col('issueDate'),
  expirationDate: col('expirationDate'),
  businessLegalName: col('businessLegalName'),
  businessDbaName: col('businessDbaName'),
  premiseStreetAddress: col('premiseStreetAddress'),
  premiseCity: col('premiseCity'),
  premiseState: col('premiseState'),
  premiseCounty: col('premiseCounty'),
  premiseZipCode: col('premiseZipCode'),
  businessEmail: col('businessEmail'),
  businessPhone: col('businessPhone'),
  PremiseLatitude: col('PremiseLatitude'),
  PremiseLongitude: col('PremiseLongitude'),
};

const vendors = [];
for (let li = 1; li < lines.length; li++) {
  const cells = parseLine(lines[li]);
  if (cells.length < header.length) continue;
  const status = cells[I.licenseStatus];
  if (String(status).trim() !== 'Active') continue;
  const lic = cells[I.licenseNumber].trim();
  if (!lic.toUpperCase().startsWith('C10-')) continue;
  const lat = parseFloat(cells[I.PremiseLatitude]);
  const lng = parseFloat(cells[I.PremiseLongitude]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

  const legal = cells[I.businessLegalName];
  const dba = cells[I.businessDbaName];
  const name = displayName(dba, legal);
  const slug = slugFromLicense(lic);
  const street = (cells[I.premiseStreetAddress] || '').trim();
  const city = (cells[I.premiseCity] || '').trim();
  const state = (cells[I.premiseState] || '').trim();
  const zip = (cells[I.premiseZipCode] || '').trim();
  const county = (cells[I.premiseCounty] || '').trim();
  const email = (cells[I.businessEmail] || '').trim();
  const phone = (cells[I.businessPhone] || '').trim();
  const designation = (cells[I.licenseDesignation] || '').trim();
  const issue = parseUsDate(cells[I.issueDate]);
  const expiry = parseUsDate(cells[I.expirationDate]);

  const tagline = county ? `Licensed storefront · ${county} County, CA` : 'Licensed storefront · California';
  const desc =
    `California licensed retail storefront (Commercial Retailer). ${designation ? `Designation: ${designation}. ` : ''}` +
    `Synced from CA DCC ULS. Legal entity: ${legal}. Premise: ${street}, ${city}, ${state} ${zip}.`;

  vendors.push({
    slug,
    name,
    lic: lic.toUpperCase(),
    tagline: tagline.slice(0, 500),
    description: desc.slice(0, 4000),
    street,
    city,
    state,
    zip,
    email,
    phone,
    lat,
    lng,
    issue,
    expiry,
  });
}

let sql = `/*
  Seed CA licensed storefront retailers (C10 Commercial Retailer) from ULS export.
  Premise coordinates from CSV (PremiseLatitude / PremiseLongitude).
  Idempotent: ON CONFLICT (slug) DO NOTHING.
  user_id is null; is_directory_listing true — link auth.users later via admin / claim flow.
  Source: supabase/seed-data/uls-storefront-export-03-22-2026.csv (${vendors.length} active C10 rows).
*/

`;

const chunkSize = 80;
for (let c = 0; c < vendors.length; c += chunkSize) {
  const chunk = vendors.slice(c, c + chunkSize);
  const tuples = chunk
    .map(
      (v) => `(
  null,
  ${sqlStr(v.name)},
  ${sqlStr(v.slug)},
  ${sqlStr(v.tagline)},
  ${sqlStr(v.description)},
  NULL,
  ${sqlStr(v.lic)},
  true,
  'approved',
  true,
  true,
  'basic',
  ${sqlStr(v.street)},
  ${sqlStr(v.city)},
  ${sqlStr(v.state)},
  ${sqlStr(v.zip)},
  ${sqlStr(v.phone)},
  NULL,
  false,
  true,
  false,
  false,
  st_setsrid(st_makepoint(${v.lng}::double precision, ${v.lat}::double precision), 4326)::geography
)`
    )
    .join(',\n');

  sql += `insert into public.vendors (
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
  phone,
  website,
  offers_delivery,
  offers_storefront,
  smokers_club_eligible,
  online_menu_enabled,
  location
) values
${tuples}
on conflict (slug) do nothing;


`;
}

sql += `
insert into public.business_licenses (
  vendor_id,
  license_number,
  license_type,
  issuing_authority,
  issue_date,
  expiry_date,
  verification_status
)
select v.id,
  v.license_number,
  'retail',
  'California Department of Cannabis Control (DCC)',
  null,
  null,
  'verified'
from public.vendors v
where v.slug like 'ca-uls-c10-%'
  and not exists (
    select 1 from public.business_licenses bl
    where bl.license_number = v.license_number
  );
`;

fs.writeFileSync(outPath, sql, 'utf8');
console.log('Wrote', outPath, 'vendors:', vendors.length);
