import type { SupabaseClient } from '@supabase/supabase-js';

/** Admin UI: surface `business_licenses.expiry_date` within this many days (inclusive of today). */
export const LICENSE_EXPIRING_SOON_DAYS = 60;

export type LicenseExpiryRange = { fromIsoDate: string; toIsoDate: string };

/** Calendar dates in UTC (YYYY-MM-DD) for Postgres `date` comparisons. */
export function licenseExpiringSoonRangeUtc(): LicenseExpiryRange {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + LICENSE_EXPIRING_SOON_DAYS);
  const toIsoDate = end.toISOString().slice(0, 10);
  const fromIsoDate = today.toISOString().slice(0, 10);
  return { fromIsoDate, toIsoDate };
}

/** `vendor_id`s with a non-null `business_licenses.expiry_date` in [today, today+LICENSE_EXPIRING_SOON_DAYS]. */
export async function fetchVendorIdsWithLicenseExpiringSoon(db: SupabaseClient): Promise<Set<string>> {
  const { fromIsoDate, toIsoDate } = licenseExpiringSoonRangeUtc();
  const { data, error } = await db
    .from('business_licenses')
    .select('vendor_id')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', fromIsoDate)
    .lte('expiry_date', toIsoDate);
  if (error) return new Set();
  const out = new Set<string>();
  for (const r of data || []) {
    const id = String((r as { vendor_id?: string }).vendor_id ?? '').trim();
    if (id) out.add(id);
  }
  return out;
}
