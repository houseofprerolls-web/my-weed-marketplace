export function normalizeOutreachEmail(raw: unknown): string | null {
  if (raw == null) return null;
  const e =
    typeof raw === 'string'
      ? raw.trim().toLowerCase()
      : typeof raw === 'number' && Number.isFinite(raw)
        ? String(raw).trim().toLowerCase()
        : '';
  if (!e) return null;
  if (e.length < 5 || e.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export function normalizeOutreachCsvHeader(k: string): string {
  let s = k.replace(/^\ufeff/, '').trim();
  // businessOwnerName, businessDbaName, businessEmail -> business_owner_name, etc.
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  s = s.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2');
  return s
    .toLowerCase()
    .replace(/[/\\,;|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Flatten CSV/API row keys so "Email Address" / BOM headers match our aliases. */
export function normalizeOutreachRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[normalizeOutreachCsvHeader(k)] = v;
  }
  return out;
}

const EMAIL_COLUMN_KEYS = [
  'email',
  'e_mail',
  'e-mail',
  'email_address',
  'emailaddress',
  'businessemail',
  'work_email',
  'contact_email',
  'business_email',
  'primary_email',
  'secondary_email',
  'company_email',
  'personal_email',
  'mail',
  'email_1',
  'email1',
];

/** CSV / spreadsheet cells are often strings; Excel may use numbers for phone. */
function asNonEmptyString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t || null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const t = String(raw).trim();
    return t || null;
  }
  return null;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const s = asNonEmptyString(record[key]);
    if (s) return s;
  }
  return null;
}

/** Business owner / contact person (before generic name columns). */
const OWNER_NAME_KEYS = [
  'business_owner_name',
  'businessownername',
  'business_owner',
  'owner_name',
  'owner_full_name',
  'principal_name',
  'person_name',
  'name',
  'full_name',
  'contact',
  'person',
  'contact_name',
  'display_name',
  'owner',
  'rep',
];

const LEGAL_OR_DBA_COMBINED_KEYS = [
  'dba_legal_business_name',
  'legal_business_name_dba',
  'dba_and_legal_name',
];

const LEGAL_BUSINESS_KEYS = [
  'business_legal_name',
  'businesslegalname',
  'legal_business_name',
  'legal_name',
  'legal_entity_name',
  'registered_business_name',
  'incorporated_name',
  'corp_name',
  'llc_name',
];

const DBA_KEYS = [
  'business_dba_name',
  'businessdbaname',
  'store_name',
  'dba',
  'doing_business_as',
  'dba_name',
  'trade_name',
  'fictitious_business_name',
  'assumed_name',
  'business_trade_name',
];

const GENERIC_COMPANY_KEYS = [
  'company_name',
  'company',
  'business_name',
  'business',
  'organization',
  'org',
  'employer',
  'account_name',
  'account',
  'firm',
];

const PHONE_COLUMN_KEYS = [
  'phone',
  'phone_number',
  'mobile',
  'cell',
  'businessphone',
  'business_phone',
  'primary_phone',
  'owner_phone',
  'contact_phone',
  'telephone',
  'tel',
  'cell_phone',
  'mobile_phone',
  'work_phone',
];

/** ULS / exports often use "Data Not Available" for missing DBA — treat as empty and use legal. */
function isPlaceholderDba(s: string | null): boolean {
  if (!s) return true;
  const t = s.trim().toLowerCase();
  return (
    t === 'data not available' ||
    t === 'n/a' ||
    t === 'na' ||
    t === 'unknown' ||
    t === 'none' ||
    t === 'tbd' ||
    t === '—' ||
    t === '-'
  );
}

function pickCompanyDisplayName(row: Record<string, unknown>): string | null {
  const combined = pickFirstString(row, LEGAL_OR_DBA_COMBINED_KEYS);
  if (combined) return combined;

  const legal = pickFirstString(row, LEGAL_BUSINESS_KEYS);
  let dba = pickFirstString(row, DBA_KEYS);
  if (isPlaceholderDba(dba)) dba = null;

  // Prioritize DBA (store / trade name); keep legal in parentheses when both differ.
  if (dba && legal && dba.trim().toLowerCase() !== legal.trim().toLowerCase()) {
    return `${dba} (Legal: ${legal})`;
  }
  if (dba) return dba;
  if (legal) return legal;

  return pickFirstString(row, GENERIC_COMPANY_KEYS);
}

