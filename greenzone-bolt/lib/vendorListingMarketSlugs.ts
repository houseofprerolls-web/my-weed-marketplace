import type { SupabaseClient } from '@supabase/supabase-js';

/** Approved CA `listing_markets.slug` values for the given vendor ids (union). */
export async function fetchApprovedCaListingMarketSlugsForVendorIds(
  supabase: SupabaseClient,
  vendorIds: string[]
): Promise<string[]> {
  if (!vendorIds.length) return [];
  const { data: ops, error: oErr } = await supabase
    .from('vendor_market_operations')
    .select('market_id')
    .in('vendor_id', vendorIds)
    .eq('approved', true);
  if (oErr || !ops?.length) return [];
  const marketIds = Array.from(new Set((ops as { market_id: string }[]).map((r) => r.market_id)));
  const { data: mkts, error: mErr } = await supabase
    .from('listing_markets')
    .select('slug,region_key')
    .in('id', marketIds)
    .eq('region_key', 'ca');
  if (mErr || !mkts) return [];
  return Array.from(
    new Set((mkts as { slug: string }[]).map((m) => String(m.slug).toLowerCase()).filter(Boolean))
  );
}
