import type { SupabaseClient } from '@supabase/supabase-js';

export type VendorApprovedListingMarket = {
  slug: string;
  name: string;
  region_key: string | null;
};

/** Listing markets the vendor is approved to operate in (admin vendor_market_operations). */
export async function fetchVendorApprovedListingMarkets(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorApprovedListingMarket[]> {
  const { data, error } = await supabase.rpc('vendor_approved_listing_markets', {
    p_vendor_id: vendorId,
  });
  if (error) {
    console.warn('vendor_approved_listing_markets:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return (data as { slug?: string; name?: string; region_key?: string | null }[])
    .map((r) => ({
      slug: String(r.slug ?? '').trim(),
      name: String(r.name ?? r.slug ?? '').trim() || String(r.slug ?? ''),
      region_key: r.region_key != null ? String(r.region_key) : null,
    }))
    .filter((r) => r.slug.length > 0);
}

/** US state codes where the vendor may run deals (DB RPC: menu regions + shop state). */
export async function fetchVendorAllowedDealRegions(
  supabase: SupabaseClient,
  vendorId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('vendor_deal_allowed_region_keys', {
    p_vendor_id: vendorId,
  });
  if (error) {
    console.warn('vendor_deal_allowed_region_keys:', error.message);
    return [];
  }
  if (!data) return [];
  if (Array.isArray(data)) return data.map((x) => String(x).trim().toUpperCase().slice(0, 2)).filter(Boolean);
  return [];
}