/** Optional one-line notes from license / export columns (e.g. California ULS CSV). */
function buildImportNotes(row: Record<string, unknown>): string | null {
  const license = pickFirstString(row, [
    'license_number',
    'licensenumber',
    'license_no',
    'license_id',
  ]);
  const licType = pickFirstString(row, ['license_type', 'licensetype', 'licence_type']);
  const county = pickFirstString(row, ['premise_county', 'premisecounty', 'county']);
  const licStatus = pickFirstString(row, ['license_status', 'licensestatus', 'lic_status']);
  const parts = [
    license ? `License: ${license}` : null,
    licType ? `Type: ${licType}` : null,
    county ? `County: ${county}` : null,
    licStatus ? `Status: ${licStatus}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : null;
}

/**
 * California ULS exports:
 * - **Delivery (non-storefront):** `licenseType` contains `Non-Storefront` (Type 9 / C9-style).
 * - **Storefront:** Often `Commercial - Retailer` only (Type 10 / C10) — the word "Storefront" may not appear.
 */
export function deriveUlsPremiseKind(
  licenseTypeRaw: string | null,
  licenseNumberRaw?: string | null
): 'storefront' | 'delivery' | 'unknown' {
  const t = licenseTypeRaw?.trim()
    ? licenseTypeRaw.toLowerCase().replace(/\s+/g, ' ')
    : '';
  if (t) {
    if (t.includes('non-storefront') || t.includes('non storefront')) return 'delivery';
    if (t.includes('storefront')) return 'storefront';
    // Walk-in retail export: "Commercial - Retailer" without Non-Storefront
    if (t.includes('retailer')) return 'storefront';
  }
  const ln = (licenseNumberRaw || '').trim().toUpperCase();
  if (ln.startsWith('C9-')) return 'delivery';
  if (ln.startsWith('C10-')) return 'storefront';
  return 'unknown';
}

/** When one email appears in both storefront + delivery lists, prefer storefront. */
export function betterUlsPremiseKind(
  a: 'storefront' | 'delivery' | 'unknown',
  b: 'storefront' | 'delivery' | 'unknown'
): 'storefront' | 'delivery' | 'unknown' {
  const r: Record<'storefront' | 'delivery' | 'unknown', number> = {
    storefront: 3,
    delivery: 2,
    unknown: 1,
  };
  return r[a] >= r[b] ? a : b;
}

/** If no dedicated email column, use the first cell value that looks like an email. */
function inferEmailFromValues(record: Record<string, unknown>): string | null {
  for (const v of Object.values(record)) {
    const e = normalizeOutreachEmail(v);
    if (e) return e;
  }
  return null;
}

/**
 * Accepts raw CSV/API objects with varied headers (e.g. email_address, Work Email).
 * Used by POST /api/master/outreach/import.
 */
export function normalizeFlexibleOutreachRow(
  raw: Record<string, unknown>
): {
  email: string;
  person_name: string | null;
  company_name: string | null;
  phone: string | null;
  notes: string | null;
  uls_premise_kind: 'storefront' | 'delivery' | 'unknown';
} | null {
  const row = normalizeOutreachRecordKeys(raw);

  let email: string | null = null;
  for (const key of EMAIL_COLUMN_KEYS) {
    email = normalizeOutreachEmail(row[key]);
    if (email) break;
  }
  if (!email) email = inferEmailFromValues(row);
  if (!email) return null;

  let person = pickFirstString(row, OWNER_NAME_KEYS);
  const first = pickFirstString(row, ['first_name', 'firstname', 'fname', 'given_name']);
  const last = pickFirstString(row, ['last_name', 'lastname', 'lname', 'surname', 'family_name']);
  if (!person && (first || last)) {
    person = [first, last].filter(Boolean).join(' ').trim() || null;
  }

  const company = pickCompanyDisplayName(row);
  const phone = pickFirstString(row, PHONE_COLUMN_KEYS);
  const notes = buildImportNotes(row);
  const licenseTypeRaw = pickFirstString(row, [
    'license_type',
    'licensetype',
    'license_type_name',
    'licence_type',
  ]);
  const licenseNumberRaw = pickFirstString(row, ['license_number', 'licensenumber', 'license_no']);
  const uls_premise_kind = deriveUlsPremiseKind(licenseTypeRaw, licenseNumberRaw);

  return {
    email,
    person_name: person,
    company_name: company,
    phone,
    notes,
    uls_premise_kind,
  };
}

export function normalizeOutreachRow(input: {
  email?: unknown;
  person_name?: unknown;
  company_name?: unknown;
  name?: unknown;
  company?: unknown;
}): { email: string; person_name: string | null; company_name: string | null } | null {
  const email = normalizeOutreachEmail(input.email);
  if (!email) return null;
  const person =
    typeof input.person_name === 'string'
      ? input.person_name.trim() || null
      : typeof input.name === 'string'
        ? input.name.trim() || null
        : null;
  const company =
    typeof input.company_name === 'string'
      ? input.company_name.trim() || null
      : typeof input.company === 'string'
        ? input.company.trim() || null
        : null;
  return { email, person_name: person, company_name: company };
}
