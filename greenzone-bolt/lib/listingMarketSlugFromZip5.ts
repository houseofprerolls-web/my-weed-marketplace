import { extractZip5 } from '@/lib/zipUtils';

/**
 * Mirrors `market_zip_prefixes` + NY fallback + `california-other` in
 * `getMarketForSmokersClub` / migrations 0019 + 0142 + 0210 (922 → coachella-valley) + 0221 (917 → inland-empire). Keep in sync when CA/NY prefix maps change.
 */
const ZIP_PREFIX_TO_MARKET_SLUG: Record<string, string> = {
  '900': 'greater-los-angeles',
  '901': 'greater-los-angeles',
  '902': 'greater-los-angeles',
  '903': 'greater-los-angeles',
  '904': 'greater-los-angeles',
  '905': 'greater-los-angeles',
  '906': 'greater-los-angeles',
  '907': 'greater-los-angeles',
  '908': 'greater-los-angeles',
  '910': 'greater-los-angeles',
  '911': 'greater-los-angeles',
  '912': 'greater-los-angeles',
  '913': 'greater-los-angeles',
  '914': 'greater-los-angeles',
  '915': 'greater-los-angeles',
  '916': 'greater-los-angeles',
  '917': 'inland-empire',
  '918': 'greater-los-angeles',
  '909': 'inland-empire',
  '922': 'coachella-valley',
  '923': 'inland-empire',
  '924': 'inland-empire',
  '925': 'inland-empire',
  '919': 'san-diego-county',
  '920': 'san-diego-county',
  '921': 'san-diego-county',
  '926': 'orange-county',
  '927': 'orange-county',
  '928': 'orange-county',
  '930': 'central-coast',
  '931': 'central-coast',
  '934': 'central-coast',
  '939': 'central-coast',
  '932': 'central-valley',
  '933': 'central-valley',
  '936': 'central-valley',
  '937': 'central-valley',
  '952': 'central-valley',
  '953': 'central-valley',
  '935': 'desert-imperial',
  '940': 'bay-area',
  '941': 'bay-area',
  '942': 'bay-area',
  '943': 'bay-area',
  '944': 'bay-area',
  '945': 'bay-area',
  '946': 'bay-area',
  '947': 'bay-area',
  '948': 'bay-area',
  '949': 'bay-area',
  '954': 'bay-area',
  '950': 'south-bay',
  '951': 'south-bay',
  '955': 'northern-california',
  '960': 'northern-california',
  '956': 'sacramento-region',
  '957': 'sacramento-region',
  '958': 'sacramento-region',
  '959': 'sacramento-region',
  '961': 'mountains-sierra',
};

/**
 * Listing market slug for a USPS ZIP5, matching server-side `getMarketForSmokersClub` resolution.
 */
export function listingMarketSlugFromZip5(zip: string | null | undefined): string | null {
  const z = extractZip5(zip ?? '');
  if (!z) return null;
  const pref = z.slice(0, 3);
  const mapped = ZIP_PREFIX_TO_MARKET_SLUG[pref];
  if (mapped) return mapped;
  if (/^[0-9]{3}$/.test(pref)) {
    const n = parseInt(pref, 10);
    if (n >= 100 && n <= 149) return 'new-york';
  }
  return 'california-other';
}

export function vendorPremiseListingMarketAlignsWithShopper(
  shopperZip5: string | null | undefined,
  vendorZip: string | null | undefined
): boolean {
  const s = shopperZip5 && shopperZip5.length === 5 ? shopperZip5 : null;
  const v = extractZip5(vendorZip ?? '');
  if (!s || !v) return false;
  const a = listingMarketSlugFromZip5(s);
  const b = listingMarketSlugFromZip5(v);
  if (!a || !b) return false;
  return a === b;
}
