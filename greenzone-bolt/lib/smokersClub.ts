import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { extractZip5, zipProximityRank } from '@/lib/zipUtils';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchPublicVendorCardsByIds, type PublicVendorCard } from '@/lib/vendorDeliveryList';
import { type VendorShopperAreaGateCtx, type VendorShopperAreaFields } from '@/lib/vendorShopperArea';
import type { ListingMarket } from '@/lib/marketFromZip';
import { hashSeed, mulberry32 } from '@/lib/smokersClubHash';
import {
  batchLoadSmokersClubRankingMetrics,
  computeSmokersClubScoreBreakdown,
  SMOKERS_CLUB_RANK_WEIGHTS,
  type SmokersClubScoreBreakdown,
} from '@/lib/smokersClubRanking';
import type { SmokersClubShopperAnchor } from '@/lib/smokersClubShopperAnchor';
import { normalizeSmokersClubShopperAnchor } from '@/lib/smokersClubShopperAnchor';
import {
  SMOKERS_CLUB_MAX_RADIUS_MI,
  SMOKERS_CLUB_PRIMARY_RADIUS_MI,
  vendorEligibleForSmokersClubPinAtAnchor,
  vendorPassesSmokersClubRadiusGate,
  vendorNearestMapPinMilesFromAnchor,
  resolveSmokersClubBackfillRadiusMiles,
} from '@/lib/smokersClubRadius';
import { fetchVendorExtraLocationCoordsByVendorId } from '@/lib/vendorMapExtraCoords';

export type { SmokersClubShopperAnchor } from '@/lib/smokersClubShopperAnchor';

/** `shuffle` = daily fair placement; `ordered` = merit rank maps to ascending slot index (admin preview). */
export type SmokersClubEmptySlotFillMode = 'shuffle' | 'ordered';

export function smokersClubShopperFromZipHint(
  userZipHint: string | null | undefined,
  lat?: number | null,
  lng?: number | null
): SmokersClubShopperAnchor {
  return normalizeSmokersClubShopperAnchor({ userZipHint, lat, lng });
}

export type SmokersClubLane = 'delivery' | 'storefront' | 'treehouse';

/** Single public canopy: admin writes this lane; reads merge legacy delivery/storefront when treehouse is empty per slot. */
export const SMOKERS_CLUB_TREEHOUSE_LANE: SmokersClubLane = 'treehouse';

export const SMOKERS_CLUB_SLOTS = 7;
export const SMOKERS_CLUB_SLOT_RANK_MIN = 1;
export const SMOKERS_CLUB_SLOT_RANK_MAX = 7;

function smokersClubGateCtx(
  zip5: string | null,
  vendorIdsServingShopperZip?: ReadonlySet<string> | undefined
): VendorShopperAreaGateCtx {
  return {
    shopperZip5: zip5 && zip5.length === 5 ? zip5 : null,
    vendorIdsServingShopperZip,
  };
}

type ListingRow = {
  id: string;
  vendor_id: string;
  slot_rank: number;
  active: boolean;
  club_lane?: string;
};

function laneMatchesVendor(lane: SmokersClubLane, v: PublicVendorCard): boolean {
  if (lane === 'treehouse') return v.offers_delivery || v.offers_storefront;
  return lane === 'delivery' ? v.offers_delivery : v.offers_storefront;
}

