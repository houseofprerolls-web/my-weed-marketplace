import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { vendorRowToPublicCard, type PublicVendorCard } from '@/lib/vendorDeliveryList';

/** Slugs from `supabase/sql/run_now/07_test_vendors_greenhaven_flexotic.sql` */
export const SMOKERS_TEST_SLUG_RANK_1 = 'greenhaven';
export const SMOKERS_TEST_SLUG_RANK_2 = 'flexotic';

/**
 * Pin GreenHaven + Flexotic as #1 and #2 for QA. Set to false before a production launch
 * or override with NEXT_PUBLIC_SMOKERS_TEST_RANK_PINS=0.
 */
export function smokersTestRankPinsEnabled(): boolean {
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

/** Merge treehouse rank map so test vendors sort as #1 and #2 on Discover / best-match. */
export function mergeDiscoverTreehouseTestPins(rankMap: Map<string, number>, vendors: { id: string; slug?: string }[]) {
  if (!smokersTestRankPinsEnabled() || !isVendorsSchema()) return rankMap;
  const s1 = slug1();
  const s2 = slug2();
  const a = vendors.find((v) => (v.slug || '').toLowerCase() === s1);
  const b = vendors.find((v) => (v.slug || '').toLowerCase() === s2);
  const next = new Map(rankMap);
  if (a) next.set(a.id, 1);
  if (b) next.set(b.id, 2);
  return next;
}

async function loadCardBySlug(slug: string): Promise<PublicVendorCard | null> {
  if (!isVendorsSchema()) return null;
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (!row.is_live || String(row.license_status) !== 'approved') return null;
  return vendorRowToPublicCard(row, 0);
}

/**
 * Force slots 0–1 on the homepage tree to the two test dispensaries when present in DB.
 */
export async function applySmokersClubTestPins(
  row: (PublicVendorCard | null)[],
  candidates: PublicVendorCard[]
): Promise<(PublicVendorCard | null)[]> {
  if (!smokersTestRankPinsEnabled() || !isVendorsSchema()) return row;

  const s1 = slug1();
  const s2 = slug2();
  let v1 = candidates.find((v) => v.slug.toLowerCase() === s1) ?? null;
  let v2 = candidates.find((v) => v.slug.toLowerCase() === s2) ?? null;
  if (!v1) v1 = await loadCardBySlug(s1);
  if (!v2) v2 = await loadCardBySlug(s2);
  if (!v1 || !v2) return row;

  const next = [...row];
  const clearId = (id: string) => {
    for (let i = 0; i < next.length; i++) {
      if (next[i]?.id === id) next[i] = null;
    }
  };
  clearId(v1.id);
  clearId(v2.id);
  next[0] = v1;
  next[1] = v2;
  return next;
}
