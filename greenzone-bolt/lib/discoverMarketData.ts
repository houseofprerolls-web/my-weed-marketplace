import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  SMOKERS_CLUB_SLOT_RANK_MAX,
  SMOKERS_CLUB_SLOT_RANK_MIN,
  SMOKERS_CLUB_TREEHOUSE_LANE,
} from '@/lib/smokersClub';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';
import {
  fetchVendorExtraLocationCoordsByVendorId,
  type VendorExtraLocationCoord,
} from '@/lib/vendorMapExtraCoords';

export type { VendorExtraLocationCoord };
export { fetchVendorExtraLocationCoordsByVendorId };

export type DiscoverFeaturedLane = 'delivery' | 'storefront' | 'treehouse';

/** Active admin placements for Discover horizontal strips (slots 1–7, in rank order). */
export async function fetchMarketLanePlacements(
  marketId: string,
  lane: DiscoverFeaturedLane
): Promise<string[]> {
  const { data, error } = await supabase
    .from('vendor_market_listings')
    .select('vendor_id, slot_rank')
    .eq('market_id', marketId)
    .eq('club_lane', lane)
    .eq('active', true)
    .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
    .order('slot_rank', { ascending: true });

  if (error) {
    console.warn('fetchMarketLanePlacements:', error.message);
    return [];
  }

  const byRank = new Map<number, string>();
  for (const row of (data || []) as { vendor_id: string; slot_rank: number }[]) {
    byRank.set(row.slot_rank, row.vendor_id);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (let rank = SMOKERS_CLUB_SLOT_RANK_MIN; rank <= SMOKERS_CLUB_SLOT_RANK_MAX; rank++) {
    const vid = byRank.get(rank);
    if (!vid || seen.has(vid)) continue;
    seen.add(vid);
    out.push(vid);
  }
  return out;
}

/** Union of vendor IDs in active Discover strip slots (delivery + storefront + treehouse lanes, ranks 1–7). */
export async function fetchAdminDiscoverStripPinnedVendorIds(marketId: string): Promise<Set<string>> {
  const [delivery, storefront, treehouse] = await Promise.all([
    fetchMarketLanePlacements(marketId, 'delivery'),
    fetchMarketLanePlacements(marketId, 'storefront'),
    fetchMarketLanePlacements(marketId, 'treehouse'),
  ]);
  return new Set([...delivery, ...storefront, ...treehouse]);
}

/** Active treehouse ladder placements for a market (lower slot_rank = higher on ladder). */
export async function fetchTreehouseRanksForMarket(marketId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const { rows, error } = await fetchAllSupabasePages<{ vendor_id: string; slot_rank: number }>(
    async (from, to) => {
      const res = await supabase
        .from('vendor_market_listings')
        .select('vendor_id,slot_rank')
        .eq('market_id', marketId)
        .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
        .eq('active', true)
        .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
        .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX)
        .order('vendor_id')
        .range(from, to);

      return { data: (res.data ?? []) as { vendor_id: string; slot_rank: number }[], error: res.error };
    }
  );

  if (error) return map;
  for (const row of rows) {
    const prev = map.get(row.vendor_id);
    if (prev == null || row.slot_rank < prev) map.set(row.vendor_id, row.slot_rank);
  }
  return map;
}

/** Vendors with an explicit `vendor_delivery_zip5` row for this shopper ZIP5. */
export async function fetchVendorIdsServingZip5(
  zip5: string | null | undefined,
  client: SupabaseClient = supabase
): Promise<Set<string>> {
  const set = new Set<string>();
  const z = zip5 && zip5.length === 5 ? zip5 : null;
  if (!z) return set;

  const { data, error } = await client.from('vendor_delivery_zip5').select('vendor_id').eq('zip', z);

  if (error) {
    console.warn('fetchVendorIdsServingZip5:', error.message);
    return set;
  }
  for (const row of (data || []) as { vendor_id: string }[]) {
    set.add(row.vendor_id);
  }
  return set;
}

export async function fetchApprovedVendorIdsForMarket(marketId: string): Promise<Set<string>> {
  const set = new Set<string>();

  const { rows, error } = await fetchAllSupabasePages<{ vendor_id: string }>(async (from, to) => {
    const res = await supabase
      .from('vendor_market_operations')
      .select('vendor_id')
      .eq('market_id', marketId)
      .eq('approved', true)
      .order('vendor_id')
      .range(from, to);

    return { data: (res.data ?? []) as { vendor_id: string }[], error: res.error };
  });

  if (error) return set;
  for (const row of rows) set.add(row.vendor_id);
  return set;
}

export type VendorCoordRow = {
  vendor_id: string;
  geo_lat: number | null;
  geo_lng: number | null;
  map_marker_image_url: string | null;
  logo_url: string | null;
};

/** Lat/lng from vendors.location via view `vendors_public_coords` (migration 0032). */
export async function fetchVendorCoordsById(): Promise<Map<string, VendorCoordRow>> {
  const map = new Map<string, VendorCoordRow>();
  const { data, error } = await supabase.from('vendors_public_coords').select('*');
  if (error) {
    console.warn('vendors_public_coords:', error.message);
    return map;
  }
  for (const row of (data || []) as VendorCoordRow[]) {
    map.set(row.vendor_id, row);
  }
  return map;
}

