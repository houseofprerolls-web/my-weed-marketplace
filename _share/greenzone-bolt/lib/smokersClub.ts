import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { extractZip5, zipProximityRank } from '@/lib/zipUtils';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchPublicVendorCardsByIds, type PublicVendorCard } from '@/lib/vendorDeliveryList';

export type SmokersClubLane = 'delivery' | 'storefront' | 'treehouse';

/** Single public canopy: admin writes this lane; reads merge legacy delivery/storefront when treehouse is empty per slot. */
export const SMOKERS_CLUB_TREEHOUSE_LANE: SmokersClubLane = 'treehouse';

export const SMOKERS_CLUB_SLOTS = 7;
export const SMOKERS_CLUB_SLOT_RANK_MIN = 1;
export const SMOKERS_CLUB_SLOT_RANK_MAX = 7;

type ListingRow = {
  id: string;
  market_id: string;
  vendor_id: string;
  slot_rank: number;
  active: boolean;
  club_lane?: string;
};

function laneMatchesVendor(lane: SmokersClubLane, v: PublicVendorCard): boolean {
  if (lane === 'treehouse') return v.offers_delivery || v.offers_storefront;
  return lane === 'delivery' ? v.offers_delivery : v.offers_storefront;
}

async function fetchActiveListingsForLane(marketId: string, lane: SmokersClubLane) {
  const { data, error } = await supabase
    .from('vendor_market_listings')
    .select('id, market_id, vendor_id, slot_rank, active, club_lane')
    .eq('market_id', marketId)
    .eq('active', true)
    .eq('club_lane', lane)
    .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);
  if (error) {
    console.warn('Smokers Club listings:', error.message);
    return [] as ListingRow[];
  }
  return (data || []) as ListingRow[];
}

/** Merged placements: treehouse overrides delivery, which overrides storefront (same slot). */
function mergeListingRanksByPriority(
  delivery: ListingRow[],
  storefront: ListingRow[],
  treehouse: ListingRow[]
): Map<number, string> {
  const byRank = new Map<number, string>();
  for (const row of delivery) byRank.set(row.slot_rank, row.vendor_id);
  for (const row of storefront) {
    if (!byRank.has(row.slot_rank)) byRank.set(row.slot_rank, row.vendor_id);
  }
  for (const row of treehouse) byRank.set(row.slot_rank, row.vendor_id);
  return byRank;
}

export type SmokersClubListingSlot = { vendor_id: string; slot_rank: number };

/** Rank → vendor for admin UI and explicit tree fills; skips duplicate vendor on a lower rank (same as public tree). */
export function getSmokersClubExplicitAssignments(
  delivery: SmokersClubListingSlot[],
  storefront: SmokersClubListingSlot[],
  treehouse: SmokersClubListingSlot[]
): Record<number, string> {
  const merged = mergeListingRanksByPriority(
    delivery as ListingRow[],
    storefront as ListingRow[],
    treehouse as ListingRow[]
  );
  const out: Record<number, string> = {};
  const seenVendor = new Set<string>();
  for (let rank = SMOKERS_CLUB_SLOT_RANK_MIN; rank <= SMOKERS_CLUB_SLOT_RANK_MAX; rank++) {
    const vid = merged.get(rank);
    if (!vid || seenVendor.has(vid)) continue;
    out[rank] = vid;
    seenVendor.add(vid);
  }
  return out;
}

/**
 * 10 slots per lane: admin placements for the shopper's market (ZIP → region, else california-other),
 * then backfill with eligible vendors approved for that market (`vendor_market_operations`), lane match, ZIP sort.
 */
