'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Truck, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchDiscoveryVendorsPayload, type DiscoveryVendor } from '@/lib/publicVendors';
import { fetchVendorCoordsById, fetchVendorIdsServingZip5 } from '@/lib/discoverMarketData';
import { haversineKm } from '@/lib/discoverSort';
import { mapCenterForCaZipOrDefault } from '@/lib/mapCoordinates';
import { readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import {
  dbCategoriesForSlug,
  milesFromKm,
  productMatchesSmokersClubCategory,
  resolveSmokersClubCategorySlug,
  SMOKERS_CLUB_CATEGORY_IMAGE_PATHS,
  SMOKERS_CLUB_CATEGORY_LABELS,
  SMOKERS_CLUB_CATEGORY_SLUGS,
  SMOKERS_CLUB_DELIVERY_RADIUS_MI,
  SMOKERS_CLUB_PICKUP_RADIUS_MI,
  type SmokersClubCategorySlug,
} from '@/lib/smokersClubCategory';
import { Button } from '@/components/ui/button';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { publicVendorDisplayName } from '@/lib/vendorDisplayName';
import { VendorSkuCardFrame } from '@/components/vendor/VendorSkuCardFrame';
import {
  resolveSkuCardTheme,
  resolveStoreListingCardTheme,
  type ResolvedSkuCardTheme,
} from '@/lib/vendorSkuCardTheme';
import { effectiveSalePriceCents } from '@/lib/productSalePrice';
import { listingHrefForVendor } from '@/lib/listingPath';
import { publicDispensarySurfaceVisible } from '@/lib/publicDispensaryVisibility';

type RpcBestseller = {
  vendor_id: string;
  product_id: string;
  units_ordered: number;
};

type ProductRow = {
  id: string;
  vendor_id: string;
  category: string;
  name: string;
  images: string[] | null;
  price_cents: number;
  potency_cbd?: number | null;
  sale_discount_percent?: number | null;
};

type VendorMedia = { id: string; slug?: string | null; banner_url: string | null; logo_url: string | null };

type NearStoreRow = {
  vendorId: string;
  vendorSlug?: string | null;
  name: string;
  socialEquity: boolean;
  thumb: string | null;
  logo: string | null;
  website: string | null;
  rating: number;
  reviewCount: number;
  typeCount: number;
  miles: number;
  cardTheme: ResolvedSkuCardTheme;
};

type NearbySkuRow = {
  product: ProductRow;
  vendorId: string;
  vendorSlug?: string | null;
  vendorName: string;
  miles: number | null;
  /** Shown under price on category cards (e.g. bestseller units). */
  detailLine?: string | null;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const PREVIEW_BESTSELLER_SKUS = 10;
const PREVIEW_ON_SALE_SKUS = 10;
const PREVIEW_BROWSE_SKUS = 12;
const PREVIEW_STORE_STRIP = 8;

function SkuPriceLines({ product }: { product: ProductRow }) {
  const sale = effectiveSalePriceCents(product.price_cents, product.sale_discount_percent);
  const pct = product.sale_discount_percent;
  if (sale == null || pct == null) {
    return <p className="text-sm font-semibold text-brand-lime-soft">{formatPrice(product.price_cents)}</p>;
  }
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-brand-lime-soft">{formatPrice(sale)}</p>
      <p className="text-xs text-zinc-500 line-through">{formatPrice(product.price_cents)}</p>
      <p className="text-[10px] font-medium text-red-400/90">{pct}% off</p>
    </div>
  );
}

function firstImage(images: string[] | null | undefined): string | null {
  if (!images || !Array.isArray(images)) return null;
  const u = images.find((x) => typeof x === 'string' && x.trim() !== '');
  return u ?? null;
}

function SkuStoreFooter({ vendorName, miles }: { vendorName: string; miles: number | null }) {
  return (
    <div className="border-t border-white/10 bg-black/30 px-2.5 py-2">
      <p className="line-clamp-1 text-xs font-medium text-zinc-100">{vendorName}</p>
      <p className="text-[11px] text-zinc-500">
        {miles != null
          ? `${miles.toFixed(1)} mi away`
          : 'Distance unavailable — set ZIP in the header or allow location'}
      </p>
    </div>
  );
}

function sectionShellClass() {
  return 'rounded-2xl border border-white/[0.08] bg-zinc-950/50 p-4 shadow-sm shadow-black/20 sm:p-5';
}

function CategoryPageSkeleton() {
  const block = 'rounded-xl bg-zinc-900/80 animate-pulse';
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading category">
      <div className={`${sectionShellClass()} space-y-3`}>
        <div className={`h-4 w-28 ${block}`} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-36 ${block}`} />
          ))}
        </div>
      </div>
      <div className={`${sectionShellClass()} space-y-3`}>
        <div className={`h-4 w-40 ${block}`} />
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-48 w-[200px] shrink-0 ${block}`} />
          ))}
        </div>
      </div>
      <div className={`${sectionShellClass()} space-y-3`}>
        <div className={`h-4 w-32 ${block}`} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-36 ${block}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategorySkuCardGrid({
  rows,
  skuCardThemes,
  limit,
  showAll,
  onToggleShowAll,
}: {
  rows: NearbySkuRow[];
  skuCardThemes: Record<string, ResolvedSkuCardTheme>;
  limit: number;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const over = rows.length > limit;
  const list = showAll || !over ? rows : rows.slice(0, limit);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 lg:gap-4">
        {list.map(({ product, vendorId, vendorSlug, vendorName, miles, detailLine }) => (
          <Link
            key={`${vendorId}-${product.id}`}
            href={listingHrefForVendor({ id: vendorId, slug: vendorSlug })}
            className="block h-full min-h-0 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <VendorSkuCardFrame
              theme={skuCardThemes[vendorId] ?? resolveSkuCardTheme(null)}
              className="flex h-full flex-col overflow-hidden transition-colors duration-200 hover:border-brand-red/50 hover:shadow-lg hover:shadow-black/30"
            >
              <div className="flex flex-1 gap-2.5 p-2 sm:gap-3 sm:p-2.5">
                <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-zinc-900 sm:h-[5rem] sm:w-[5rem]">
                  {firstImage(product.images) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstImage(product.images)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">No img</div>
                  )}
                </div>
                <div className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-center gap-1 sm:min-h-[5rem]">
                  <p className="line-clamp-2 text-left text-sm font-medium leading-snug text-white">{product.name}</p>
                  <SkuPriceLines product={product} />
                  {detailLine ? <p className="text-[10px] text-zinc-500">{detailLine}</p> : null}
                </div>
              </div>
              <SkuStoreFooter vendorName={vendorName} miles={miles} />
            </VendorSkuCardFrame>
          </Link>
        ))}
      </div>
      {over ? (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 text-zinc-200 hover:bg-white/10 hover:text-white"
            onClick={onToggleShowAll}
          >
            {showAll ? 'Show less' : `View all (${rows.length} SKUs)`}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** PostgREST URLs blow up with huge `.in()` lists — keep chunks small. */
const VENDOR_ID_IN_CHUNK = 80;

const VENDOR_MEDIA_SELECT =
  'id,slug,name,banner_url,logo_url,website,sku_card_preset,sku_card_background_url,sku_card_overlay_opacity,store_listing_card_preset,store_listing_card_background_url,store_listing_card_overlay_opacity';

async function fetchVendorRowsInChunks(vendorIds: string[]) {
  const rows: (VendorMedia & {
    sku_card_preset?: string | null;
    sku_card_background_url?: string | null;
    sku_card_overlay_opacity?: number | null;
    store_listing_card_preset?: string | null;
    store_listing_card_background_url?: string | null;
    store_listing_card_overlay_opacity?: number | null;
    name?: string | null;
  })[] = [];
  for (let i = 0; i < vendorIds.length; i += VENDOR_ID_IN_CHUNK) {
    const chunk = vendorIds.slice(i, i + VENDOR_ID_IN_CHUNK);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase.from('vendors').select(VENDOR_MEDIA_SELECT).in('id', chunk);
    if (error) {
      console.warn('category page vendors batch:', error.message);
      continue;
    }
    rows.push(...((data || []) as typeof rows));
  }
  return rows;
}

async function fetchReviewsForVendors(vendorIds: string[]) {
  const rows: { entity_id: string; rating: number }[] = [];
  for (let i = 0; i < vendorIds.length; i += VENDOR_ID_IN_CHUNK) {
    const chunk = vendorIds.slice(i, i + VENDOR_ID_IN_CHUNK);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from('reviews')
      .select('entity_id,rating')
      .eq('entity_type', 'vendor')
      .in('entity_id', chunk)
      .lte('created_at', new Date().toISOString());
    if (error) {
      console.warn('category page reviews batch:', error.message);
      continue;
    }
    rows.push(...((data || []) as typeof rows));
  }
  return rows;
}

/** DB categories to fetch before client-side `productMatchesSmokersClubCategory` (CBD needs flower + topical + other). */
function dbCategoriesToFetchForSlug(slug: SmokersClubCategorySlug): string[] {
  if (slug === 'cbd') {
    return ['flower', 'topical', 'other'];
  }
  return dbCategoriesForSlug(slug);
}

function StoreNearRow({
  title,
  icon: Icon,
  rows,
  sectionId,
  maxPreview = PREVIEW_STORE_STRIP,
}: {
  title: string;
  icon: typeof Truck;
  rows: NearStoreRow[];
  sectionId?: string;
  maxPreview?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const over = rows.length > maxPreview;
  const visible = !over || showAll ? rows : rows.slice(0, maxPreview);

  return (
    <section id={sectionId} className="mt-10 scroll-mt-24">
      <div className={sectionShellClass()}>
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
          <Icon className="h-5 w-5 text-brand-lime" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        </div>
      {rows.length === 0 ? (
        <p className="text-sm leading-relaxed text-zinc-400">
          No shops in range carry this category on their menu yet. Try another ZIP in the header, allow
          location, or check back after stores restock.
        </p>
      ) : (
        <>
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
          {visible.map((r) => {
            return (
              <div key={r.vendorId} className="w-[200px] shrink-0">
                <VendorSkuCardFrame
                  theme={r.cardTheme}
                  className="group overflow-hidden transition-colors duration-200 hover:border-brand-red/50 hover:shadow-md hover:shadow-black/25"
                >
                  <Link
                    href={listingHrefForVendor({ id: r.vendorId, slug: r.vendorSlug })}
                    className="relative z-[1] block text-inherit no-underline"
                  >
                    <div className="relative aspect-[3/2] w-full bg-zinc-900">
                      {r.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                          No photo
                        </div>
                      )}
                      {r.logo ? (
                        <div className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-full border-2 border-black/80 bg-background shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.logo} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <div className="flex flex-wrap items-start gap-1.5">
                        <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-white group-hover:text-brand-lime-soft">
                          {r.name}
                        </p>
                        {r.socialEquity ? (
                          <SocialEquityBadge className="shrink-0 text-[9px]" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                        <span>
                          {r.reviewCount > 0
                            ? `${r.rating.toFixed(1)} · ${r.reviewCount}`
                            : 'No reviews yet'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {r.typeCount} {r.typeCount === 1 ? 'product type' : 'product types'} in this category
                      </p>
                      <p className="text-[11px] text-zinc-600">{r.miles.toFixed(1)} mi away</p>
                    </div>
                  </Link>
                </VendorSkuCardFrame>
              </div>
            );
          })}
        </div>
        {over ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-brand-lime-soft hover:bg-white/5 hover:text-white"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Show less' : `View all ${title.toLowerCase()} (${rows.length})`}
          </Button>
        ) : null}
        </>
      )}
      </div>
    </section>
  );
}

export function SmokersClubCategoryClient({ slug }: { slug: string }) {
  const vendorsSchema = useVendorsSchema();
  const [loading, setLoading] = useState(true);
  const [vendorsMode, setVendorsMode] = useState(false);
  const [bestsellers, setBestsellers] = useState<
    {
      vendorId: string;
      vendorSlug?: string | null;
      product: ProductRow;
      units: number;
      vendorName: string;
      miles: number | null;
    }[]
  >([]);
  const [deliveryRows, setDeliveryRows] = useState<NearStoreRow[]>([]);
  const [pickupRows, setPickupRows] = useState<NearStoreRow[]>([]);
  const [nearbySkus, setNearbySkus] = useState<NearbySkuRow[]>([]);
  const [skuCardThemes, setSkuCardThemes] = useState<Record<string, ResolvedSkuCardTheme>>({});
  const [showAllBestsellers, setShowAllBestsellers] = useState(false);
  const [showAllOnSale, setShowAllOnSale] = useState(false);
  const [showAllBrowse, setShowAllBrowse] = useState(false);
  /** True when discovery returned vendors_schema but zero vendors (API/RLS/env). */
  const [directoryVendorsEmpty, setDirectoryVendorsEmpty] = useState(false);

  const validSlug = resolveSmokersClubCategorySlug(slug);
  const label = validSlug ? SMOKERS_CLUB_CATEGORY_LABELS[validSlug] : 'Category';

  const load = useCallback(async () => {
    if (!validSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { vendors: allVendors, vendors_schema } = await fetchDiscoveryVendorsPayload({
        audience: 'discovery',
      });
      setVendorsMode(vendors_schema);

      if (!vendors_schema) {
        setDirectoryVendorsEmpty(false);
        setBestsellers([]);
        setDeliveryRows([]);
        setPickupRows([]);
        setNearbySkus([]);
        setSkuCardThemes({});
        return;
      }

      const zip5 = readShopperZip5();
      const geo = readShopperGeo();
      const approx = mapCenterForCaZipOrDefault(zip5);
      const shopperLat = geo?.lat ?? approx.lat;
      const shopperLng = geo?.lng ?? approx.lng;

      const [deliveryZipSet, coordsMap] = await Promise.all([
        zip5 ? fetchVendorIdsServingZip5(zip5) : Promise.resolve(new Set<string>()),
        fetchVendorCoordsById(),
      ]);

      /** Directory pool: Smokers Club–eligible by default; others only if nearby or deliver to ZIP. */
      const marketplaceVendors = allVendors.filter((v) => {
        const c = coordsMap.get(v.id);
        const lat = c?.geo_lat ?? v.geo_lat ?? null;
        const lng = c?.geo_lng ?? v.geo_lng ?? null;
        return publicDispensarySurfaceVisible(v.smokers_club_eligible === true, {
          distanceMiles:
            lat != null && lng != null
              ? haversineKm(shopperLat, shopperLng, lat, lng) * 0.621371
              : undefined,
          inDeliveryZipCoverage: deliveryZipSet.has(v.id),
        });
      });

      const marketplaceIds = marketplaceVendors.map((v) => v.id);
      if (marketplaceIds.length === 0) {
        setDirectoryVendorsEmpty(true);
        setBestsellers([]);
        setDeliveryRows([]);
        setPickupRows([]);
        setNearbySkus([]);
        setSkuCardThemes({});
        return;
      }

      setDirectoryVendorsEmpty(false);

      const dbCats = dbCategoriesForSlug(validSlug);
      const { data: rpcRows, error: rpcErr } = await supabase.rpc('smokers_club_category_bestsellers', {
        p_categories: dbCats,
      });

      if (rpcErr) {
        console.warn('smokers_club_category_bestsellers', rpcErr.message);
      }

      const rawRpc = (rpcRows || []) as RpcBestseller[];
      const productIds = rawRpc.map((r) => r.product_id).filter(Boolean);

      let productsById = new Map<string, ProductRow>();
      if (productIds.length > 0) {
        const { data: prodData, error: pErr } = await supabase
          .from('products')
          .select('id,vendor_id,category,name,images,price_cents,potency_cbd,sale_discount_percent')
          .in('id', productIds);
        if (pErr) console.warn('products bestsellers', pErr.message);
        for (const p of (prodData || []) as ProductRow[]) {
          if (productMatchesSmokersClubCategory(validSlug, p)) productsById.set(p.id, p);
        }
      }

      const bs: { vendorId: string; product: ProductRow; units: number }[] = [];
      for (const row of rawRpc) {
        const p = productsById.get(row.product_id);
        if (!p) continue;
        bs.push({ vendorId: row.vendor_id, product: p, units: Number(row.units_ordered) || 0 });
      }

      const categoriesForQuery = dbCategoriesToFetchForSlug(validSlug);
      const { data: rawProducts, error: productsErr } = await supabase
        .from('products')
        .select('id,vendor_id,category,name,images,price_cents,potency_cbd,sale_discount_percent')
        .eq('in_stock', true)
        .in('category', categoriesForQuery);

      if (productsErr) {
        console.warn('category page products by category:', productsErr.message);
      }

      const productsList = ((rawProducts || []) as ProductRow[]).filter((p) =>
        productMatchesSmokersClubCategory(validSlug, p)
      );

      const skuVendorIds = Array.from(new Set(productsList.map((p) => p.vendor_id)));

      const [mediaRows, reviewRows] = await Promise.all([
        fetchVendorRowsInChunks(skuVendorIds),
        fetchReviewsForVendors(skuVendorIds),
      ]);

      const mediaById = new Map<string, VendorMedia>();
      const slugByVendorId = new Map<string, string | undefined>();
      for (const v of marketplaceVendors) {
        const s = typeof v.slug === 'string' && v.slug.trim() ? v.slug.trim() : undefined;
        if (s) slugByVendorId.set(v.id, s);
      }
      const themeRec: Record<string, ResolvedSkuCardTheme> = {};
      for (const r of mediaRows) {
        mediaById.set(r.id, r);
        const rs = typeof r.slug === 'string' && r.slug.trim() ? r.slug.trim() : undefined;
        if (rs) slugByVendorId.set(r.id, rs);
        themeRec[r.id] = resolveSkuCardTheme({
          preset: r.sku_card_preset,
          backgroundUrl: r.sku_card_background_url,
          overlayOpacity: r.sku_card_overlay_opacity,
        });
      }
      setSkuCardThemes(themeRec);

      const reviewAgg = new Map<string, { sum: number; n: number }>();
      for (const r of reviewRows) {
        const cur = reviewAgg.get(r.entity_id) || { sum: 0, n: 0 };
        cur.sum += r.rating;
        cur.n += 1;
        reviewAgg.set(r.entity_id, cur);
      }

      const typeCount = new Map<string, number>();
      const thumbByVendor = new Map<string, string | null>();

      for (const p of productsList) {
        typeCount.set(p.vendor_id, (typeCount.get(p.vendor_id) || 0) + 1);
        if (!thumbByVendor.has(p.vendor_id)) {
          thumbByVendor.set(p.vendor_id, firstImage(p.images));
        }
      }

      const buildRow = (v: DiscoveryVendor, distMi: number) => {
        const m = mediaById.get(v.id);
        const coord = coordsMap.get(v.id);
        const logo = v.logo_url || coord?.logo_url || m?.logo_url || null;
        const thumb =
          thumbByVendor.get(v.id) || (m?.banner_url && m.banner_url.trim() !== '' ? m.banner_url : null) || logo;
        const agg = reviewAgg.get(v.id);
        const reviewCount = agg?.n ?? 0;
        const rating = reviewCount > 0 ? agg!.sum / reviewCount : 0;
        const tc = typeCount.get(v.id) || 0;
        return {
          vendorId: v.id,
          vendorSlug: slugByVendorId.get(v.id) ?? v.slug,
          name: publicVendorDisplayName(v.business_name),
          socialEquity: v.social_equity_badge_visible === true,
          thumb,
          logo,
          website: v.website ?? null,
          rating,
          reviewCount,
          typeCount: tc,
          miles: distMi,
          cardTheme: resolveStoreListingCardTheme(v),
        };
      };

      const withDistance: { v: DiscoveryVendor; mi: number }[] = [];
      for (const v of marketplaceVendors) {
        const c = coordsMap.get(v.id);
        if (c?.geo_lat == null || c?.geo_lng == null) continue;
        const km = haversineKm(shopperLat, shopperLng, c.geo_lat, c.geo_lng);
        withDistance.push({ v, mi: milesFromKm(km) });
      }
      withDistance.sort((a, b) => a.mi - b.mi);

      const vendorDistMap = new Map<string, number>();
      for (const { v, mi } of withDistance) {
        vendorDistMap.set(v.id, mi);
      }
      const vendorNameById = new Map<string, string>();
      for (const v of marketplaceVendors) {
        vendorNameById.set(v.id, publicVendorDisplayName(v.business_name));
      }
      for (const r of mediaRows) {
        const nm = typeof r.name === 'string' && r.name.trim() !== '' ? r.name : null;
        if (nm && !vendorNameById.has(r.id)) {
          vendorNameById.set(r.id, publicVendorDisplayName(nm));
        }
      }

      const skuRows: NearbySkuRow[] = [];
      for (const p of productsList) {
        const mi = vendorDistMap.get(p.vendor_id);
        skuRows.push({
          product: p,
          vendorId: p.vendor_id,
          vendorName: vendorNameById.get(p.vendor_id) || 'Dispensary',
          miles: mi ?? null,
        });
      }
      skuRows.sort((a, b) => {
        const da = a.miles;
        const db = b.miles;
        if (da == null && db == null) return a.product.name.localeCompare(b.product.name);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db || a.product.name.localeCompare(b.product.name);
      });
      setNearbySkus(skuRows);

      const delivery: NearStoreRow[] = [];
      const pickup: NearStoreRow[] = [];

      for (const { v, mi } of withDistance) {
        const n = typeCount.get(v.id) || 0;
        if (n === 0) continue;
        if (v.offers_delivery && mi <= SMOKERS_CLUB_DELIVERY_RADIUS_MI) {
          delivery.push(buildRow(v, mi));
        }
        if (v.offers_storefront && mi <= SMOKERS_CLUB_PICKUP_RADIUS_MI) {
          pickup.push(buildRow(v, mi));
        }
      }

      setDeliveryRows(delivery);
      setPickupRows(pickup);

      setBestsellers(
        bs.map((row) => ({
          ...row,
          vendorSlug: slugByVendorId.get(row.vendorId),
          vendorName: vendorNameById.get(row.vendorId) || 'Dispensary',
          miles: vendorDistMap.get(row.vendorId) ?? null,
        }))
      );
    } catch (e) {
      console.error('SmokersClubCategoryClient load', e);
      setDirectoryVendorsEmpty(true);
      setBestsellers([]);
      setDeliveryRows([]);
      setPickupRows([]);
      setNearbySkus([]);
      setSkuCardThemes({});
    } finally {
      setLoading(false);
    }
  }, [validSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onZip = () => void load();
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('datreehouse:geo', onZip);
    window.addEventListener('storage', onZip);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('datreehouse:geo', onZip);
      window.removeEventListener('storage', onZip);
    };
  }, [load]);

  const subtitle = useMemo(
    () =>
      'Browse highlights below, or open “View all” on any section for the full list. Distances use your ZIP or location when we have store coordinates.',
    []
  );

  const bestsellerSkuRows: NearbySkuRow[] = useMemo(() => {
    const sorted = [...bestsellers].sort(
      (a, b) => b.units - a.units || a.product.name.localeCompare(b.product.name)
    );
    return sorted.map((b) => ({
      product: b.product,
      vendorId: b.vendorId,
      vendorSlug: b.vendorSlug,
      vendorName: b.vendorName,
      miles: b.miles,
      detailLine: b.units > 0 ? `${b.units} units ordered` : null,
    }));
  }, [bestsellers]);

  const onSaleSkuRows: NearbySkuRow[] = useMemo(() => {
    const rows = nearbySkus.filter((r) => (r.product.sale_discount_percent ?? 0) >= 1);
    return [...rows].sort(
      (a, b) =>
        (b.product.sale_discount_percent ?? 0) - (a.product.sale_discount_percent ?? 0) ||
        a.product.name.localeCompare(b.product.name)
    );
  }, [nearbySkus]);

  if (!validSlug) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-zinc-400">Unknown category.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black">
        <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/35 via-brand-lime/15 to-transparent p-px">
            <div className="rounded-[15px] bg-zinc-950/95 px-5 py-7 sm:px-7 sm:py-9">
              <Button asChild variant="ghost" size="sm" className="mb-5 gap-1 text-zinc-400 hover:text-white">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Home
                </Link>
              </Button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Smokers Club</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl sm:tracking-tight">
                {label}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Other Smokers Club categories">
                {SMOKERS_CLUB_CATEGORY_SLUGS.map((s) => {
                  const active = s === validSlug;
                  const catLabel = SMOKERS_CLUB_CATEGORY_LABELS[s];
                  return (
                    <Link
                      key={s}
                      href={`/smokers-club/category/${s}`}
                      className={[
                        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition',
                        active
                          ? 'border-brand-lime/45 bg-brand-lime/10 text-white'
                          : 'border-white/10 bg-black/30 text-zinc-300 hover:border-brand-lime/35 hover:text-white',
                      ].join(' ')}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={SMOKERS_CLUB_CATEGORY_IMAGE_PATHS[s]}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                      />
                      {catLabel}
                    </Link>
                  );
                })}
              </div>
              {!vendorsSchema && !loading ? (
                <p className="mt-5 text-sm text-amber-200/90">
                  Smokers Club categories need the vendors schema: set{' '}
                  <code className="rounded bg-black/40 px-1">USE_VENDORS_TABLE=1</code> on the server and{' '}
                  <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> for the client
                  bundle, then redeploy.
                </p>
              ) : null}
              {vendorsSchema && !loading && directoryVendorsEmpty ? (
                <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-100/95">
                  The directory API returned no vendors. Check DevTools → Network for{' '}
                  <code className="rounded bg-black/40 px-1">/api/discovery/vendors</code> (500 = RLS/recursion or
                  missing <code className="rounded bg-black/40 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the host). Apply
                  migrations 0114 and 0115 on the same Supabase project as{' '}
                  <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_SUPABASE_URL</code>.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        {loading ? (
          <CategoryPageSkeleton />
        ) : (
          <>
            <nav
              aria-label="Category sections"
              className={`${sectionShellClass()} mb-10 flex flex-wrap gap-2 text-sm`}
            >
              <span className="w-full text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Jump to
              </span>
              <a
                href="#cat-bestsellers"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-300 transition hover:border-brand-lime/40 hover:text-white"
              >
                Best sellers
              </a>
              <a
                href="#cat-delivery"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-300 transition hover:border-brand-lime/40 hover:text-white"
              >
                Delivery
              </a>
              <a
                href="#cat-storefront"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-300 transition hover:border-brand-lime/40 hover:text-white"
              >
                Storefront
              </a>
              <a
                href="#cat-on-sale"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-300 transition hover:border-brand-lime/40 hover:text-white"
              >
                On sale
              </a>
              <a
                href="#cat-browse-all"
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-300 transition hover:border-brand-lime/40 hover:text-white"
              >
                All SKUs
              </a>
            </nav>

            <section id="cat-bestsellers" className="scroll-mt-24">
              <div className={sectionShellClass()}>
                <div className="mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-lg font-semibold tracking-tight text-white">Best sellers</h2>
                  <p className="mt-1 text-xs text-zinc-500">Ranked from recent orders in this category.</p>
                </div>
                {bestsellerSkuRows.length === 0 ? (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    No bestseller signal for this category yet — explore on-sale SKUs or the full menu below.
                  </p>
                ) : (
                  <CategorySkuCardGrid
                    rows={bestsellerSkuRows}
                    skuCardThemes={skuCardThemes}
                    limit={PREVIEW_BESTSELLER_SKUS}
                    showAll={showAllBestsellers}
                    onToggleShowAll={() => setShowAllBestsellers((v) => !v)}
                  />
                )}
              </div>
            </section>

            <StoreNearRow
              sectionId="cat-delivery"
              title="Delivery — shops with this category"
              icon={Truck}
              rows={deliveryRows}
            />
            <StoreNearRow
              sectionId="cat-storefront"
              title="Storefront & pickup — this category"
              icon={Store}
              rows={pickupRows}
            />

            <section id="cat-on-sale" className="mt-12 scroll-mt-24">
              <div className={sectionShellClass()}>
                <div className="mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-lg font-semibold tracking-tight text-white">On sale</h2>
                  <p className="mt-1 text-xs text-zinc-500">SKUs with an active simple discount.</p>
                </div>
                {onSaleSkuRows.length === 0 ? (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Nothing is marked on sale in this category right now. Check the full menu for new drops.
                  </p>
                ) : (
                  <CategorySkuCardGrid
                    rows={onSaleSkuRows}
                    skuCardThemes={skuCardThemes}
                    limit={PREVIEW_ON_SALE_SKUS}
                    showAll={showAllOnSale}
                    onToggleShowAll={() => setShowAllOnSale((v) => !v)}
                  />
                )}
              </div>
            </section>

            <section id="cat-browse-all" className="mt-12 scroll-mt-24">
              <div className={sectionShellClass()}>
                <div className="mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-lg font-semibold tracking-tight text-white">All menu items in this category</h2>
                  <p className="mt-1 text-xs text-zinc-500">In-stock SKUs sorted by distance when we have coordinates.</p>
                </div>
                {nearbySkus.length === 0 ? (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    No in-stock menu rows match this category filter. Stores may be restocking — try another category or
                    widen your ZIP.
                  </p>
                ) : (
                  <CategorySkuCardGrid
                    rows={nearbySkus}
                    skuCardThemes={skuCardThemes}
                    limit={PREVIEW_BROWSE_SKUS}
                    showAll={showAllBrowse}
                    onToggleShowAll={() => setShowAllBrowse((v) => !v)}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
