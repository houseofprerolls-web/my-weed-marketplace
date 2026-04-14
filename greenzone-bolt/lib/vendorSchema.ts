/**
 * CannaHub uses `public.vendors` (see supabase/migrations/0001_init.sql).
 * GreenZone bolt uses `public.vendor_profiles`.
 *
 * **Client bundle only** — true when `NEXT_PUBLIC_USE_VENDORS_TABLE=1` at build time.
 * In the app shell, use `useVendorsSchema()` from `@/contexts/VendorsSchemaContext` so the
 * UI matches `USE_VENDORS_TABLE` on the server. For API/scripts, use
 * `resolveUseVendorsTableForDiscovery()`.
 */
export function isVendorsSchema(): boolean {
  return process.env.NEXT_PUBLIC_USE_VENDORS_TABLE === '1';
}

/** Server and API routes only — reads runtime env (no client bundle). */
export function resolveUseVendorsTableForDiscovery(): boolean {
  return (
    process.env.USE_VENDORS_TABLE === '1' ||
    process.env.NEXT_PUBLIC_USE_VENDORS_TABLE === '1'
  );
}

export function vendorTableName(): 'vendors' | 'vendor_profiles' {
  return resolveUseVendorsTableForDiscovery() ? 'vendors' : 'vendor_profiles';
}
