import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { extractZip5, zipProximityRank } from '@/lib/zipUtils';
import { publicVendorDisplayName, resolveSocialEquityBadgeVisible } from '@/lib/vendorDisplayName';
import { vendorSlugAllowedForPublicLaunch } from '@/lib/launchPublicSurface';
import { resolvePublicVendorServiceModes } from '@/lib/vendorStorefrontDelivery';

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export type PublicVendorCard = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  /** Premise coordinates when present on `vendors` (Smokers Club radius / trophies / discover). */
  geo_lat?: number | null;
  geo_lng?: number | null;
  /** Extra pins from `vendor_locations` when merged for radius / trophies. */
  map_geo_extra_points?: ReadonlyArray<{ lat: number; lng: number }> | null;
  phone: string | null;
  website: string | null;
  is_live: boolean;
  license_status: string;
  order_count: number;
  /** Effective delivery lane after address / dual‑lane rules (`resolvePublicVendorServiceModes`). */
  offers_delivery: boolean;
  /** Effective storefront lane after address / dual‑lane rules. */
  offers_storefront: boolean;
  /** Admin opt-in for Smokers Club (homepage treehouse) */
  smokers_club_eligible: boolean;
  /**
   * When present (e.g. homepage tree), spotlight trophy 1–3 = ZIP-closest on-tree picks (gold/silver/bronze).
   * Not tied to visual slot index.
   */
  smokers_club_trophy?: 1 | 2 | 3;
  /** Full-bleed card backdrop on Smokers Club tree (separate from logo). */
  smokers_club_tab_background_url?: string | null;
  /** Social equity program — show badge; name should not include equity retailer text. */
  social_equity_badge_visible?: boolean;
};

export function vendorRowToPublicCard(
  v: Record<string, unknown>,
  orderCount: number
): PublicVendorCard {
  const rawName = String(v.name ?? '');
  const modes = resolvePublicVendorServiceModes({
    address: typeof v.address === 'string' ? v.address : null,
    city: typeof v.city === 'string' ? v.city : null,
    state: typeof v.state === 'string' ? v.state : null,
    zip: typeof v.zip === 'string' ? v.zip : null,
    offers_delivery: v.offers_delivery as boolean | null | undefined,
    offers_storefront: v.offers_storefront as boolean | null | undefined,
    allow_both_storefront_and_delivery: v.allow_both_storefront_and_delivery as boolean | null | undefined,
    admin_service_mode: typeof v.admin_service_mode === 'string' ? v.admin_service_mode : null,
  });
  return {
    id: v.id as string,
    name: publicVendorDisplayName(rawName),
    slug: String(v.slug ?? ''),
    logo_url: (v.logo_url as string | null) ?? null,
    banner_url: (v.banner_url as string | null) ?? null,
    description: (v.description as string | null) ?? null,
    city: (v.city as string | null) ?? null,
    state: (v.state as string | null) ?? null,
    zip: (v.zip as string | null) ?? null,
    geo_lat: numOrNull(v.geo_lat),
    geo_lng: numOrNull(v.geo_lng),
    phone: (v.phone as string | null) ?? null,
    website: (v.website as string | null) ?? null,
    is_live: Boolean(v.is_live),
    license_status: String(v.license_status ?? ''),
    order_count: orderCount,
    offers_delivery: modes.offers_delivery,
    offers_storefront: modes.offers_storefront,
    smokers_club_eligible: v.smokers_club_eligible === true,
    smokers_club_tab_background_url: (v.smokers_club_tab_background_url as string | null) ?? null,
    social_equity_badge_visible: resolveSocialEquityBadgeVisible(
      rawName,
      v.social_equity_badge_visible === true
    ),
  };
}

const VENDOR_DIRECTORY_CARD_SELECT =
  'id,name,slug,logo_url,banner_url,description,address,city,state,zip,geo_lat,geo_lng,phone,website,is_live,license_status,offers_delivery,offers_storefront,allow_both_storefront_and_delivery,admin_service_mode,smokers_club_eligible,smokers_club_tab_background_url,social_equity_badge_visible';

async function fetchOrderCounts(client: SupabaseClient = supabase): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await client.from('orders').select('vendor_id');
  if (error || !data) return map;
  for (const row of data as { vendor_id: string }[]) {
    const id = row.vendor_id;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

/** Batch-load public cards for vendor IDs (live + license approved). */
export async function fetchPublicVendorCardsByIds(
  ids: string[],
  options?: { includeOrderCounts?: boolean; vendorsSchema?: boolean; client?: SupabaseClient }
): Promise<Map<string, PublicVendorCard>> {
  const out = new Map<string, PublicVendorCard>();
  const useVendors = options?.vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors || ids.length === 0) return out;

  const includeOrderCounts = options?.includeOrderCounts !== false;
  const client = options?.client ?? supabase;

  const unique = Array.from(new Set(ids));
  const { data, error } = await client
    .from('vendors')
    .select('*')
    .in('id', unique)
    .eq('is_live', true)
    .eq('license_status', 'approved')
    .eq('billing_delinquent', false);

  if (error) {
    console.warn('fetchPublicVendorCardsByIds:', error.message);
    return out;
  }

  const counts = includeOrderCounts ? await fetchOrderCounts(client) : new Map<string, number>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const id = row.id as string;
    out.set(id, vendorRowToPublicCard(row, counts.get(id) || 0));
  }
  return out;
}

/** Live + approved vendors for CannaHub directory (delivery services and storefronts). */
export async function fetchLiveVendorsForDirectory(userZipHint: string | null): Promise<PublicVendorCard[]> {
  if (!resolveUseVendorsTableForDiscovery()) return [];

  const zip5 = extractZip5(userZipHint || '');

  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_DIRECTORY_CARD_SELECT)
    .eq('is_live', true)
    .eq('license_status', 'approved')
    .order('name');

  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];

  /** Full `orders` scan was dominating homepage TTFB; ZIP + name sort is enough for directory cards. */
  const cards: PublicVendorCard[] = rows.map((v) => vendorRowToPublicCard(v, 0));

  cards.sort((a, b) => {
    const ra = zipProximityRank(zip5, a.zip);
    const rb = zipProximityRank(zip5, b.zip);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return cards.filter((c) => vendorSlugAllowedForPublicLaunch(c.slug));
}

/** Live approved vendors opted into Smokers Club (any region; sorted by shopper ZIP). */
export async function fetchLiveVendorsForSmokersClub(
  userZipHint: string | null,
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase
): Promise<PublicVendorCard[]> {
  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors) return [];

  const zip5 = extractZip5(userZipHint || '');

  const { data, error } = await client
    .from('vendors')
    .select('*')
    .eq('is_live', true)
    .eq('license_status', 'approved')
    .eq('billing_delinquent', false)
    .eq('smokers_club_eligible', true)
    .order('name');

  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];
  /** Full `orders` scan is too slow for the homepage; ZIP + name sort is enough here. */
  const cards: PublicVendorCard[] = rows.map((v) => ({
    ...vendorRowToPublicCard(v, 0),
    smokers_club_eligible: true,
  }));

  cards.sort((a, b) => {
    const ra = zipProximityRank(zip5, a.zip);
    const rb = zipProximityRank(zip5, b.zip);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  return cards.filter((c) => vendorSlugAllowedForPublicLaunch(c.slug));
}
