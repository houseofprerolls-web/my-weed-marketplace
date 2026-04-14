/**
 * CannaHub uses `public.vendors` (see supabase/migrations/0001_init.sql).
 * GreenZone bolt uses `public.vendor_profiles`.
 *
 * Set NEXT_PUBLIC_USE_VENDORS_TABLE=1 when your Supabase project has vendors, not vendor_profiles.
 */
export function isVendorsSchema(): boolean {
  return process.env.NEXT_PUBLIC_USE_VENDORS_TABLE === '1';
}

export function vendorTableName(): 'vendors' | 'vendor_profiles' {
  return isVendorsSchema() ? 'vendors' : 'vendor_profiles';
}
