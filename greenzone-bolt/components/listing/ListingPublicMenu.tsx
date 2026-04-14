'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Sprout, ShoppingCart, Tag, TicketPercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { dealAppliesToStoreRegion, formatDealRegionLabel } from '@/lib/dealRegions';
import { dealIsActiveNow } from '@/lib/dealSchedule';
import {
  filterProductsByMenuSource,
  pickMenuProfileId,
  type MenuSourceMode,
} from '@/lib/vendorMenuMerge';
import { TreehouseCatalogVerifiedBadge } from '@/components/brand/TreehouseCatalogVerifiedBadge';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';
import {
  dealPromoImageUrl,
  menuProductHeroImageUrlWithDeal,
  menuThumbImgClassName,
  parseStrainsEmbed,
} from '@/lib/strainProductImage';
import { resolveMenuBrandLabel } from '@/lib/productBrandLabel';
import { ProductBrandCardChip } from '@/components/product/ProductThumbnailBrandTab';
import { MenuProductDetailSheet } from '@/components/listing/MenuProductDetailSheet';
import { TreehouseSmokingLoader } from '@/components/TreehouseSmokingLoader';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { VendorSkuCardFrame } from '@/components/vendor/VendorSkuCardFrame';
import {
  resolveSkuCardTheme,
  type ResolvedSkuCardTheme,
  type VendorSkuCardThemeInput,
} from '@/lib/vendorSkuCardTheme';
import {
  bestDealForProduct,
  menuProductPriceBand,
  shopperMenuChargeCents,
  sortedQuantityTiers,
  type MenuProductQuantityTier,
  type PublicMenuDeal as BasePublicMenuDeal,
} from '@/lib/vendorMenuProductPricing';
import { menuSkuTitleStyle } from '@/lib/menuTextColor';
import { cn } from '@/lib/utils';

export type ListingMenuProduct = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  is_featured?: boolean | null;
  images: string[];
  potency_thc: number | null;
  potency_cbd: number | null;
  description: string | null;
  in_stock: boolean;
  created_at: string;
  pos_provider?: string | null;
  pos_external_id?: string | null;
  catalog_product_id?: string | null;
  strain_id?: string | null;
  strains?: { slug: string; image_url: string | null } | null;
  brand_id?: string | null;
  brand_display_name?: string | null;
  brands?: { name: string; slug: string; verified: boolean } | null;
  /** 1–99 = simple shelf sale (% off list); deals take precedence when they apply. */
  sale_discount_percent?: number | null;
  /** Fixed cents off list per unit (XOR with sale_discount_percent in DB). */
  sale_discount_cents?: number | null;
  /** Optional quantity/weight sell tiers with per-tier list prices. */
  quantity_tiers?: MenuProductQuantityTier[] | null;
  /** Optional #hex for product name on menu cards (migration 0121). */
  menu_text_color?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  flower: 'Flower',
  edible: 'Edibles',
  vape: 'Vape',
  concentrate: 'Concentrates',
  topical: 'Topicals',
  preroll: 'Pre-rolls',
  other: 'Other',
};

/** DB category → menu filter tab (`vape` rolls up under Pre-rolls). */
function menuFilterKey(cat: string): string {
  return cat === 'vape' ? 'preroll' : cat;
}

const CATEGORY_ORDER = ['flower', 'preroll', 'concentrate', 'edible', 'topical', 'other'];