/** Global admin pins (`smokers_club_slot_pins`); merged by lane priority in `getSmokersClubExplicitAssignments`. */
async function fetchClubSlotPinsForLane(lane: SmokersClubLane, client: SupabaseClient = supabase) {
  const { data, error } = await client
    .from('smokers_club_slot_pins')
    .select('id, vendor_id, slot_rank, active, club_lane')
    .eq('active', true)
    .eq('club_lane', lane)
    .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);
  if (error) {
    console.warn('Smokers Club slot pins:', error.message);
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
 * Seven slots per lane: global admin pins (`smokers_club_slot_pins`), then backfill with eligible vendors
 * for the shopper's listing market (`vendor_market_operations`), lane match, ZIP or composite score sort.
 */
export async function buildSmokersClubRow(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  lane: SmokersClubLane,
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<(PublicVendorCard | null)[]> {
  const zip5 = shopper.zip5 && shopper.zip5.length === 5 ? shopper.zip5 : '';
  const gateCtx = smokersClubGateCtx(zip5 || null, vendorIdsServingShopperZip);
  const market = await getMarketForSmokersClub(zip5 || null, client);
  const slots: (PublicVendorCard | null)[] = Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);

  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors || !market) {
    return slots;
  }

  const { data: opRows, error: opErr } = await client
    .from('vendor_market_operations')
    .select('vendor_id')
    .eq('market_id', market.id)
    .eq('approved', true);

  if (opErr) {
    console.warn('Smokers Club market approvals:', opErr.message);
  }

  const approvedIds = new Set(
    opErr ? [] : (opRows || []).map((r) => (r as { vendor_id: string }).vendor_id)
  );

  const maxM = shopper.geoMode && shopper.latLng ? SMOKERS_CLUB_MAX_RADIUS_MI : SMOKERS_CLUB_PRIMARY_RADIUS_MI;
  const laneCandidates = candidates.filter(
    (v) =>
      laneMatchesVendor(lane, v) &&
      vendorPassesSmokersClubRadiusGate(
        v as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        shopper.geoMode,
        shopper.latLng,
        maxM
      )
  );
  const byId = new Map(laneCandidates.map((v) => [v.id, v]));

  const { data: listings, error } = await client
    .from('smokers_club_slot_pins')
    .select('id, vendor_id, slot_rank, active, club_lane')
    .eq('active', true)
    .eq('club_lane', lane)
    .gte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MIN)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);

  if (error) {
    console.warn('Smokers Club slot pins:', error.message);
    return slots;
  }

  const listingRows = (listings || []) as ListingRow[];
  const listedVendorIds = Array.from(new Set(listingRows.map((r) => r.vendor_id)));
  const missingListed = listedVendorIds.filter((id) => !byId.has(id));
  if (missingListed.length) {
    const extra = await fetchPublicVendorCardsByIds(missingListed, {
      includeOrderCounts: false,
      vendorsSchema: useVendors,
      client,
    });
    for (const id of missingListed) {
      const card = extra.get(id);
      if (
        card &&
        vendorPassesSmokersClubRadiusGate(
          card as PublicVendorCard & VendorShopperAreaFields,
          approvedIds,
          gateCtx,
          shopper.geoMode,
          shopper.latLng,
          maxM
        ) &&
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

  const emptyNeed = slots.filter((s) => s == null).length;
  const backfillRadius = resolveSmokersClubBackfillRadiusMiles(
    laneCandidates,
    emptyNeed,
    approvedIds,
    gateCtx,
    shopper.geoMode,
    shopper.latLng
  );
  const poolBase = laneCandidates.filter(
    (v) =>
      !used.has(v.id) &&
      vendorPassesSmokersClubRadiusGate(
        v as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        shopper.geoMode,
        shopper.latLng,
        backfillRadius
      )
  );

  let pool: PublicVendorCard[];
  if (shopper.geoMode && shopper.latLng) {
    const dateKey = smokersClubUtcDateKey();
    const metrics = await batchLoadSmokersClubRankingMetrics(
      client,
      poolBase.map((v) => v.id)
    );
    const scored = poolBase.map((v) => {
      const m = metrics.get(v.id) ?? { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 };
      return {
        v,
        total: computeSmokersClubScoreBreakdown(v, m, zip5 ? zip5 : null, market.id, dateKey, {
          shopperLatLng: shopper.latLng,
        }).total,
      };
    });
    scored.sort(
      (a, b) => b.total - a.total || a.v.name.localeCompare(b.v.name, undefined, { sensitivity: 'base' })
    );
    pool = scored.map((s) => s.v);
  } else {
    pool = [...poolBase].sort((a, b) => {
      const ra = zipProximityRank(zip5, a.zip);
      const rb = zipProximityRank(zip5, b.zip);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }

  let pi = 0;
  for (let i = 0; i < SMOKERS_CLUB_SLOTS; i++) {
    if (!slots[i] && pi < pool.length) {
      slots[i] = pool[pi++];
    }
  }

  return slots;
}

/** Trophy tier 1–3 = ZIP-closest three shops on the tree (gold / silver / bronze styling). */
export type SmokersClubTrophyTier = 1 | 2 | 3;

export type PublicVendorCardWithSmokersClub = PublicVendorCard & { smokers_club_trophy?: SmokersClubTrophyTier };

/** @deprecated Use `PublicVendorCardWithSmokersClub` */
export type PublicVendorCardWithClubRank = PublicVendorCardWithSmokersClub;

/** Discover sort / map pins: 1–3 = trophy tiers; 4 = on tree without trophy. */
export const SMOKERS_CLUB_DISCOVER_PRIORITY_ON_TREE = 4;

/** UTC calendar date key used to rotate tree positions daily. */
export function smokersClubUtcDateKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Deterministic shuffle of visual slot indices (0–6) per market + UTC day. */
export function smokersClubVisualSlotOrderForDay(marketId: string, dateKeyUtc: string): number[] {
  const arr = [0, 1, 2, 3, 4, 5, 6];
  const rand = mulberry32(hashSeed(`${marketId}::${dateKeyUtc}`));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Shuffle a copy of `indices` (e.g. empty tree slot indices) deterministically per day. */
function shuffleSlotIndices(indices: number[], marketId: string, dateKey: string, salt: string): number[] {
  const arr = [...indices];
  if (arr.length <= 1) return arr;
  const rand = mulberry32(hashSeed(`${marketId}::${dateKey}::${salt}`));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * After QA test pins claim slots 0–1, refill any still-empty slots from the same candidate pool
 * (same scoring/shuffle as primary backfill) so the rest of the tree is not blank.
 */
export async function backfillSmokersClubTreehouseEmptySlots(
  shopper: SmokersClubShopperAnchor,
  row: (PublicVendorCard | null)[],
  candidates: PublicVendorCard[],
  vendorsSchema: boolean,
  client: SupabaseClient,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<(PublicVendorCard | null)[]> {
  const emptyIndices: number[] = [];
  for (let i = 0; i < row.length; i++) {
    if (row[i] == null) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) return row;

  const zip5 = shopper.zip5 && shopper.zip5.length === 5 ? shopper.zip5 : '';
  const gateCtx = smokersClubGateCtx(zip5 || null, vendorIdsServingShopperZip);
  const market = await getMarketForSmokersClub(zip5 || null, client);
  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors || !market) return row;

  const { data: opRows, error: opErr } = await client
    .from('vendor_market_operations')
    .select('vendor_id')
    .eq('market_id', market.id)
    .eq('approved', true);

  if (opErr) {
    console.warn('Smokers Club gap-fill market approvals:', opErr.message);
  }
  const approvedIds = new Set(
    opErr ? [] : (opRows || []).map((r) => (r as { vendor_id: string }).vendor_id)
  );

  const placed = new Set(
    row.filter((v): v is PublicVendorCard => v != null).map((v) => v.id)
  );
  const maxM = shopper.geoMode && shopper.latLng ? SMOKERS_CLUB_MAX_RADIUS_MI : SMOKERS_CLUB_PRIMARY_RADIUS_MI;
  const widePool = candidates.filter(
    (v) =>
      !placed.has(v.id) &&
      laneMatchesVendor('treehouse', v) &&
      vendorPassesSmokersClubRadiusGate(
        v as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        shopper.geoMode,
        shopper.latLng,
        maxM
      )
  );
  if (widePool.length === 0) return row;

  const backfillRadius = resolveSmokersClubBackfillRadiusMiles(
    widePool,
    emptyIndices.length,
    approvedIds,
    gateCtx,
    shopper.geoMode,
    shopper.latLng
  );
  const pool = widePool.filter((v) =>
    vendorPassesSmokersClubRadiusGate(
      v as PublicVendorCard & VendorShopperAreaFields,
      approvedIds,
      gateCtx,
      shopper.geoMode,
      shopper.latLng,
      backfillRadius
    )
  );
  if (pool.length === 0) return row;

  const dateKey = smokersClubUtcDateKey();
  const metrics = await batchLoadSmokersClubRankingMetrics(
    client,
    pool.map((v) => v.id)
  );
  const scoreOpts = shopper.geoMode && shopper.latLng ? { shopperLatLng: shopper.latLng } : undefined;
  const scored = pool.map((v) => {
    const m = metrics.get(v.id) ?? { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 };
    return {
      v,
      total: computeSmokersClubScoreBreakdown(v, m, zip5 ? zip5 : null, market.id, dateKey, scoreOpts).total,
    };
  });
  scored.sort(
    (a, b) => b.total - a.total || a.v.name.localeCompare(b.v.name, undefined, { sensitivity: 'base' })
  );

  const next = [...row];
  const shuffled = shuffleSlotIndices(emptyIndices, market.id, dateKey, 'tree-gap-after-pins');
  const n = Math.min(shuffled.length, scored.length);
  for (let j = 0; j < n; j++) {
    next[shuffled[j]] = { ...scored[j].v };
  }
  return next;
}

/**
 * Among vendors on the tree: with shopper anchor + vendor coords, trophies = three smallest haversine miles;
 * otherwise ZIP-string proximity (legacy).
 */
export function applySmokersClubTrophiesToRow(
  row: (PublicVendorCard | null)[],
  shopper: SmokersClubShopperAnchor
): (PublicVendorCardWithSmokersClub | null)[] {
  const zip5 = shopper.zip5 && shopper.zip5.length === 5 ? shopper.zip5 : extractZip5('') ?? '';
  const placed = row.filter((v): v is PublicVendorCard => v != null);
  const anchor = shopper.geoMode && shopper.latLng ? shopper.latLng : null;
  const sorted = [...placed].sort((a, b) => {
    if (anchor) {
      const da = vendorNearestMapPinMilesFromAnchor(a, anchor);
      const db = vendorNearestMapPinMilesFromAnchor(b, anchor);
      if (da != null && db != null && da !== db) return da - db;
      if (da == null && db != null) return 1;
      if (db == null && da != null) return -1;
    }
    const ra = zipProximityRank(zip5, a.zip);
    const rb = zipProximityRank(zip5, b.zip);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  const tierById = new Map<string, SmokersClubTrophyTier>();
  sorted.slice(0, 3).forEach((v, i) => tierById.set(v.id, (i + 1) as SmokersClubTrophyTier));

  return row.map((v) => {
    if (!v) return null;
    const t = tierById.get(v.id);
    const base: PublicVendorCardWithSmokersClub = { ...v, order_count: 0 };
    if (t != null) base.smokers_club_trophy = t;
    else delete base.smokers_club_trophy;
    return base;
  });
}

/**
 * vendor_id → discover priority: **1–3** = trophy (ZIP spotlight on tree), **4** = on tree only (top 7).
 */
export async function computeSmokersClubDiscoverPriorityMap(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  const row = await buildSmokersClubTreehouseRow(
    shopper,
    candidates,
    vendorsSchema,
    client,
    vendorIdsServingShopperZip
  );
  for (const v of row) {
    if (!v) continue;
    const t = v.smokers_club_trophy;
    m.set(v.id, t != null ? t : SMOKERS_CLUB_DISCOVER_PRIORITY_ON_TREE);
  }
  return m;
}

/** @deprecated Use `computeSmokersClubDiscoverPriorityMap` */
export async function computeSmokersClubOperationalRanksMap(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<Map<string, number>> {
  return computeSmokersClubDiscoverPriorityMap(
    shopper,
    candidates,
    vendorsSchema,
    client,
    vendorIdsServingShopperZip
  );
}

type TreehousePinStage = {
  market: ListingMarket;
  shopper: SmokersClubShopperAnchor;
  zip5: string | null;
  dateKey: string;
  approvedIds: Set<string>;
  /** After admin pins only (null = open slot). */
  rowPinned: (PublicVendorCard | null)[];
  fillCandidates: PublicVendorCard[];
};

async function runSmokersClubTreehousePinStage(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  dateOverride?: Date,
  client: SupabaseClient = supabase,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<TreehousePinStage | null> {
  const zip5 = shopper.zip5 && shopper.zip5.length === 5 ? shopper.zip5 : null;
  const gateCtx = smokersClubGateCtx(zip5, vendorIdsServingShopperZip);
  const market = await getMarketForSmokersClub(zip5, client);
  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors || !market) return null;

  const { data: opRows, error: opErr } = await client
    .from('vendor_market_operations')
    .select('vendor_id')
    .eq('market_id', market.id)
    .eq('approved', true);

  if (opErr) {
    console.warn('Smokers Club market approvals:', opErr.message);
    return null;
  }

  const approvedIds = new Set((opRows || []).map((r) => (r as { vendor_id: string }).vendor_id));

  const extraByVendor = await fetchVendorExtraLocationCoordsByVendorId(client);
  const withExtras = (v: PublicVendorCard): PublicVendorCard => {
    const ex = extraByVendor.get(v.id);
    if (!ex?.length) return v;
    return { ...v, map_geo_extra_points: ex.map((e) => ({ lat: e.lat, lng: e.lng })) };
  };
  const candidatesWithExtras = candidates.map(withExtras);

  const maxPoolMiles = shopper.geoMode && shopper.latLng ? SMOKERS_CLUB_MAX_RADIUS_MI : SMOKERS_CLUB_PRIMARY_RADIUS_MI;
  const poolCandidates = candidatesWithExtras.filter(
    (v) =>
      laneMatchesVendor('treehouse', v) &&
      vendorPassesSmokersClubRadiusGate(
        v as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        shopper.geoMode,
        shopper.latLng,
        maxPoolMiles
      )
  );

  if (poolCandidates.length === 0) return null;

  const byId = new Map(poolCandidates.map((v) => [v.id, v]));

  const [treehouseRows, deliveryRows, storefrontRows] = await Promise.all([
    fetchClubSlotPinsForLane('treehouse', client),
    fetchClubSlotPinsForLane('delivery', client),
    fetchClubSlotPinsForLane('storefront', client),
  ]);

  const explicit = getSmokersClubExplicitAssignments(deliveryRows, storefrontRows, treehouseRows);
  const listedVendorIds = Array.from(new Set(Object.values(explicit)));
  const missingListed = listedVendorIds.filter((id) => !byId.has(id));
  if (missingListed.length) {
    const extra = await fetchPublicVendorCardsByIds(missingListed, {
      includeOrderCounts: false,
      vendorsSchema: useVendors,
      client,
    });
    for (const id of missingListed) {
      const card = extra.get(id);
      const cardX = card ? withExtras(card) : null;
      if (
        cardX &&
        vendorPassesSmokersClubRadiusGate(
          cardX as PublicVendorCard & VendorShopperAreaFields,
          approvedIds,
          gateCtx,
          shopper.geoMode,
          shopper.latLng,
          maxPoolMiles
        ) &&
        laneMatchesVendor('treehouse', cardX)
      ) {
        byId.set(id, cardX);
      }
    }
  }

  const dateKey = smokersClubUtcDateKey(dateOverride);

  const rowPinned: (PublicVendorCard | null)[] = Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);
  const used = new Set<string>();

  for (let slot = SMOKERS_CLUB_SLOT_RANK_MIN; slot <= SMOKERS_CLUB_SLOT_RANK_MAX; slot++) {
    const vid = explicit[slot];
    if (!vid) continue;
    const v = byId.get(vid);
    if (
      !v ||
      !vendorPassesSmokersClubRadiusGate(
        v as PublicVendorCard & VendorShopperAreaFields,
        approvedIds,
        gateCtx,
        shopper.geoMode,
        shopper.latLng,
        maxPoolMiles
      ) ||
      !laneMatchesVendor('treehouse', v)
    ) {
      continue;
    }
    if (
      shopper.geoMode &&
      shopper.latLng &&
      !vendorEligibleForSmokersClubPinAtAnchor(v, approvedIds, gateCtx, shopper.latLng, true)
    ) {
      continue;
    }
    const idx = slot - 1;
    if (rowPinned[idx] != null) continue;
    rowPinned[idx] = { ...v };
    used.add(v.id);
  }

  const fillCandidates = poolCandidates.filter((v) => !used.has(v.id));

  return { market, shopper, zip5, dateKey, approvedIds, rowPinned, fillCandidates };
}

export type SmokersClubTreeSlotReport = {
  slotRank: number;
  source: 'admin_pin' | 'ranked_backfill' | 'empty';
  vendorId: string | null;
  vendorName: string | null;
  compositeScore: number | null;
  /** 1 = strongest backfill by score among fills that received a slot today */
  backfillMeritRank: number | null;
  breakdown: SmokersClubScoreBreakdown | null;
  adminNote?: string;
};

export type SmokersClubTreeRankingReport = {
  marketId: string;
  marketName: string | null;
  dateKeyUtc: string;
  shopperZip: string | null;
  shopperLat: number | null;
  shopperLng: number | null;
  shopperGeoMode: boolean;
  /** Miles cap used for backfill pool after stepped expansion (null = ZIP-only path). */
  backfillRadiusMiles: number | null;
  emptySlotFillMode: SmokersClubEmptySlotFillMode;
  weights: typeof SMOKERS_CLUB_RANK_WEIGHTS;
  slots: SmokersClubTreeSlotReport[];
  backfillLeaderboard: Array<{
    meritRank: number;
    vendorId: string;
    vendorName: string;
    compositeScore: number;
    breakdown: SmokersClubScoreBreakdown;
    assignedToSlotRank: number | null;
  }>;
};

/**
 * Admin-only: same inputs as the public tree, returns scored backfill explanation + final slot assignment.
 */
export async function explainSmokersClubTreehouseRanking(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  dateOverride?: Date,
  client: SupabaseClient = supabase,
  emptySlotFillMode: SmokersClubEmptySlotFillMode = 'shuffle',
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<SmokersClubTreeRankingReport | null> {
  const stage = await runSmokersClubTreehousePinStage(
    shopper,
    candidates,
    vendorsSchema,
    dateOverride,
    client,
    vendorIdsServingShopperZip
  );
  if (!stage) return null;

  const gateCtx = smokersClubGateCtx(stage.zip5, vendorIdsServingShopperZip);
  const emptyIndices: number[] = [];
  for (let i = 0; i < SMOKERS_CLUB_SLOTS; i++) {
    if (stage.rowPinned[i] == null) emptyIndices.push(i);
  }
  const backfillRadius = resolveSmokersClubBackfillRadiusMiles(
    stage.fillCandidates,
    emptyIndices.length,
    stage.approvedIds,
    gateCtx,
    stage.shopper.geoMode,
    stage.shopper.latLng
  );
  const poolForBackfill = stage.fillCandidates.filter((v) =>
    vendorPassesSmokersClubRadiusGate(
      v as PublicVendorCard & VendorShopperAreaFields,
      stage.approvedIds,
      gateCtx,
      stage.shopper.geoMode,
      stage.shopper.latLng,
      backfillRadius
    )
  );

  const metrics = await batchLoadSmokersClubRankingMetrics(
    client,
    poolForBackfill.map((v) => v.id)
  );
  const scoreOpts =
    stage.shopper.geoMode && stage.shopper.latLng ? { shopperLatLng: stage.shopper.latLng } : undefined;
  const scored = poolForBackfill.map((v) => {
    const m = metrics.get(v.id) ?? { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 };
    const breakdown = computeSmokersClubScoreBreakdown(v, m, stage.zip5, stage.market.id, stage.dateKey, scoreOpts);
    return { v, breakdown, total: breakdown.total };
  });
  scored.sort((a, b) => b.total - a.total || a.v.name.localeCompare(b.v.name, undefined, { sensitivity: 'base' }));

  const orderedEmpty =
    emptySlotFillMode === 'ordered' ? [...emptyIndices].sort((a, b) => a - b) : emptyIndices;
  const shuffledEmpty =
    emptySlotFillMode === 'shuffle'
      ? shuffleSlotIndices(emptyIndices, stage.market.id, stage.dateKey, 'tree-fill')
      : orderedEmpty;
  const nFill = Math.min(shuffledEmpty.length, scored.length);

  const rowFinal: (PublicVendorCard | null)[] = [...stage.rowPinned];
  const meritRankByIndex: Map<number, number> = new Map();
  const slotRankByVendor = new Map<string, number>();
  for (let j = 0; j < nFill; j++) {
    const idx = shuffledEmpty[j];
    const s = scored[j];
    rowFinal[idx] = { ...s.v };
    meritRankByIndex.set(idx, j + 1);
    slotRankByVendor.set(s.v.id, idx + 1);
  }

  const slots: SmokersClubTreeSlotReport[] = [];
  for (let slot = SMOKERS_CLUB_SLOT_RANK_MIN; slot <= SMOKERS_CLUB_SLOT_RANK_MAX; slot++) {
    const idx = slot - 1;
    const pinned = stage.rowPinned[idx];
    if (pinned) {
      slots.push({
        slotRank: slot,
        source: 'admin_pin',
        vendorId: pinned.id,
        vendorName: pinned.name,
        compositeScore: null,
        backfillMeritRank: null,
        breakdown: null,
        adminNote:
          'Fixed placement from global Feature slots (smokers_club_slot_pins). Not included in the composite score. With shopper geo on, pins only render within 15 mi (or delivery-ZIP override).',
      });
      continue;
    }
    const v = rowFinal[idx];
    if (!v) {
      slots.push({
        slotRank: slot,
        source: 'empty',
        vendorId: null,
        vendorName: null,
        compositeScore: null,
        backfillMeritRank: null,
        breakdown: null,
      });
      continue;
    }
    const merit = meritRankByIndex.get(idx) ?? null;
    const m = metrics.get(v.id) ?? { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 };
    const breakdown = computeSmokersClubScoreBreakdown(v, m, stage.zip5, stage.market.id, stage.dateKey, scoreOpts);
    const fillNote =
      emptySlotFillMode === 'ordered'
        ? 'Empty slots filled in ascending slot order (admin preview).'
        : 'Empty slots are shuffled per UTC day; see “Daily rotation” in the point breakdown.';
    slots.push({
      slotRank: slot,
      source: 'ranked_backfill',
      vendorId: v.id,
      vendorName: v.name,
      compositeScore: breakdown.total,
      backfillMeritRank: merit,
      breakdown,
      adminNote: `Backfill merit #${merit} of ${scored.length} eligible within ${backfillRadius} mi (expanded rings when sparse). ${fillNote}`,
    });
  }

  const backfillLeaderboard = scored.map((s, i) => ({
    meritRank: i + 1,
    vendorId: s.v.id,
    vendorName: s.v.name,
    compositeScore: s.total,
    breakdown: s.breakdown,
    assignedToSlotRank: i < nFill ? slotRankByVendor.get(s.v.id) ?? null : null,
  }));

  return {
    marketId: stage.market.id,
    marketName: stage.market.name,
    dateKeyUtc: stage.dateKey,
    shopperZip: stage.zip5,
    shopperLat: stage.shopper.latLng?.lat ?? null,
    shopperLng: stage.shopper.latLng?.lng ?? null,
    shopperGeoMode: stage.shopper.geoMode,
    backfillRadiusMiles: stage.shopper.geoMode && stage.shopper.latLng ? backfillRadius : null,
    emptySlotFillMode,
    weights: SMOKERS_CLUB_RANK_WEIGHTS,
    slots,
    backfillLeaderboard,
  };
}

/**
 * Seven-slot treehouse:
 * - **Admin pins** (`smokers_club_slot_pins`, merged delivery/storefront/treehouse): fixed visual slot = `slot_rank`.
 * - **Open slots**: composite score (distance or ZIP proximity, orders, tree engagement, listing quality, daily rotation),
 *   then empty positions **shuffled** daily per market (or ordered in admin preview only).
 * - **Trophies** (`smokers_club_trophy` 1–3): three smallest haversine miles when anchor + coords exist; else ZIP proximity.
 */
export async function buildSmokersClubTreehouseRow(
  shopper: SmokersClubShopperAnchor,
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase,
  vendorIdsServingShopperZip?: ReadonlySet<string>,
  emptySlotFillMode: SmokersClubEmptySlotFillMode = 'shuffle'
): Promise<(PublicVendorCardWithSmokersClub | null)[]> {
  const empty: (PublicVendorCardWithSmokersClub | null)[] = Array.from(
    { length: SMOKERS_CLUB_SLOTS },
    () => null
  );

  const stage = await runSmokersClubTreehousePinStage(
    shopper,
    candidates,
    vendorsSchema,
    undefined,
    client,
    vendorIdsServingShopperZip
  );
  if (!stage) return empty;

  const gateCtx = smokersClubGateCtx(stage.zip5, vendorIdsServingShopperZip);
  const emptyIndices: number[] = [];
  for (let i = 0; i < SMOKERS_CLUB_SLOTS; i++) {
    if (stage.rowPinned[i] == null) emptyIndices.push(i);
  }
  const backfillRadius = resolveSmokersClubBackfillRadiusMiles(
    stage.fillCandidates,
    emptyIndices.length,
    stage.approvedIds,
    gateCtx,
    stage.shopper.geoMode,
    stage.shopper.latLng
  );
  const poolForBackfill = stage.fillCandidates.filter((v) =>
    vendorPassesSmokersClubRadiusGate(
      v as PublicVendorCard & VendorShopperAreaFields,
      stage.approvedIds,
      gateCtx,
      stage.shopper.geoMode,
      stage.shopper.latLng,
      backfillRadius
    )
  );

  const metrics = await batchLoadSmokersClubRankingMetrics(
    client,
    poolForBackfill.map((v) => v.id)
  );
  const scoreOpts =
    stage.shopper.geoMode && stage.shopper.latLng ? { shopperLatLng: stage.shopper.latLng } : undefined;
  const scored = poolForBackfill.map((v) => {
    const m = metrics.get(v.id) ?? { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 };
    const breakdown = computeSmokersClubScoreBreakdown(v, m, stage.zip5, stage.market.id, stage.dateKey, scoreOpts);
    return { v, total: breakdown.total };
  });
  scored.sort((a, b) => b.total - a.total || a.v.name.localeCompare(b.v.name, undefined, { sensitivity: 'base' }));
  const sortedFillPool = scored.map((s) => s.v);

  const orderedEmpty =
    emptySlotFillMode === 'ordered' ? [...emptyIndices].sort((a, b) => a - b) : emptyIndices;
  const shuffledEmpty =
    emptySlotFillMode === 'shuffle'
      ? shuffleSlotIndices(emptyIndices, stage.market.id, stage.dateKey, 'tree-fill')
      : orderedEmpty;
  const nFill = Math.min(shuffledEmpty.length, sortedFillPool.length);

  const row: (PublicVendorCard | null)[] = [...stage.rowPinned];
  for (let j = 0; j < nFill; j++) {
    row[shuffledEmpty[j]] = { ...sortedFillPool[j] };
  }

  return applySmokersClubTrophiesToRow(row, shopper);
}
