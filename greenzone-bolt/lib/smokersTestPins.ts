import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isPublicLaunchVendorAllowlistActive } from '@/lib/launchPublicSurface';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { vendorRowToPublicCard, type PublicVendorCard } from '@/lib/vendorDeliveryList';
import { vendorPremiseListingMarketAlignsWithShopper } from '@/lib/listingMarketSlugFromZip5';
import type { SmokersClubShopperAnchor } from '@/lib/smokersClubShopperAnchor';
import type { VendorShopperAreaGateCtx } from '@/lib/vendorShopperArea';
import { vendorEligibleForSmokersClubPinAtAnchor } from '@/lib/smokersClubRadius';

/** Slugs from `supabase/sql/run_now/07_test_vendors_greenhaven_flexotic.sql` */
export const SMOKERS_TEST_SLUG_RANK_1 = 'greenhaven';
export const SMOKERS_TEST_SLUG_RANK_2 = 'flexotic';

/**
 * Pin GreenHaven + Flexotic as #1 and #2 for QA. Disabled when `NEXT_PUBLIC_LAUNCH_VENDOR_SLUGS` is set
 * (soft launch). Otherwise off if `NEXT_PUBLIC_SMOKERS_TEST_RANK_PINS=0`, on if `=1`, default on for local QA.
 */
export function smokersTestRankPinsEnabled(): boolean {
  if (isPublicLaunchVendorAllowlistActive()) return false;
  if (process.env.NEXT_PUBLIC_SMOKERS_TEST_RANK_PINS === '0') return false;
  if (process.env.NEXT_PUBLIC_SMOKERS_TEST_RANK_PINS === '1') return true;
  return true;
}

function slug1(): string {
  return (process.env.NEXT_PUBLIC_SMOKERS_TEST_SLUG_1 || SMOKERS_TEST_SLUG_RANK_1).trim();
}

function slug2(): string {
  return (process.env.NEXT_PUBLIC_SMOKERS_TEST_SLUG_2 || SMOKERS_TEST_SLUG_RANK_2).trim();
}

/** Merge discover priority map so test vendors sort ahead of other tree placements on Discover / best-match. */
export function mergeDiscoverTreehouseTestPins(
  rankMap: Map<string, number>,
  vendors: { id: string; slug?: string }[],
  vendorsSchema: boolean
) {
  if (isPublicLaunchVendorAllowlistActive() || !smokersTestRankPinsEnabled() || !vendorsSchema) return rankMap;
  const s1 = slug1();
  const s2 = slug2();
  const a = vendors.find((v) => (v.slug || '').toLowerCase() === s1);
  const b = vendors.find((v) => (v.slug || '').toLowerCase() === s2);
  const next = new Map(rankMap);
  if (a) next.set(a.id, 1);
  if (b) next.set(b.id, 2);
  return next;
}

async function loadCardBySlug(
  slug: string,
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase
): Promise<PublicVendorCard | null> {
  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (!useVendors) return null;
  const { data, error } = await client
    .from('vendors')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (!row.is_live || String(row.license_status) !== 'approved' || row.billing_delinquent === true) return null;
  return vendorRowToPublicCard(row, 0);
}

/**
 * QA test pins follow the same **15 mi + delivery-ZIP** rule as admin pins when shopper geo is on; else legacy ZIP market alignment.
 */
function testPinAllowed(
  v: PublicVendorCard,
  shopper: SmokersClubShopperAnchor,
  vendorIdsServingShopperZip?: ReadonlySet<string> | undefined
): boolean {
  const z = shopper.zip5 && shopper.zip5.length === 5 ? shopper.zip5 : null;
  if (!z) return false;
  const gateCtx: VendorShopperAreaGateCtx = {
    shopperZip5: z,
    vendorIdsServingShopperZip,
  };
  if (shopper.geoMode && shopper.latLng) {
    return vendorEligibleForSmokersClubPinAtAnchor(v, new Set(), gateCtx, shopper.latLng, true);
  }
  if (vendorIdsServingShopperZip?.has(v.id)) return true;
  return vendorPremiseListingMarketAlignsWithShopper(z, v.zip);
}

export async function applySmokersClubTestPins(
  row: (PublicVendorCard | null)[],
  candidates: PublicVendorCard[],
  vendorsSchema?: boolean,
  client: SupabaseClient = supabase,
  shopper?: SmokersClubShopperAnchor,
  vendorIdsServingShopperZip?: ReadonlySet<string>
): Promise<(PublicVendorCard | null)[]> {
  const useVendors = vendorsSchema ?? resolveUseVendorsTableForDiscovery();
  if (isPublicLaunchVendorAllowlistActive() || !smokersTestRankPinsEnabled() || !useVendors) return row;
  if (!shopper?.zip5 || shopper.zip5.length !== 5) return row;

  const s1 = slug1();
  const s2 = slug2();
  let v1 = candidates.find((v) => v.slug.toLowerCase() === s1) ?? null;
  let v2 = candidates.find((v) => v.slug.toLowerCase() === s2) ?? null;
  if (!v1) v1 = await loadCardBySlug(s1, useVendors, client);
  if (!v2) v2 = await loadCardBySlug(s2, useVendors, client);
  if (!v1 || !v2) return row;
  if (!testPinAllowed(v1, shopper, vendorIdsServingShopperZip) || !testPinAllowed(v2, shopper, vendorIdsServingShopperZip)) {
    return row;
  }

  const next = [...row];
  const clearId = (id: string) => {
    for (let i = 0; i < next.length; i++) {
      if (next[i]?.id === id) next[i] = null;
    }
  };
  clearId(v1.id);
  clearId(v2.id);
  next[0] = { ...v1, order_count: 0 };
  next[1] = { ...v2, order_count: 0 };
  return next;
}