function formatCategory(cat: string) {
  return CATEGORY_LABEL[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function brandShowcaseHref(p: Pick<ListingMenuProduct, 'brand_id' | 'brands'>): string | undefined {
  if (!p.brand_id || !p.brands?.slug || p.brands.verified !== true) return undefined;
  return `/brands/${encodeURIComponent(p.brands.slug)}`;
}

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'newest';

export type PublicMenuDeal = BasePublicMenuDeal & {
  title: string;
  image_url?: string | null;
  region_keys: string[] | null;
  start_date: string;
  end_date: string;
  starts_at?: string | null;
  ends_at?: string | null;
};

function MenuListingSkuCard({
  p,
  cardTheme,
  deals,
  selectedDealId,
  vendorName,
  onOpenSheet,
  onAddToCart,
  formatCategoryFn,
  brandLinkTarget,
}: {
  p: ListingMenuProduct;
  cardTheme: ResolvedSkuCardTheme;
  deals: PublicMenuDeal[];
  selectedDealId: string | null;
  vendorName: string;
  onOpenSheet: (product: ListingMenuProduct) => void;
  onAddToCart: (product: ListingMenuProduct) => void;
  formatCategoryFn: (cat: string) => string;
  brandLinkTarget?: React.HTMLAttributeAnchorTarget;
}) {
  const strainRow = parseStrainsEmbed(p);
  const rowDeal = bestDealForProduct(p.id, deals, selectedDealId, p.price_cents);
  const heroUrl = menuProductHeroImageUrlWithDeal(p, rowDeal);
  const band = menuProductPriceBand(p, deals, selectedDealId);
  const saleCents = band.fromCents;
  const onSale = band.onSale;
  const listPrice = (band.fromListCents / 100).toFixed(2);
  const salePrice = (saleCents / 100).toFixed(2);
  const hasTiers = sortedQuantityTiers(p.quantity_tiers).length > 0;
  const promoCode = rowDeal?.deal_options?.promo_code?.trim();
  const brandTab = resolveMenuBrandLabel({
    linkedBrandName: p.brands?.name,
    brandDisplayName: p.brand_display_name,
    storeName: vendorName,
  });
  const potencyBits: string[] = [];
  if (p.potency_thc != null) potencyBits.push(`THC ${p.potency_thc}%`);
  if (p.potency_cbd != null) potencyBits.push(`CBD ${p.potency_cbd}%`);
  const potencyLine = potencyBits.join(' · ');
  const skuTitleStyle = menuSkuTitleStyle(p.menu_text_color);

  return (
    <VendorSkuCardFrame theme={cardTheme} className="h-full overflow-hidden transition-colors hover:border-green-600/35">
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer gap-2.5 p-2 outline-none ring-green-500/40 focus-visible:ring-2 sm:gap-3 sm:p-2.5"
        onClick={() => onOpenSheet(p)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenSheet(p);
          }
        }}
      >
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-gray-950/80 sm:h-[5rem] sm:w-[5rem]">
          {heroUrl || strainRow?.slug ? (
            <StrainHeroImage
              preferredUrl={heroUrl ?? undefined}
              slug={strainRow?.slug ?? ''}
              imageUrl={strainRow?.image_url}
              alt=""
              maxCandidates={6}
              className="h-full w-full"
              imgClassName={menuThumbImgClassName(heroUrl)}
              placeholder={
                <div className="flex h-full w-full items-center justify-center text-gray-600">
                  <Package className="h-7 w-7 opacity-40" aria-hidden />
                </div>
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Package className="h-7 w-7 opacity-40" aria-hidden />
            </div>
          )}
          {p.catalog_product_id ? (
            <TreehouseCatalogVerifiedBadge className="absolute right-0.5 top-0.5 z-[2] scale-90" />
          ) : null}
          {onSale && band.offPct != null ? (
            <Badge className="absolute left-0.5 top-0.5 z-[1] border border-red-400/40 bg-red-600 px-1 py-0 text-[9px] font-bold text-white shadow-sm">
              {band.offPct}% off
            </Badge>
          ) : null}
        </div>
        <div className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-between gap-1 sm:min-h-[5rem]">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-1">
              <ProductBrandCardChip
                label={brandTab}
                className="max-w-full"
                href={brandShowcaseHref(p)}
                linkTarget={brandLinkTarget}
              />
              <Badge variant="outline" className="border-green-700/40 px-1.5 py-0 text-[9px] text-green-400/90">
                {formatCategoryFn(p.category)}
              </Badge>
              {!p.in_stock && (
                <Badge variant="secondary" className="bg-gray-800 px-1.5 py-0 text-[9px] text-gray-400">
                  Out
                </Badge>
              )}
            </div>
            <h4
              className={`line-clamp-2 text-left text-sm font-semibold leading-snug${skuTitleStyle ? '' : ' text-white'}`}
              style={skuTitleStyle}
            >
              {p.name}
            </h4>
            {promoCode && onSale ? (
              <p className="mt-0.5 font-mono text-[10px] text-amber-200/90" title="Promo at checkout">
                <TicketPercent className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />
                {promoCode}
              </p>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                {onSale ? (
                  <>
                    {band.showFrom ? <span className="text-[10px] text-gray-500">from</span> : null}
                    <span className="text-sm font-bold text-green-400 sm:text-base">${salePrice}</span>
                    <span className="text-[10px] text-gray-500 line-through">${listPrice}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-green-400 sm:text-base">
                    {band.showFrom ? <span className="text-[10px] font-normal text-gray-500">from </span> : null}
                    ${listPrice}
                  </span>
                )}
              </div>
              {potencyLine ? <span className="text-[10px] text-gray-500">{potencyLine}</span> : null}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!p.in_stock}
              className="h-8 shrink-0 bg-green-600 px-2.5 text-xs text-white hover:bg-green-700 disabled:opacity-40"
              onClick={(e) => {
                e.stopPropagation();
                if (hasTiers) onOpenSheet(p);
                else onAddToCart(p);
              }}
            >
              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </VendorSkuCardFrame>
  );
}

type Props = {
  vendorId: string;
  vendorName: string;
  vendorState?: string | null;
  /** From `vendors` row — controls SKU card chrome on this menu. */
  skuCardTheme?: VendorSkuCardThemeInput | null;
  /**
   * When set (e.g. `/embed/menu` on a third-party site), add-to-cart navigates the **top** window here
   * so checkout/session cookies work on the canonical storefront tab.
   */
  embedListingTopUrl?: string | null;
};

export function ListingPublicMenu({
  vendorId,
  vendorName,
  vendorState = null,
  skuCardTheme = null,
  embedListingTopUrl = null,
}: Props) {
  const vendorsSchema = useVendorsSchema();
  const { addItem, replaceCartWith } = useCart();
  const { toast } = useToast();
  const [rawCatalog, setRawCatalog] = useState<ListingMenuProduct[]>([]);
  const [menuSourceMode, setMenuSourceMode] = useState<MenuSourceMode>('manual');
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState<string>('all');
  /** `menu` = catalog without duplicating featured rail; `sale` = discounted SKUs only. */
  const [browseTab, setBrowseTab] = useState<'menu' | 'sale'>('menu');
  const [sort, setSort] = useState<SortKey>('name');
  const [deals, setDeals] = useState<PublicMenuDeal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [menuSheetProduct, setMenuSheetProduct] = useState<ListingMenuProduct | null>(null);

  const cardTheme = useMemo(() => resolveSkuCardTheme(skuCardTheme), [skuCardTheme]);

  const brandLinkTarget = embedListingTopUrl ? ('_top' as const) : undefined;

  const navigateEmbedTop = useCallback(() => {
    const u = embedListingTopUrl?.trim();
    if (!u || typeof window === 'undefined') return;
    try {
      window.top?.location.assign(u);
    } catch {
      window.location.assign(u);
    }
  }, [embedListingTopUrl]);

  function openMenuProductSheet(p: ListingMenuProduct) {
    setMenuSheetProduct(p);
    setMenuSheetOpen(true);
  }

  function onMenuSheetOpenChange(next: boolean) {
    setMenuSheetOpen(next);
    if (!next) {
      window.setTimeout(() => setMenuSheetProduct(null), 320);
    }
  }

  const items = useMemo(
    () => filterProductsByMenuSource(rawCatalog, menuSourceMode, hiddenProductIds),
    [rawCatalog, menuSourceMode, hiddenProductIds]
  );

  useEffect(() => {
    let cancelled = false;
    setCategory('all');
    setBrowseTab('menu');
    setSort('name');
    setSelectedDealId(null);

    (async () => {
      setLoading(true);
      setLoadError(false);

      if (!vendorsSchema) {
        if (!cancelled) {
          setRawCatalog([]);
          setDeals([]);
          setMenuSourceMode('manual');
          setHiddenProductIds(new Set());
          setLoading(false);
        }
        return;
      }

      const skuCap = 1600;
      const skuPageSize = 1000; // PostgREST default-ish max per request

      const buildProductSelect = (
        withPos: boolean,
        withCatalogLink: boolean,
        withFeatured: boolean,
        withShelfSale: boolean,
        withMenuTextColor: boolean
      ) =>
        [
          'id,name,category,price_cents',
          withShelfSale ? 'sale_discount_percent,sale_discount_cents' : '',
          'images,potency_thc,potency_cbd,description,in_stock,created_at',
          withFeatured ? 'is_featured' : '',
          'strain_id,brand_id,brand_display_name',
          withCatalogLink ? 'catalog_product_id' : '',
          withPos ? 'pos_provider,pos_external_id' : '',
          withMenuTextColor ? 'menu_text_color' : '',
        ]
          .filter(Boolean)
          .join(',');

      const fetchProductsCapped = async (
        withPos: boolean,
        withCatalogLink: boolean,
        withFeatured: boolean,
        withShelfSale: boolean
      ) => {
        const runWithMenuColorFlag = async (withMenuTextColor: boolean) => {
          const select = buildProductSelect(
            withPos,
            withCatalogLink,
            withFeatured,
            withShelfSale,
            withMenuTextColor
          );

          const fetchRange = (from: number, to: number) =>
            supabase
              .from('products')
              .select(select)
              .eq('vendor_id', vendorId)
              .order('name')
              .range(from, to);

          const firstRes = await fetchRange(0, skuPageSize - 1);
          if (firstRes.error) {
            return { data: firstRes.data ?? null, error: firstRes.error };
          }

          const firstRows = (firstRes.data || []) as unknown as ListingMenuProduct[];
          if (firstRows.length < skuPageSize || skuCap <= skuPageSize) {
            return { data: firstRows, error: null };
          }

          const secondRes = await fetchRange(skuPageSize, skuCap - 1);
          if (secondRes.error) {
            return { data: firstRows, error: secondRes.error };
          }

          const secondRows = (secondRes.data || []) as unknown as ListingMenuProduct[];
          return { data: [...firstRows, ...secondRows].slice(0, skuCap), error: null };
        };

        let out = await runWithMenuColorFlag(true);
        const msg = String(out.error?.message || '');
        if (out.error && /menu_text_color|column|does not exist/i.test(msg)) {
          out = await runWithMenuColorFlag(false);
        }
        return out;
      };

      const productFetchAttempts: [boolean, boolean, boolean][] = [
        [true, true, true],
        [true, false, true],
        [false, true, true],
        [false, false, true],
        [true, true, false],
        [true, false, false],
        [false, true, false],
        [false, false, false],
      ];

      let prodRes: { data: ListingMenuProduct[] | null; error: { message?: string } | null } = {
        data: null,
        error: null,
      };
      outer: for (const withShelfSale of [true, false]) {
        for (const [withPos, withCatalogLink, withFeatured] of productFetchAttempts) {
          prodRes = await fetchProductsCapped(withPos, withCatalogLink, withFeatured, withShelfSale);
          if (!prodRes.error) break outer;
          const msg = prodRes.error.message || '';
          if (
            !/sale_discount_percent|sale_discount_cents|catalog_product_id|pos_provider|pos_external_id|strain_id|brand_id|brand_display_name|is_featured|menu_text_color|column|does not exist/i.test(
              msg
            )
          ) {
            break outer;
          }
        }
      }

      const dealRes = await supabase
        .from('deals')
        .select(
          'id,title,image_url,discount_percent,products,deal_options,region_keys,start_date,end_date,starts_at,ends_at,active_days,daily_start_time,daily_end_time'
        )
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (prodRes.error) {
        console.error('Listing menu:', prodRes.error);
        setLoadError(true);
        setRawCatalog([]);
        setDeals([]);
        setMenuSourceMode('manual');
        setHiddenProductIds(new Set());
      } else {
        let rows = (prodRes.data || []) as ListingMenuProduct[];
        const strainIds = Array.from(
          new Set(rows.map((r) => r.strain_id).filter((id): id is string => Boolean(id)))
        );
        if (strainIds.length && !cancelled) {
          const { data: stRows, error: stErr } = await supabase
            .from('strains')
            .select('id,slug,image_url')
            .in('id', strainIds);
          if (!stErr && stRows?.length) {
            const m = new Map<string, { slug: string; image_url: string | null }>();
            for (const s of stRows as { id: string; slug: string; image_url: string | null }[]) {
              m.set(s.id, { slug: s.slug, image_url: s.image_url });
            }
            rows = rows.map((r) => {
              const se = r.strain_id ? m.get(r.strain_id) : undefined;
              return se ? { ...r, strains: se } : { ...r, strains: null };
            });
          }
        }
        const brandIds = Array.from(
          new Set(rows.map((r) => r.brand_id).filter((id): id is string => Boolean(id)))
        );
        if (brandIds.length && !cancelled) {
          const { data: bRows, error: bErr } = await supabase
            .from('brands')
            .select('id,name,slug,verified')
            .in('id', brandIds);
          if (!bErr && bRows?.length) {
            const bm = new Map<string, { name: string; slug: string; verified: boolean }>();
            for (const b of bRows as { id: string; name: string; slug: string; verified: boolean }[]) {
              bm.set(b.id, { name: b.name, slug: b.slug, verified: Boolean(b.verified) });
            }
            rows = rows.map((r) => ({
              ...r,
              brands: r.brand_id && bm.has(r.brand_id) ? bm.get(r.brand_id)! : null,
            }));
          }
        }
        const productIds = rows.map((r) => r.id);
        if (productIds.length && !cancelled) {
          const { data: tierData, error: tierErr } = await supabase
            .from('product_quantity_tiers')
            .select('id,product_id,preset,label,price_cents,sort_order')
            .in('product_id', productIds);
          if (!tierErr && tierData?.length) {
            const tm = new Map<string, MenuProductQuantityTier[]>();
            for (const raw of tierData as Record<string, unknown>[]) {
              const pid = String(raw.product_id ?? '');
              if (!pid) continue;
              const tier: MenuProductQuantityTier = {
                id: String(raw.id ?? ''),
                preset: String(raw.preset ?? 'custom'),
                label: String(raw.label ?? ''),
                price_cents: Math.round(Number(raw.price_cents) || 0),
                sort_order: Number(raw.sort_order) || 0,
              };
              const cur = tm.get(pid) ?? [];
              cur.push(tier);
              tm.set(pid, cur);
            }
            rows = rows.map((r) => ({
              ...r,
              quantity_tiers: tm.get(r.id) ?? [],
            }));
          }
        }
        if (!cancelled) setRawCatalog(rows);

        let mode: MenuSourceMode = 'manual';
        let hidden = new Set<string>();
        const [setRes, profRes] = await Promise.all([
          supabase.from('vendor_menu_settings').select('menu_source_mode').eq('vendor_id', vendorId).maybeSingle(),
          supabase.from('vendor_menu_profiles').select('id,region_key,is_master').eq('vendor_id', vendorId),
        ]);
        if (!cancelled && !setRes.error && setRes.data?.menu_source_mode) {
          const m = String(setRes.data.menu_source_mode);
          if (m === 'manual' || m === 'pos' || m === 'hybrid') mode = m as MenuSourceMode;
        }
        if (!cancelled && !profRes.error && profRes.data?.length) {
          const pid = pickMenuProfileId(profRes.data as { id: string; region_key: string; is_master: boolean }[], vendorState);
          if (pid) {
            const { data: hid } = await supabase
              .from('vendor_menu_profile_hidden_products')
              .select('product_id')
              .eq('profile_id', pid);
            if (!cancelled && hid) {
              hidden = new Set(hid.map((r) => String(r.product_id)));
            }
          }
        }
        if (!cancelled) {
          setMenuSourceMode(mode);
          setHiddenProductIds(hidden);
        }

        const rawDeals = (dealRes.data || []) as Record<string, unknown>[];
        const normalized: PublicMenuDeal[] = rawDeals.map((row) => {
          const opts = (row.deal_options as BasePublicMenuDeal['deal_options']) ?? null;
          return {
            id: String(row.id),
            title: String(row.title ?? ''),
            discount_percent: Math.min(100, Math.max(0, Number(row.discount_percent ?? 0))),
            products: Array.isArray(row.products) ? (row.products as string[]) : [],
            deal_options: opts,
            image_url: dealPromoImageUrl({
              image_url: typeof row.image_url === 'string' ? row.image_url : null,
              deal_options: opts,
            }),
            region_keys: Array.isArray(row.region_keys) ? (row.region_keys as string[]) : null,
            start_date: String(row.start_date ?? ''),
            end_date: String(row.end_date ?? ''),
            starts_at: row.starts_at != null ? String(row.starts_at) : null,
            ends_at: row.ends_at != null ? String(row.ends_at) : null,
          };
        });
        if (dealRes.error) {
          console.warn('Listing menu deals:', dealRes.error);
          setDeals([]);
        } else {
          const visible = normalized.filter(
            (d) => dealIsActiveNow(d) && dealAppliesToStoreRegion(d.region_keys, vendorState)
          );
          setDeals(visible);
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorId, vendorState, vendorsSchema]);

  const addProductToCart = (
    p: ListingMenuProduct,
    tier: { tierId: string; quantityLabel: string; listPriceCents: number } | null = null,
    priceCentsOverride?: number
  ) => {
    if (!p.in_stock) {
      toast({
        title: 'Out of stock',
        description: 'This item is not available right now.',
        variant: 'destructive',
      });
      return;
    }

    const priceCents =
      typeof priceCentsOverride === 'number'
        ? priceCentsOverride
        : shopperMenuChargeCents(p, deals, selectedDealId, tier?.listPriceCents).chargeCents;

    const brandLabel = resolveMenuBrandLabel({
      linkedBrandName: p.brands?.name,
      brandDisplayName: p.brand_display_name,
      storeName: vendorName,
    });
    const line = {
      vendorId,
      vendorName,
      productId: p.id,
      tierId: tier?.tierId ?? null,
      quantityLabel: tier?.quantityLabel ?? null,
      name: p.name,
      priceCents,
      image:
        menuProductHeroImageUrlWithDeal(
          p,
          bestDealForProduct(p.id, deals, selectedDealId, tier?.listPriceCents ?? p.price_cents)
        ),
      thc: p.potency_thc,
      cbd: p.potency_cbd,
      quantity: 1,
      brandLabel,
    };

    const r = addItem(line);
    if (r.ok) {
      toast({ title: 'Added to cart', description: p.name });
      if (embedListingTopUrl) navigateEmbedTop();
      return;
    }
    if (r.reason === 'DIFFERENT_VENDOR') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(
          `Your cart has items from ${r.currentVendorName}. Replace the cart with ${vendorName}?`
        );
      if (ok) {
        replaceCartWith({
          kind: 'vendors',
          ...line,
          tierId: line.tierId,
          quantityLabel: line.quantityLabel,
          quantity: 1,
        });
        toast({ title: 'Cart updated', description: `${p.name} from ${vendorName}` });
        if (embedListingTopUrl) navigateEmbedTop();
      }
      return;
    }
    if (r.reason === 'SCHEMA_MIX') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Your cart is from a different storefront. Replace it with this shop?');
      if (ok) {
        replaceCartWith({
          kind: 'vendors',
          vendorId,
          vendorName,
          productId: p.id,
          tierId: line.tierId,
          quantityLabel: line.quantityLabel,
          name: p.name,
          priceCents,
          image: line.image,
          thc: p.potency_thc,
          cbd: p.potency_cbd,
          quantity: 1,
          brandLabel: line.brandLabel,
        });
        toast({ title: 'Cart updated', description: p.name });
        if (embedListingTopUrl) navigateEmbedTop();
      }
    }
  };

  const selectedDeal = useMemo(
    () => (selectedDealId ? deals.find((d) => d.id === selectedDealId) ?? null : null),
    [deals, selectedDealId]
  );

  const productSetFromDeal = useMemo(() => {
    if (!selectedDeal?.products?.length) return null;
    return new Set(selectedDeal.products);
  }, [selectedDeal]);

  const basePool = useMemo(() => {
    if (!productSetFromDeal) return items;
    return items.filter((i) => productSetFromDeal.has(i.id));
  }, [items, productSetFromDeal]);

  const saleTabCount = useMemo(
    () => basePool.filter((p) => menuProductPriceBand(p, deals, null).onSale).length,
    [basePool, deals]
  );

  const browsePool = useMemo(() => {
    if (browseTab === 'sale') {
      return basePool.filter((p) => menuProductPriceBand(p, deals, null).onSale);
    }
    return basePool.filter((p) => !p.is_featured);
  }, [basePool, browseTab, deals]);

  const categoriesPresent = useMemo(() => {
    const keys = new Set(browsePool.map((i) => menuFilterKey(i.category)).filter(Boolean));
    const ordered = CATEGORY_ORDER.filter((c) => keys.has(c));
    const extras = Array.from(keys).filter((c) => !CATEGORY_ORDER.includes(c));
    extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [...ordered, ...extras];
  }, [browsePool]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of browsePool) {
      const k = menuFilterKey(i.category);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [browsePool]);

  const sortMenuRows = useCallback(
    (base: ListingMenuProduct[]) => {
      const rows = [...base];
      const effective = (p: ListingMenuProduct) => menuProductPriceBand(p, deals, selectedDealId).fromCents;
      rows.sort((a, b) => {
        switch (sort) {
          case 'price_asc':
            return effective(a) - effective(b);
          case 'price_desc':
            return effective(b) - effective(a);
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          default:
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
      });
      return rows;
    },
    [deals, selectedDealId, sort]
  );

  const matchesCategoryFilter = useCallback((i: ListingMenuProduct, cat: string) => {
    if (cat === 'all') return true;
    if (cat === 'preroll') return i.category === 'preroll' || i.category === 'vape';
    return i.category === cat;
  }, []);

  const singleCategoryRows = useMemo(() => {
    if (category === 'all') return [];
    return sortMenuRows(browsePool.filter((i) => matchesCategoryFilter(i, category)));
  }, [browsePool, category, matchesCategoryFilter, sortMenuRows]);

  const groupedSections = useMemo(() => {
    if (category !== 'all') return null;
    return categoriesPresent
      .map((c) => ({
        key: c,
        label: formatCategory(c),
        items: sortMenuRows(browsePool.filter((i) => menuFilterKey(i.category) === c)),
      }))
      .filter((s) => s.items.length > 0);
  }, [category, categoriesPresent, browsePool, sortMenuRows]);

  const menuListEmpty =
    category === 'all' ? browsePool.length === 0 : singleCategoryRows.length === 0;

  const fullMenuFlatRows = useMemo(
    () => sortMenuRows(browsePool),
    [browsePool, sortMenuRows]
  );

  const featuredRailItems = useMemo(() => {
    return items
      .filter((p) => Boolean(p.is_featured))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items]);

  if (!vendorsSchema) {
    return (
      <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
        <Package className="mx-auto mb-4 h-14 w-14 text-gray-600" />
        <h3 className="mb-2 text-xl font-bold text-white">Menu on Treehouse</h3>
        <p className="mx-auto max-w-lg text-gray-400 leading-relaxed">
          Live menus with categories and sorting are available for shops on the DaTreehouse licensed catalog. If you’re
          running the legacy storefront schema, ask your admin to enable the vendors + products setup.
        </p>
      </Card>
    );
  }

  if (loading) {
    return <TreehouseSmokingLoader label="Loading menu…" compact />;
  }

  if (loadError) {
    return (
      <Card className="border-amber-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
        <p className="text-amber-200/90">We couldn’t load this menu right now. Try refreshing the page.</p>
      </Card>
    );
  }

  if (rawCatalog.length === 0) {
    return (
      <Card className="border-green-900/25 bg-gradient-to-br from-gray-900 to-black p-10 text-center">
        <Sprout className="mx-auto mb-4 h-14 w-14 text-green-600/70" />
        <h3 className="mb-2 text-xl font-bold text-white">No items on the menu yet</h3>
        <p className="mx-auto max-w-md text-gray-400 leading-relaxed">
          This shop doesn’t have any live listings right now. Menus are still filling in across DaTreehouse — check back
          soon, or contact the store directly.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <MenuProductDetailSheet
        open={menuSheetOpen}
        onOpenChange={onMenuSheetOpenChange}
        product={menuSheetProduct}
        vendorName={vendorName}
        deals={deals}
        selectedDealId={selectedDealId}
        formatCategory={formatCategory}
        onAddToCart={(p, tier) => addProductToCart(p, tier)}
        brandLinkTarget={brandLinkTarget}
      />
      {featuredRailItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <h3 className="text-base font-semibold text-white">Featured picks</h3>
            <span className="text-xs text-gray-500">Store highlights</span>
          </div>
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex snap-x snap-mandatory gap-3">
              {featuredRailItems.map((p) => {
                const strainRow = parseStrainsEmbed(p);
                const rowDeal = bestDealForProduct(p.id, deals, selectedDealId, p.price_cents);
                const heroUrl = menuProductHeroImageUrlWithDeal(p, rowDeal);
                const band = menuProductPriceBand(p, deals, selectedDealId);
                const saleCents = band.fromCents;
                const onSale = band.onSale;
                const hasTiers = sortedQuantityTiers(p.quantity_tiers).length > 0;
                const brandLabel = resolveMenuBrandLabel({
                  linkedBrandName: p.brands?.name,
                  brandDisplayName: p.brand_display_name,
                  storeName: vendorName,
                });
                const skuTitleStyle = menuSkuTitleStyle(p.menu_text_color);
                return (
                  <li key={`featured-${p.id}`} className="w-[min(100%,17rem)] min-w-[14.5rem] max-w-[17rem] snap-start sm:min-w-[15rem]">
                    <VendorSkuCardFrame
                      theme={cardTheme}
                      className="h-full overflow-hidden border-green-700/30"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex cursor-pointer gap-2.5 p-2 outline-none ring-green-500/40 focus-visible:ring-2 sm:gap-3 sm:p-2.5"
                        onClick={() => openMenuProductSheet(p)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openMenuProductSheet(p);
                          }
                        }}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-950/80 sm:h-16 sm:w-16">
                          {heroUrl || strainRow?.slug ? (
                            <StrainHeroImage
                              preferredUrl={heroUrl ?? undefined}
                              slug={strainRow?.slug ?? ''}
                              imageUrl={strainRow?.image_url}
                              alt=""
                              maxCandidates={6}
                              className="h-full w-full"
                              imgClassName={menuThumbImgClassName(heroUrl)}
                              placeholder={
                                <div className="flex h-full w-full items-center justify-center text-gray-600">
                                  <Package className="h-6 w-6 opacity-40" aria-hidden />
                                </div>
                              }
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-600">
                              <Package className="h-6 w-6 opacity-40" aria-hidden />
                            </div>
                          )}
                          <Badge className="absolute left-0.5 top-0.5 border border-amber-400/50 bg-amber-500/90 px-1 py-0 text-[8px] text-black">
                            Featured
                          </Badge>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                          <ProductBrandCardChip
                            label={brandLabel}
                            className="w-fit max-w-full"
                            href={brandShowcaseHref(p)}
                            linkTarget={brandLinkTarget}
                          />
                          <p
                            className={`line-clamp-2 text-left text-xs font-semibold leading-tight${skuTitleStyle ? '' : ' text-white'}`}
                            style={skuTitleStyle}
                          >
                            {p.name}
                          </p>
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              {onSale ? (
                                <div className="flex flex-wrap items-baseline gap-1">
                                  {band.showFrom ? (
                                    <span className="text-[10px] text-gray-500">from</span>
                                  ) : null}
                                  <span className="text-sm font-bold text-green-400">${(saleCents / 100).toFixed(2)}</span>
                                  <span className="text-[10px] text-gray-500 line-through">
                                    ${(band.fromListCents / 100).toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-green-400">
                                  {band.showFrom ? (
                                    <span className="text-[10px] font-normal text-gray-500">from </span>
                                  ) : null}
                                  ${(saleCents / 100).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!p.in_stock}
                              className="h-7 shrink-0 bg-green-600 px-2 text-[11px] text-white hover:bg-green-700 disabled:opacity-40"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasTiers) openMenuProductSheet(p);
                                else addProductToCart(p, null);
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </VendorSkuCardFrame>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {menuSourceMode === 'pos' && items.length === 0 && (
        <Card className="border-amber-900/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <strong className="text-white">POS menu mode:</strong> nothing is linked yet. The store is only showing products
          that have a POS id (
          <code className="text-green-300/90">pos_external_id</code>
          ). Ask them to run a sync or switch to hybrid / manual under Menu source.
        </Card>
      )}
      {menuSourceMode === 'hybrid' && hiddenProductIds.size > 0 && (
        <p className="text-xs text-gray-500">
          This region’s menu may exclude some SKUs the store hid for your area ({hiddenProductIds.size} hidden).
        </p>
      )}
      {deals.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-400">Active deals — tap to filter the menu</p>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedDealId(null)}
              className={`flex w-[140px] flex-shrink-0 flex-col overflow-hidden rounded-xl border text-left transition ${
                selectedDealId === null
                  ? 'border-green-500/70 bg-green-950/40 ring-1 ring-green-500/40'
                  : 'border-green-900/30 bg-gray-900/60 hover:border-green-700/50'
              }`}
            >
              <div className="flex aspect-[2/1] items-center justify-center bg-gray-950/90">
                <Package className="h-10 w-10 text-gray-600" aria-hidden />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-white">Full menu</p>
                <p className="text-[10px] text-gray-500">All items</p>
              </div>
            </button>
            {deals.map((d) => {
              const img = (dealPromoImageUrl(d) || '').trim();
              const active = selectedDealId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDealId(d.id)}
                  className={`flex w-[140px] flex-shrink-0 flex-col overflow-hidden rounded-xl border text-left transition ${
                    active
                      ? 'border-green-500/70 bg-green-950/40 ring-1 ring-green-500/40'
                      : 'border-green-900/30 bg-gray-900/60 hover:border-green-700/50'
                  }`}
                >
                  <div className="relative aspect-[2/1] w-full bg-gray-950">
                    {img ? (
                      <OptimizedImg src={img} alt="" className="h-full w-full object-cover" preset="thumb" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-900/40 to-gray-950">
                        <Tag className="h-10 w-10 text-green-500/60" aria-hidden />
                      </div>
                    )}
                    <div className="absolute left-1.5 top-1.5">
                      <Badge className="bg-red-600/95 px-1.5 py-0 text-[10px] text-white">
                        {d.discount_percent}% off
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-semibold leading-tight text-white">{d.title}</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">{formatDealRegionLabel(d.region_keys)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDeal && (!selectedDeal.products?.length ? (
            <p className="mt-2 text-sm text-amber-200/90">
              This deal doesn’t list specific menu SKUs yet — choose <span className="text-white">Full menu</span> or ask
              the store to attach products to the deal.
            </p>
          ) : null)}
        </div>
      )}

      <div
        id="store-menu-browse"
        className="space-y-4 rounded-xl border border-green-900/20 bg-gradient-to-b from-zinc-950/80 to-black/40 p-3 sm:p-4"
      >
            <div className="flex flex-col gap-2 border-b border-green-900/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Browse by</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={browseTab === 'menu' ? 'default' : 'outline'}
                  className={
                    browseTab === 'menu'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }
                  onClick={() => {
                    setBrowseTab('menu');
                    setCategory('all');
                  }}
                >
                  Catalog
                  <span className="ml-1.5 tabular-nums text-xs opacity-90">
                    {basePool.filter((p) => !p.is_featured).length}
                  </span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={browseTab === 'sale' ? 'default' : 'outline'}
                  className={
                    browseTab === 'sale'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  }
                  onClick={() => {
                    setBrowseTab('sale');
                    setCategory('all');
                  }}
                >
                  <TicketPercent className="mr-1 h-3.5 w-3.5" aria-hidden />
                  On sale
                  <span className="ml-1.5 tabular-nums text-xs opacity-90">{saleTabCount}</span>
                </Button>
              </div>
            </div>
            <div className="sticky top-14 z-20 -mx-3 border-b border-green-900/25 bg-black/90 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:top-16 sm:px-4 lg:top-20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {browseTab === 'sale' ? 'Sale items by category' : 'Categories'}
                  </p>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1"
                    role="tablist"
                    aria-label="Product categories"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={category === 'all'}
                      onClick={() => setCategory('all')}
                      className={cn(
                        'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50',
                        category === 'all'
                          ? 'border-green-500/70 bg-green-950/55 text-white shadow-sm ring-1 ring-green-500/30'
                          : 'border-zinc-700/80 bg-zinc-900/60 text-zinc-300 hover:border-green-800/60 hover:text-white'
                      )}
                    >
                      {browseTab === 'sale' ? 'All deals here' : 'All types'}
                      <span className="ml-1.5 tabular-nums text-xs font-normal text-zinc-500">{browsePool.length}</span>
                    </button>
                    {categoriesPresent.map((c) => {
                      const n = categoryCounts.get(c) ?? 0;
                      return (
                        <button
                          key={c}
                          type="button"
                          role="tab"
                          aria-selected={category === c}
                          onClick={() => setCategory(c)}
                          className={cn(
                            'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50',
                            category === c
                              ? 'border-green-500/70 bg-green-950/55 text-white shadow-sm ring-1 ring-green-500/30'
                              : 'border-zinc-700/80 bg-zinc-900/60 text-zinc-300 hover:border-green-800/60 hover:text-white'
                          )}
                        >
                          {formatCategory(c)}
                          <span className="ml-1.5 tabular-nums text-xs font-normal text-zinc-500">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  {category === 'all' && categoriesPresent.length > 1 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      {browseTab === 'sale'
                        ? 'Shelf markdowns and active store deals (best price when no deal chip is selected). Tap a type to narrow.'
                        : 'Items are grouped by type below. Tap a category chip to focus one type, or use the jump links on larger screens.'}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:min-w-[200px]">
                  <label className="sr-only" htmlFor="menu-sort-select">
                    Sort products
                  </label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger
                      id="menu-sort-select"
                      className="w-full border-green-900/35 bg-zinc-900/90 text-white lg:w-[200px]"
                    >
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                      <SelectItem value="name">Name (A–Z)</SelectItem>
                      <SelectItem value="price_asc">Price: low to high</SelectItem>
                      <SelectItem value="price_desc">Price: high to low</SelectItem>
                      <SelectItem value="newest">Newest listed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {menuListEmpty ? (
              <Card className="border-green-900/25 bg-gray-900/40 p-8 text-center">
                <p className="text-gray-300">
                  {selectedDeal
                    ? 'No menu items in this deal match your filters right now.'
                    : menuSourceMode === 'pos' && items.length === 0
                      ? 'No POS-linked products match these filters.'
                      : 'No items in this category right now.'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {selectedDeal
                    ? 'Clear the deal chip (Full menu) or switch category.'
                    : browseTab === 'sale'
                      ? 'Nothing is marked on sale right now — try Catalog or ask the store to add shelf markdowns or deals.'
                      : menuSourceMode === 'pos'
                        ? 'The store may still be connecting inventory from Dutchie, Blaze, or another POS.'
                        : 'Try another category or switch back to Catalog.'}
                </p>
              </Card>
            ) : category === 'all' && groupedSections && groupedSections.length > 0 ? (
              <div className="lg:grid lg:grid-cols-[minmax(0,10.5rem)_1fr] lg:gap-8 lg:items-start">
                <nav className="mb-6 hidden lg:block" aria-label="Jump to category">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Jump to</p>
                  <ul className="sticky top-36 space-y-0.5 border-l border-zinc-800 pl-3">
                    <li>
                      <a
                        href="#store-menu-browse"
                        className="block rounded py-1.5 text-xs text-zinc-400 transition hover:text-white"
                      >
                        ↑ Menu top
                      </a>
                    </li>
                    {groupedSections.map((s) => (
                      <li key={s.key}>
                        <a
                          href={`#menu-section-${s.key}`}
                          className="block rounded py-1.5 text-xs text-zinc-400 transition hover:text-white"
                        >
                          <span className="text-zinc-200">{s.label}</span>
                          <span className="ml-1 tabular-nums text-zinc-600">{s.items.length}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="min-w-0 space-y-12">
                  {groupedSections.map((section) => (
                    <section key={section.key} id={`menu-section-${section.key}`} className="scroll-mt-36">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-green-900/30 pb-3">
                        <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{section.label}</h3>
                        <span className="text-sm text-zinc-500">{section.items.length} products</span>
                      </div>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                        {section.items.map((p) => (
                          <li key={p.id}>
                            <MenuListingSkuCard
                              p={p}
                              cardTheme={cardTheme}
                              deals={deals}
                              selectedDealId={selectedDealId}
                              vendorName={vendorName}
                              onOpenSheet={openMenuProductSheet}
                              onAddToCart={(prod) => addProductToCart(prod, null)}
                              formatCategoryFn={formatCategory}
                              brandLinkTarget={brandLinkTarget}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
                {(category === 'all' ? fullMenuFlatRows : singleCategoryRows).map((p) => (
                  <li key={p.id}>
                    <MenuListingSkuCard
                      p={p}
                      cardTheme={cardTheme}
                      deals={deals}
                      selectedDealId={selectedDealId}
                      vendorName={vendorName}
                      onOpenSheet={openMenuProductSheet}
                      onAddToCart={(prod) => addProductToCart(prod, null)}
                      formatCategoryFn={formatCategory}
                      brandLinkTarget={brandLinkTarget}
                    />
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  );
}
