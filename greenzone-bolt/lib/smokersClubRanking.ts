import type { SupabaseClient } from '@supabase/supabase-js';
import { extractZip5, zipProximityRank } from '@/lib/zipUtils';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';
import { hashSeed } from '@/lib/smokersClubHash';
import { SMOKERS_CLUB_PRIMARY_RADIUS_MI, vendorNearestMapPinMilesFromAnchor } from '@/lib/smokersClubRadius';

export type SmokersClubScoreLine = {
  key: string;
  label: string;
  points: number;
  /** Human-readable detail for admins (raw counts, ranks, etc.). */
  detail?: string;
};

export type SmokersClubScoreBreakdown = {
  total: number;
  lines: SmokersClubScoreLine[];
};

export type SmokersClubRankingMetrics = {
  orders30d: number;
  treeImpressions7d: number;
  treeClicks7d: number;
};

const ORDERS_WINDOW_DAYS = 30;
const ENGAGEMENT_WINDOW_DAYS = 7;

/** Max points per bucket (documented for admins). */
export const SMOKERS_CLUB_RANK_WEIGHTS = {
  zipProximityMax: 220,
  ordersMax: 200,
  treeEngagementMax: 200,
  listingQualityMax: 130,
  dailyRotationMax: 50,
} as const;

function zipProximityPoints(zip5: string | null, vendorZip: string | null | undefined): { points: number; detail: string } {
  const u = extractZip5(zip5 || '');
  const rank = zipProximityRank(u, vendorZip);
  const detail = `ZIP distance rank ${rank} (lower is closer; 500000 = unknown ZIP)`;
  if (rank >= 500_000) return { points: 0, detail };
  if (rank <= 20) return { points: SMOKERS_CLUB_RANK_WEIGHTS.zipProximityMax, detail };
  if (rank < 200) {
    const pts = Math.round(SMOKERS_CLUB_RANK_WEIGHTS.zipProximityMax - rank * 0.9);
    return { points: Math.max(120, pts), detail };
  }
  if (rank < 5_000) {
    const pts = Math.round(120 - (rank - 200) * 0.02);
    return { points: Math.max(40, pts), detail };
  }
  const pts = Math.round(40 - Math.min(35, (rank - 5_000) / 15_000));
  return { points: Math.max(5, pts), detail };
}

function orderVolumePoints(count: number): { points: number; detail: string } {
  const detail = `${count} paid orders (last ${ORDERS_WINDOW_DAYS} days, excl. cancelled)`;
  if (count <= 0) return { points: 0, detail };
  const pts = Math.min(SMOKERS_CLUB_RANK_WEIGHTS.ordersMax, Math.round(55 * Math.log2(1 + count)));
  return { points: pts, detail };
}

function treeEngagementPoints(impressions: number, clicks: number): { points: number; detail: string } {
  const detail = `${impressions} tree impressions, ${clicks} tree clicks (last ${ENGAGEMENT_WINDOW_DAYS} days)`;
  const raw = impressions * 0.35 + clicks * 4;
  const pts = Math.min(SMOKERS_CLUB_RANK_WEIGHTS.treeEngagementMax, Math.round(raw));
  return { points: pts, detail };
}

function listingQualityPoints(v: PublicVendorCard): { points: number; lines: SmokersClubScoreLine[] } {
  const lines: SmokersClubScoreLine[] = [];
  let sum = 0;
  const logoPts = v.logo_url ? 35 : 0;
  sum += logoPts;
  lines.push({
    key: 'logo',
    label: 'Brand logo',
    points: logoPts,
    detail: v.logo_url ? 'Logo on file' : 'No logo',
  });
  const descLen = (v.description || '').trim().length;
  const descPts = descLen >= 120 ? 35 : descLen >= 40 ? 20 : descLen > 0 ? 10 : 0;
  sum += descPts;
  lines.push({
    key: 'description',
    label: 'Listing description',
    points: descPts,
    detail: `${descLen} characters`,
  });
  const hasClubBackdrop = Boolean(v.smokers_club_tab_background_url?.trim());
  const hasListingBanner = Boolean(v.banner_url?.trim());
  const tabPts = hasClubBackdrop || hasListingBanner ? 25 : 0;
  sum += tabPts;
  lines.push({
    key: 'tree_card',
    label: 'Smokers Club card background',
    points: tabPts,
    detail: hasClubBackdrop
      ? 'Custom club backdrop'
      : hasListingBanner
        ? 'Listing banner on tree'
        : 'Default backdrop',
  });
  const channelPts = v.offers_delivery || v.offers_storefront ? 18 : 0;
  sum += channelPts;
  lines.push({
    key: 'channels',
    label: 'Service channel',
    points: channelPts,
    detail:
      v.offers_delivery && !v.offers_storefront
        ? 'delivery'
        : v.offers_storefront && !v.offers_delivery
          ? 'storefront'
          : v.offers_delivery || v.offers_storefront
            ? 'shop'
            : 'none',
  });
  const capped = Math.min(SMOKERS_CLUB_RANK_WEIGHTS.listingQualityMax, sum);
  return { points: capped, lines };
}

function dailyRotationPoints(vendorId: string, marketId: string, dateKeyUtc: string): { points: number; detail: string } {
  const n = hashSeed(`${marketId}::${dateKeyUtc}::score::${vendorId}`) % (SMOKERS_CLUB_RANK_WEIGHTS.dailyRotationMax + 1);
  const detail = `Deterministic 0–${SMOKERS_CLUB_RANK_WEIGHTS.dailyRotationMax} from market + UTC date + vendor (tie-break & daily variety)`;
  return { points: n, detail };
}

