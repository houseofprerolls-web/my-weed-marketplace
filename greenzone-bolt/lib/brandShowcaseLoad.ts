import type { SupabaseClient } from '@supabase/supabase-js';
import { isBrandPageThemeId, type BrandPageThemeId } from '@/lib/brandShowcaseThemes';

export type BrandShowcaseTheme = BrandPageThemeId;

export type BrandShowcaseBrand = {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  logo_url: string | null;
  tagline: string | null;
  about: string | null;
  website_url: string | null;
  social_instagram: string | null;
  hero_image_url: string | null;
  page_theme: BrandShowcaseTheme;
};

export type BrandShowcaseCatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  images: string[] | null;
  strain_id: string | null;
  potency_thc: number | null;
  potency_cbd: number | null;
};

export type BrandShowcaseRetailer = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  productCount: number;
};

export type BrandShowcaseData = {
  brand: BrandShowcaseBrand;
  catalog: BrandShowcaseCatalogItem[];
  retailers: BrandShowcaseRetailer[];
};

function normalizeTheme(raw: string | null | undefined): BrandShowcaseTheme {
  const t = String(raw || '').trim().toLowerCase();
  return isBrandPageThemeId(t) ? t : 'emerald';
}

function isPublicVendor(v: {
  is_live?: boolean | null;
  license_status?: string | null;
  billing_delinquent?: boolean | null;
}): boolean {
  return (
    Boolean(v.is_live) &&
    String(v.license_status || '').trim().toLowerCase() === 'approved' &&
    v.billing_delinquent !== true
  );
}

/**
 * Loads verified brand + master catalog (service role) + deduped live retailers carrying the brand
 * (products.brand_id or brand_display_name match).
 */
export async function loadBrandShowcase(
  client: SupabaseClient,
  slug: string
): Promise<BrandShowcaseData | null> {
  const s = decodeURIComponent(String(slug || '').trim());
  if (!s) return null;

  const { data: b, error: bErr } = await client
    .from('brands')
    .select(
      'id,name,slug,verified,logo_url,tagline,about,website_url,social_instagram,hero_image_url,page_theme'
    )
    .eq('slug', s)
    .eq('verified', true)
    .maybeSingle();

  if (bErr || !b) return null;

  const brand: BrandShowcaseBrand = {
    id: b.id,
    name: b.name,
    slug: b.slug,
    verified: Boolean(b.verified),
    logo_url: b.logo_url ?? null,
    tagline: b.tagline ?? null,
    about: b.about ?? null,
    website_url: b.website_url ?? null,
    social_instagram: b.social_instagram ?? null,
    hero_image_url: b.hero_image_url ?? null,
    page_theme: normalizeTheme(b.page_theme),
  };

  const { data: catalogRows } = await client
    .from('catalog_products')
    .select('id,name,category,description,images,strain_id,potency_thc,potency_cbd')
    .eq('brand_id', brand.id)
    .order('name')
    .limit(240);

  const catalog = (catalogRows || []) as BrandShowcaseCatalogItem[];

  const vendorCountMap = new Map<string, number>();

  const addVendorRows = (rows: { vendor_id: string }[] | null) => {
    for (const r of rows || []) {
      const id = r.vendor_id;
      if (!id) continue;
      vendorCountMap.set(id, (vendorCountMap.get(id) ?? 0) + 1);
    }
  };

  const { data: byBrandFk } = await client
    .from('products')
    .select('vendor_id')
    .eq('brand_id', brand.id)
    .eq('in_stock', true);

  addVendorRows(byBrandFk as { vendor_id: string }[] | null);

  const { data: byDisplay } = await client
    .from('products')
    .select('vendor_id')
    .is('brand_id', null)
    .ilike('brand_display_name', brand.name)
    .eq('in_stock', true);

  addVendorRows(byDisplay as { vendor_id: string }[] | null);

  const vendorIds = Array.from(vendorCountMap.keys());
  let retailers: BrandShowcaseRetailer[] = [];

  if (vendorIds.length) {
    const { data: vrows } = await client
      .from('vendors')
      .select('id,name,slug,logo_url,is_live,license_status,billing_delinquent')
      .in('id', vendorIds);

    retailers = (vrows || [])
      .filter((v) => isPublicVendor(v))
      .map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug ?? null,
        logo_url: v.logo_url ?? null,
        productCount: vendorCountMap.get(v.id) ?? 0,
      }))
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
  }

  return { brand, catalog, retailers };
}
