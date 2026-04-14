import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { extractZip5, zipProximityRank } from '@/lib/zipUtils';

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
  phone: string | null;
  website: string | null;
  is_live: boolean;
  license_status: string;
  order_count: number;
  /** false only when `offers_delivery` is explicitly false in DB */
  offers_delivery: boolean;
  /** false only when `offers_storefront` is explicitly false in DB */
  offers_storefront: boolean;
  /** Admin opt-in for Smokers Club (homepage treehouse) */
  smokers_club_eligible: boolean;
};

export function vendorRowToPublicCard(
  v: Record<string, unknown>,
  orderCount: number
): PublicVendorCard {
  return {
    id: v.id as string,
    name: String(v.name ?? ''),
    slug: String(v.slug ?? ''),
    logo_url: (v.logo_url as string | null) ?? null,
    banner_url: (v.banner_url as string | null) ?? null,
    description: (v.description as string | null) ?? null,
    city: (v.city as string | null) ?? null,
    state: (v.state as string | null) ?? null,
    zip: (v.zip as string | null) ?? null,
    phone: (v.phone as string | null) ?? null,
    website: (v.website as string | null) ?? null,
    is_live: Boolean(v.is_live),
    license_status: String(v.license_status ?? ''),
    order_count: orderCount,
    offers_delivery: (v.offers_delivery as boolean | undefined) !== false,
    offers_storefront: (v.offers_storefront as boolean | undefined) !== false,
    smokers_club_eligible: v.smokers_club_eligible === true,
  };
}

async function fetchOrderCounts(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase.from('orders').select('vendor_id');
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
  options?: { includeOrderCounts?: boolean }
): Promise<Map<string, PublicVendorCard>> {
  const out = new Map<string, PublicVendorCard>();
  if (!isVendorsSchema() || ids.length === 0) return out;

  const includeOrderCounts = options?.includeOrderCounts !== false;

  const unique = Array.from(new Set(ids));
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .in('id', unique)
    .eq('is_live', true)
    .eq('license_status', 'approved');

  if (error) {
    console.warn('fetchPublicVendorCardsByIds:', error.message);
    return out;
  }

  const counts = includeOrderCounts ? await fetchOrderCounts() : new Map<string, number>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const id = row.id as string;
    out.set(id, vendorRowToPublicCard(row, counts.get(id) || 0));
  }
  return out;
}

/** Live + approved vendors for CannaHub directory (delivery services and storefronts). */
export async function fetchLiveVendorsForDirectory(userZipHint: string | null): Promise<PublicVendorCard[]> {
  if (!isVendorsSchema()) return [];

  const zip5 = extractZip5(userZipHint || '');

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_live', true)
    .eq('license_status', 'approved')
    .order('name');

  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];

  const counts = await fetchOrderCounts();

  const cards: PublicVendorCard[] = rows.map((v) =>
    vendorRowToPublicCard(v, counts.get(v.id as string) || 0)
  );

  cards.sort((a, b) => {
    const ra = zipProximityRank(zip5, a.zip);
    const rb = zipProximityRank(zip5, b.zip);
    if (ra !== rb) return ra - rb;
    if (b.order_count !== a.order_count) return b.order_count - a.order_count;
    return a.name.localeCompare(b.name);
  });

  return cards;
}

/** Live approved vendors opted into Smokers Club (any region; sorted by shopper ZIP). */
export async function fetchLiveVendorsForSmokersClub(userZipHint: string | null): Promise<PublicVendorCard[]> {
  if (!isVendorsSchema()) return [];

  const zip5 = extractZip5(userZipHint || '');

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_live', true)
    .eq('license_status', 'approved')
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
    if (b.order_count !== a.order_count) return b.order_count - a.order_count;
    return a.name.localeCompare(b.name);
  });

  return cards;
}
