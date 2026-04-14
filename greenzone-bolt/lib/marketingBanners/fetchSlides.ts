import type { SupabaseClient } from '@supabase/supabase-js';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { listingHrefForVendor } from '@/lib/listingPath';
import type { SiteBannerRow } from '@/lib/siteBanners';
import { resolveMarketingBannerImageUrl } from '@/lib/marketingBanners/imageUrl';
import { pickBannersForShopperListingMarket } from '@/lib/marketingBanners/regionPick';
import { MARKETING_BANNER_SLIDES_TABLE } from '@/lib/marketingBanners/table';
import {
  MARKETING_SLIDE_SELECT_BASE,
  MARKETING_SLIDE_SELECT_FULL,
  isMissingCreativeFormatColumnError,
} from '@/lib/marketingBanners/slideSchema';

/**
 * Server-only fetch for public marketing slides. Caller supplies Supabase client (service role preferred).
 */
export async function fetchMarketingBannerSlides(
  placementKey: string,
  opts: { shopperZip5?: string | null; supabaseClient: SupabaseClient }
): Promise<SiteBannerRow[]> {
  const db = opts.supabaseClient;
  const zip = opts.shopperZip5 && opts.shopperZip5.length === 5 ? opts.shopperZip5 : null;
  const shopperMarket = zip ? await getMarketForSmokersClub(zip, db) : null;
  const shopperListingMarketId = shopperMarket?.id ?? null;

  const runSelect = (cols: string) =>
    db
      .from(MARKETING_BANNER_SLIDES_TABLE)
      .select(cols)
      .eq('status', 'active')
      .eq('placement_key', placementKey)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

  let { data, error } = await runSelect(MARKETING_SLIDE_SELECT_FULL);
  if (error && isMissingCreativeFormatColumnError(error)) {
    ({ data, error } = await runSelect(MARKETING_SLIDE_SELECT_BASE));
  }

  if (error) {
    console.warn('marketing banners:', error.message);
    return [];
  }

  const raw = ((data ?? []) as unknown as SiteBannerRow[]).map((r) => ({
    ...r,
    creative_format: r.creative_format ?? 'leaderboard',
  }));
  const rows = pickBannersForShopperListingMarket(raw, shopperListingMarketId);
  const vendorIds = Array.from(
    new Set(rows.map((r) => r.vendor_id).filter((id): id is string => typeof id === 'string' && id.length > 0))
  );

  const withUrls = (list: SiteBannerRow[]) =>
    list.map((r) => ({ ...r, image_url: resolveMarketingBannerImageUrl(r.image_url) }));

  if (vendorIds.length === 0) return withUrls(rows);

  const { data: vrows, error: vErr } = await db
    .from('vendors')
    .select('id,slug,license_number,billing_delinquent')
    .in('id', vendorIds);
  if (vErr || !vrows?.length) return withUrls(rows);

  const delinquentIds = new Set<string>();
  const slugById = new Map<string, string>();
  const licenseById = new Map<string, string | null>();
  for (const v of vrows as {
    id: string;
    slug: string | null;
    license_number: string | null;
    billing_delinquent?: boolean | null;
  }[]) {
    if (v.billing_delinquent === true) delinquentIds.add(v.id);
    const s = typeof v.slug === 'string' && v.slug.trim() ? v.slug.trim() : '';
    if (s) slugById.set(v.id, s);
    const lic = typeof v.license_number === 'string' && v.license_number.trim() ? v.license_number.trim() : null;
    licenseById.set(v.id, lic);
  }
  return withUrls(
    rows
      .filter((r) => !r.vendor_id || !delinquentIds.has(r.vendor_id))
      .map((r) => {
        if (!r.vendor_id) return r;
        const next: SiteBannerRow = { ...r };
        if (slugById.has(r.vendor_id)) {
          next.vendor_slug = slugById.get(r.vendor_id) ?? null;
        }
        const lic = licenseById.get(r.vendor_id);
        if (lic) next.advertiser_license_number = lic;
        return next;
      })
  );
}
