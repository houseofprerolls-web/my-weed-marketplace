import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { zipPrefix3 } from '@/lib/zipUtils';

export type ListingMarket = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  /** DB column from listing_markets: ca | ny | future regions */
  region_key?: string | null;
};

/** Resolve listing_markets row from a 5-digit ZIP (uses market_zip_prefixes). */
export async function getMarketForZip5(
  zip5: string | null,
  db: SupabaseClient = supabase
): Promise<ListingMarket | null> {
  const pref = zipPrefix3(zip5 || '');
  if (!pref) return null;

  const { data: row, error } = await db
    .from('market_zip_prefixes')
    .select('market_id')
    .eq('prefix', pref)
    .maybeSingle();

  if (error || !row?.market_id) return null;

  const { data: m, error: mErr } = await db
    .from('listing_markets')
    .select('id, slug, name, subtitle, region_key')
    .eq('id', row.market_id)
    .maybeSingle();

  if (mErr || !m) return null;
  return m as ListingMarket;
}

export async function getZipPrefixesForMarket(marketId: string): Promise<string[]> {
  const { data, error } = await supabase.from('market_zip_prefixes').select('prefix').eq('market_id', marketId);

  if (error || !data) return [];
  return data.map((r) => r.prefix as string);
}

/**
 * Which `listing_markets` row drives admin Smokers Club slots for this shopper ZIP.
 * Unmapped prefixes use `california-other`. Returns null if ZIP is missing/invalid.
 */
export async function getMarketForSmokersClub(
  zip5: string | null,
  db: SupabaseClient = supabase
): Promise<ListingMarket | null> {
  const z = zip5 && zip5.length === 5 ? zip5 : null;
  if (!z) return null;

  const mapped = await getMarketForZip5(z, db);
  if (mapped) return mapped;

  const pref = zipPrefix3(z);
  if (pref && /^[0-9]{3}$/.test(pref)) {
    const n = parseInt(pref, 10);
    if (n >= 100 && n <= 149) {
      const { data: ny, error: nyErr } = await db
        .from('listing_markets')
        .select('id, slug, name, subtitle, region_key')
        .eq('slug', 'new-york')
        .maybeSingle();
      if (!nyErr && ny) return ny as ListingMarket;
    }
  }

  const { data, error } = await db
    .from('listing_markets')
    .select('id, slug, name, subtitle, region_key')
    .eq('slug', 'california-other')
    .maybeSingle();

  if (error || !data) return null;
  return data as ListingMarket;
}

/** Coarse state/region for homepage banners (`listing_markets.region_key`, e.g. ca | ny). ZIP only narrows to state, not a single sub-market. */
export async function regionKeyForShopperZip5(
  zip5: string | null,
  db: SupabaseClient = supabase
): Promise<string | null> {
  const z = zip5 && zip5.length === 5 ? zip5 : null;
  if (!z) return null;
  const m = await getMarketForSmokersClub(z, db);
  const rk = m?.region_key?.trim().toLowerCase();
  return rk || null;
}