export async function buildSmokersClubRow(
  userZipHint: string | null,
  candidates: PublicVendorCard[],
  lane: SmokersClubLane
): Promise<(PublicVendorCard | null)[]> {
  const zip5 = extractZip5(userZipHint || '');
  const market = await getMarketForSmokersClub(zip5);
  const slots: (PublicVendorCard | null)[] = Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);

  if (!isVendorsSchema() || !market) {
    return slots;
  }

  const { data: opRows, error: opErr } = await supabase
    .from('vendor_market_operations')
    .select('vendor_id')
    .eq('market_id', market.id)
    .eq('approved', true);

  if (opErr) {
    console.warn('Smokers Club market approvals:', opErr.message);
    return slots;
  }

  const approvedIds = new Set((opRows || []).map((r) => (r as { vendor_id: string }).vendor_id));

  const laneCandidates = candidates.filter(
    (v) => laneMatchesVendor(lane, v) && approvedIds.has(v.id)
  );
  const byId = new Map(laneCandidates.map((v) => [v.id, v]));

  const { data: listings, error } = await supabase
    .from('vendor_market_listings')
    .select('id, market_id, vendor_id, slot_rank, active, club_lane')
    .eq('market_id', market.id)
    .eq('active', true)
    .eq('club_lane', lane)
    .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);

  if (error) {
    console.warn('Smokers Club listings:', error.message);
    return slots;
  }

  const listingRows = (listings || []) as ListingRow[];
  const listedVendorIds = Array.from(new Set(listingRows.map((r) => r.vendor_id)));
  const missingListed = listedVendorIds.filter((id) => !byId.has(id));
  if (missingListed.length) {
    const extra = await fetchPublicVendorCardsByIds(missingListed, { includeOrderCounts: false });
    for (const id of missingListed) {
      const card = extra.get(id);
      if (
        card &&
        approvedIds.has(id) &&
        laneMatchesVendor(lane, card)
      ) {
        byId.set(id, card);
      }
    }
  }

  const used = new Set<string>();
  for (const row of listingRows) {
    const idx = row.slot_rank - 1;
    if (idx < 0 || idx >= SMOKERS_CLUB_SLOTS) continue;
    const v = byId.get(row.vendor_id);
    if (v) {
      slots[idx] = v;
      used.add(v.id);
    }
  }

  const pool = laneCandidates
    .filter((v) => !used.has(v.id))
    .sort((a, b) => {
      const ra = zipProximityRank(zip5, a.zip);
      const rb = zipProximityRank(zip5, b.zip);
      if (ra !== rb) return ra - rb;
      if (b.order_count !== a.order_count) return b.order_count - a.order_count;
      return a.name.localeCompare(b.name);
    });

  let pi = 0;
  for (let i = 0; i < SMOKERS_CLUB_SLOTS; i++) {
    if (!slots[i] && pi < pool.length) {
      slots[i] = pool[pi++];
    }
  }

  return slots;
}

/**
 * One 10-slot treehouse: admin `treehouse` lane first, else legacy delivery + storefront per rank.
 * Pool = market-approved vendors with delivery and/or storefront.
 */
export async function buildSmokersClubTreehouseRow(
  userZipHint: string | null,
  candidates: PublicVendorCard[]
): Promise<(PublicVendorCard | null)[]> {
  const zip5 = extractZip5(userZipHint || '');
  const market = await getMarketForSmokersClub(zip5);
  const slots: (PublicVendorCard | null)[] = Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);

  if (!isVendorsSchema() || !market) {
    return slots;
  }

  const { data: opRows, error: opErr } = await supabase
    .from('vendor_market_operations')
    .select('vendor_id')
    .eq('market_id', market.id)
    .eq('approved', true);

  if (opErr) {
    console.warn('Smokers Club market approvals:', opErr.message);
    return slots;
  }

  const approvedIds = new Set((opRows || []).map((r) => (r as { vendor_id: string }).vendor_id));

  const poolCandidates = candidates.filter(
    (v) => laneMatchesVendor('treehouse', v) && approvedIds.has(v.id)
  );
  const byId = new Map(poolCandidates.map((v) => [v.id, v]));

  const [treehouseRows, deliveryRows, storefrontRows] = await Promise.all([
    fetchActiveListingsForLane(market.id, 'treehouse'),
    fetchActiveListingsForLane(market.id, 'delivery'),
    fetchActiveListingsForLane(market.id, 'storefront'),
  ]);

  const explicit = getSmokersClubExplicitAssignments(deliveryRows, storefrontRows, treehouseRows);
  const listedVendorIds = Array.from(new Set(Object.values(explicit)));
  const missingListed = listedVendorIds.filter((id) => !byId.has(id));
  if (missingListed.length) {
    const extra = await fetchPublicVendorCardsByIds(missingListed, { includeOrderCounts: false });
    for (const id of missingListed) {
      const card = extra.get(id);
      if (card && approvedIds.has(id) && laneMatchesVendor('treehouse', card)) {
        byId.set(id, card);
      }
    }
  }

  const used = new Set<string>();
  for (let rank = SMOKERS_CLUB_SLOT_RANK_MIN; rank <= SMOKERS_CLUB_SLOT_RANK_MAX; rank++) {
    const vid = explicit[rank];
    if (!vid) continue;
    const v = byId.get(vid);
    if (v) {
      slots[rank - 1] = v;
      used.add(vid);
    }
  }

  const pool = poolCandidates
    .filter((v) => !used.has(v.id))
    .sort((a, b) => {
      const ra = zipProximityRank(zip5, a.zip);
      const rb = zipProximityRank(zip5, b.zip);
      if (ra !== rb) return ra - rb;
      if (b.order_count !== a.order_count) return b.order_count - a.order_count;
      return a.name.localeCompare(b.name);
    });

  let pi = 0;
  for (let i = 0; i < SMOKERS_CLUB_SLOTS; i++) {
    if (!slots[i] && pi < pool.length) {
      slots[i] = pool[pi++];
    }
  }

  return slots;
}