function premiseMilesProximityPoints(
  v: PublicVendorCard,
  shopperLatLng: { lat: number; lng: number }
): { points: number; detail: string } {
  const miles = vendorNearestMapPinMilesFromAnchor(v, shopperLatLng);
  if (miles == null || !Number.isFinite(miles)) {
    return { points: 0, detail: 'Premise miles unknown (no vendor coordinates)' };
  }
  const detail = `${miles.toFixed(1)} mi from shopper anchor`;
  if (miles >= SMOKERS_CLUB_PRIMARY_RADIUS_MI) {
    return { points: 0, detail: `${detail}; no points at or beyond ${SMOKERS_CLUB_PRIMARY_RADIUS_MI} mi` };
  }
  const max = SMOKERS_CLUB_RANK_WEIGHTS.zipProximityMax;
  const pts = Math.round(max * (1 - miles / SMOKERS_CLUB_PRIMARY_RADIUS_MI));
  return { points: Math.max(0, pts), detail };
}

export type SmokersClubScoreBreakdownOpts = {
  /** When set with vendor `geo_lat`/`geo_lng`, distance replaces ZIP-string proximity to avoid double-counting geography. */
  shopperLatLng?: { lat: number; lng: number } | null;
};

/**
 * Composite score for **backfill** tree slots. Admin pins ignore this (fixed placement).
 */
export function computeSmokersClubScoreBreakdown(
  v: PublicVendorCard,
  metrics: SmokersClubRankingMetrics,
  shopperZip5: string | null,
  marketId: string,
  dateKeyUtc: string,
  opts?: SmokersClubScoreBreakdownOpts
): SmokersClubScoreBreakdown {
  const lines: SmokersClubScoreLine[] = [];

  const sl = opts?.shopperLatLng;
  if (sl && Number.isFinite(sl.lat) && Number.isFinite(sl.lng)) {
    const miles = vendorNearestMapPinMilesFromAnchor(v, sl);
    if (miles != null) {
      const dm = premiseMilesProximityPoints(v, sl);
      lines.push({
        key: 'distance',
        label: 'Distance from shopper anchor',
        points: dm.points,
        detail: dm.detail,
      });
      lines.push({
        key: 'zip',
        label: 'ZIP proximity vs shopper',
        points: 0,
        detail: 'Not used when vendor coordinates and shopper anchor are both available',
      });
    } else {
      const z = zipProximityPoints(shopperZip5, v.zip);
      lines.push({
        key: 'zip',
        label: 'ZIP proximity vs shopper',
        points: z.points,
        detail: `${z.detail} (vendor coordinates missing)`,
      });
    }
  } else {
    const z = zipProximityPoints(shopperZip5, v.zip);
    lines.push({ key: 'zip', label: 'ZIP proximity vs shopper', points: z.points, detail: z.detail });
  }

  const o = orderVolumePoints(metrics.orders30d);
  lines.push({ key: 'orders', label: `Order volume (${ORDERS_WINDOW_DAYS}d)`, points: o.points, detail: o.detail });

  const t = treeEngagementPoints(metrics.treeImpressions7d, metrics.treeClicks7d);
  lines.push({ key: 'tree_engagement', label: `Tree engagement (${ENGAGEMENT_WINDOW_DAYS}d)`, points: t.points, detail: t.detail });

  const q = listingQualityPoints(v);
  lines.push(...q.lines);

  const d = dailyRotationPoints(v.id, marketId, dateKeyUtc);
  lines.push({ key: 'daily_rotation', label: 'Daily rotation / tie-break', points: d.points, detail: d.detail });

  const total = lines.reduce((s, l) => s + l.points, 0);
  return { total, lines };
}

export async function batchLoadSmokersClubRankingMetrics(
  client: SupabaseClient,
  vendorIds: string[]
): Promise<Map<string, SmokersClubRankingMetrics>> {
  const out = new Map<string, SmokersClubRankingMetrics>();
  const unique = Array.from(new Set(vendorIds.filter(Boolean)));
  for (const id of unique) {
    out.set(id, { orders30d: 0, treeImpressions7d: 0, treeClicks7d: 0 });
  }
  if (unique.length === 0) return out;

  const sinceOrders = new Date();
  sinceOrders.setUTCDate(sinceOrders.getUTCDate() - ORDERS_WINDOW_DAYS);
  const sinceEng = new Date();
  sinceEng.setUTCDate(sinceEng.getUTCDate() - ENGAGEMENT_WINDOW_DAYS);

  const [ordRes, engRes] = await Promise.all([
    client.rpc('smokers_club_order_counts_for_vendors', {
      p_vendor_ids: unique,
      p_since: sinceOrders.toISOString(),
    }),
    client.rpc('smokers_club_tree_engagement_for_vendors', {
      p_vendor_ids: unique,
      p_since: sinceEng.toISOString(),
    }),
  ]);

  if (!ordRes.error && Array.isArray(ordRes.data)) {
    for (const row of ordRes.data as { vendor_id: string; cnt: number | string }[]) {
      const id = row.vendor_id;
      const cur = out.get(id);
      if (!cur) continue;
      cur.orders30d = Number(row.cnt) || 0;
    }
  }

  if (!engRes.error && Array.isArray(engRes.data)) {
    for (const row of engRes.data as { vendor_id: string; impressions: number | string; clicks: number | string }[]) {
      const id = row.vendor_id;
      const cur = out.get(id);
      if (!cur) continue;
      cur.treeImpressions7d = Number(row.impressions) || 0;
      cur.treeClicks7d = Number(row.clicks) || 0;
    }
  }

  return out;
}
