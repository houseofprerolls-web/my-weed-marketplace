/**
 * Reads a vendors CSV export (e.g. directory-vendors-deleted-trim-*.csv) and writes:
 *  - license-with-public-name.csv — rows with a license + resolvable public-facing name
 *  - vendor-license-audit-issues.csv — not public dispensary (heuristic) and/or weak/missing name
 *
 * Usage:
 *   node scripts/audit-directory-vendors-licenses.cjs [path/to/input.csv]
 */

const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuote = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toBool(v) {
  const s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === '1';
}

const BAD_NAMES = new Set(['tbd', 'unknown', 'n/a', 'na', 'none', '—', '-', '?']);
function isBadName(name) {
  const t = String(name || '').trim();
  if (!t) return true;
  if (BAD_NAMES.has(t.toLowerCase())) return true;
  if (t.length < 2) return true;
  return false;
}

function legalEntityFromDescription(desc) {
  const d = String(desc || '');
  const m = d.match(/Legal entity:\s*([^.\n]+?)(?:\.|\s+Premise:)/i);
  return m ? m[1].trim() : '';
}

function isRetailLicense(lic, desc, tagline) {
  const L = String(lic || '').toUpperCase();
  if (L.startsWith('C10')) return true;
  const blob = `${desc} ${tagline}`.toLowerCase();
  return (
    blob.includes('retail storefront') ||
    blob.includes('commercial retailer') ||
    blob.includes('licensed storefront')
  );
}

function csvEscape(s) {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function main() {
  const defaultInput = path.join(__dirname, '../data/directory-vendors-deleted-trim-2026-03-28-07-45-30.csv');
  const inputPath = path.resolve(process.argv[2] || defaultInput);
  const outDir = path.join(__dirname, '../data/generated');
  if (!fs.existsSync(inputPath)) {
    console.error('Input not found:', inputPath);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const raw = fs.readFileSync(inputPath, 'utf8');
  const table = parseCSV(raw);
  if (table.length < 2) {
    console.error('No data rows');
    process.exit(1);
  }
  const header = table[0];
  const idx = (name) => header.indexOf(name);

  const I = {
    id: idx('id'),
    name: idx('name'),
    slug: idx('slug'),
    tagline: idx('tagline'),
    description: idx('description'),
    license_number: idx('license_number'),
    is_live: idx('is_live'),
    offers_delivery: idx('offers_delivery'),
    offers_storefront: idx('offers_storefront'),
    is_directory_listing: idx('is_directory_listing'),
    license_status: idx('license_status'),
    city: idx('city'),
    state: idx('state'),
  };

  const issues = [];
  const licenseMap = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (row.length < header.length) continue;

    const get = (i) => (i >= 0 ? row[i] : '');
    const vendorId = get(I.id);
    const name = get(I.name);
    const lic = get(I.license_number).trim();
    const desc = get(I.description);
    const tagline = get(I.tagline);
    const isLive = toBool(get(I.is_live));
    const offersDelivery = toBool(get(I.offers_delivery));
    const offersStorefront = toBool(get(I.offers_storefront));
    const dirListing = toBool(get(I.is_directory_listing));
    const licStatus = get(I.license_status);

    const legal = legalEntityFromDescription(desc);
    const retail = isRetailLicense(lic, desc, tagline);

    /** “Public dispensary” heuristic for this export: live + storefront + approved-ish + retail license/type */
    const licenseOk = licStatus === 'approved' || licStatus === '';
    const isPublicDispensary = isLive && offersStorefront && retail && licenseOk;

    const nameMissing = isBadName(name);
    const publicDisplayName = nameMissing ? legal : name.trim();
    const couldResolveName = !isBadName(publicDisplayName);

    const flags = [];
    if (!isLive) flags.push('not_live');
    if (!offersStorefront) flags.push('no_storefront_flag');
    if (!retail) flags.push('not_retail_c10_heuristic');
    // is_directory_listing is true for most CA ULS directory rows — not a quality signal by itself
    if (nameMissing && !legal) flags.push('no_display_name');
    if (nameMissing && legal) flags.push('name_placeholder_legal_in_desc');
    if (!lic) flags.push('no_license_number');

    if (!isPublicDispensary || !couldResolveName || nameMissing) {
      issues.push({
        vendor_id: vendorId,
        license_number: lic,
        name_field: name,
        legal_entity_from_description: legal,
        is_public_dispensary: isPublicDispensary ? 'yes' : 'no',
        is_live: isLive ? 'true' : 'false',
        offers_storefront: offersStorefront ? 'true' : 'false',
        offers_delivery: offersDelivery ? 'true' : 'false',
        license_status: licStatus,
        flags: flags.join('|'),
        city: get(I.city),
        state: get(I.state),
        slug: get(I.slug),
      });
    }

    if (lic && couldResolveName) {
      licenseMap.push({
        license_number: lic,
        public_name: publicDisplayName,
        vendor_id: vendorId,
        name_source: nameMissing ? 'legal_entity_from_description' : 'name_column',
        is_public_dispensary: isPublicDispensary ? 'yes' : 'no',
        city: get(I.city),
        state: get(I.state),
      });
    }
  }

  const licensePath = path.join(outDir, 'license-with-public-name.csv');
  const licensePublicRetailPath = path.join(outDir, 'license-with-public-name-retail-storefront-only.csv');
  const issuesPath = path.join(outDir, 'vendor-license-audit-issues.csv');

  const licHeader =
    'license_number,public_name,vendor_id,name_source,is_public_dispensary,city,state';
  function writeLicenseFile(filePath, rows) {
    fs.writeFileSync(
      filePath,
      [licHeader]
        .concat(
          rows.map(
            (x) =>
              [
                csvEscape(x.license_number),
                csvEscape(x.public_name),
                csvEscape(x.vendor_id),
                csvEscape(x.name_source),
                csvEscape(x.is_public_dispensary),
                csvEscape(x.city),
                csvEscape(x.state),
              ].join(',')
          )
        )
        .join('\n') + '\n',
      'utf8'
    );
  }

  writeLicenseFile(licensePath, licenseMap);
  writeLicenseFile(
    licensePublicRetailPath,
    licenseMap.filter((x) => x.is_public_dispensary === 'yes')
  );

  const issHeader =
    'vendor_id,license_number,name_field,legal_entity_from_description,is_public_dispensary,is_live,offers_storefront,offers_delivery,license_status,flags,city,state,slug';
  fs.writeFileSync(
    issuesPath,
    [issHeader]
      .concat(
        issues.map(
          (x) =>
            [
              csvEscape(x.vendor_id),
              csvEscape(x.license_number),
              csvEscape(x.name_field),
              csvEscape(x.legal_entity_from_description),
              csvEscape(x.is_public_dispensary),
              csvEscape(x.is_live),
              csvEscape(x.offers_storefront),
              csvEscape(x.offers_delivery),
              csvEscape(x.license_status),
              csvEscape(x.flags),
              csvEscape(x.city),
              csvEscape(x.state),
              csvEscape(x.slug),
            ].join(',')
        )
      )
      .join('\n') + '\n',
    'utf8'
  );

  console.log('Input:', inputPath);
  console.log('Rows:', table.length - 1);
  console.log('License + resolvable public name:', licenseMap.length, '→', licensePath);
  console.log(
    '…retail storefront + live + C10 heuristic (yes):',
    licenseMap.filter((x) => x.is_public_dispensary === 'yes').length,
    '→',
    licensePublicRetailPath
  );
  console.log('Issue rows (not public dispensary heuristic and/or bad name):', issues.length, '→', issuesPath);
}

main();
