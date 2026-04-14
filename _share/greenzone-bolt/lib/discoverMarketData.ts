import { supabase } from '@/lib/supabase';
import { SMOKERS_CLUB_TREEHOUSE_LANE } from '@/lib/smokersClub';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';

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
        .gte('slot_rank', 1)
        .lte('slot_rank', 10)
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
