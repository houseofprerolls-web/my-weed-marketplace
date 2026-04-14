'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Sprout, ShoppingCart, Tag, TicketPercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { dealAppliesToStoreRegion, formatDealRegionLabel } from '@/lib/dealRegions';
import {
  filterProductsByMenuSource,
  pickMenuProfileId,
  type MenuSourceMode,
} from '@/lib/vendorMenuMerge';

export type ListingMenuProduct = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  images: string[];
  potency_thc: number | null;
  potency_cbd: number | null;
  description: string | null;
  in_stock: boolean;
  created_at: string;
  pos_provider?: string | null;
  pos_external_id?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  flower: 'Flower',
  edible: 'Edibles',
  vape: 'Vapes',
  concentrate: 'Concentrates',
  topical: 'Topicals',
  preroll: 'Pre-rolls',
  other: 'Other',
};

const CATEGORY_ORDER = ['flower', 'preroll', 'vape', 'concentrate', 'edible', 'topical', 'other'];

function formatCategory(cat: string) {
  return CATEGORY_LABEL[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'newest';

type DealOptions = {
  hero_image_url?: string;
  badge_label?: string;
  promo_code?: string;
};

export type PublicMenuDeal = {
  id: string;
  title: string;
  discount_percent: number;
  products: string[];
  deal_options: DealOptions | null;
  region_keys: string[] | null;
  start_date: string;
  end_date: string;
};

type Props = { vendorId: string; vendorName: string; vendorState?: string | null };

function dealIsDateActive(d: { start_date: string; end_date: string }) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(d.start_date);
  const e = new Date(d.end_date);
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return t >= s && t <= e;
}

/** Store-wide when products array is empty; otherwise SKU must be listed. */
function dealCoversProduct(d: PublicMenuDeal, productId: string): boolean {
  const ids = d.products ?? [];
  if (ids.length === 0) return true;
  return ids.includes(productId);
}

function salePriceCents(listPriceCents: number, discountPercent: number): number {
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, Math.round(listPriceCents * (1 - pct / 100)));
}

/** Prefer selected deal when it covers the product; else highest discount among covering deals. */
function bestDealForProduct(
  productId: string,
  list: PublicMenuDeal[],
  selectedDealId: string | null
): PublicMenuDeal | null {
  const selected = selectedDealId ? list.find((d) => d.id === selectedDealId) : null;
  if (selected && dealCoversProduct(selected, productId)) {
    return selected;
  }
  const covering = list.filter((d) => dealCoversProduct(d, productId));
  if (covering.length === 0) return null;
  return covering.reduce((a, b) => (b.discount_percent > a.discount_percent ? b : a));
}

export function ListingPublicMenu({ vendorId, vendorName, vendorState = null }: Props) {
  const { addItem, replaceCartWith } = useCart();
  const { toast } = useToast();
  const [rawCatalog, setRawCatalog] = useState<ListingMenuProduct[]>([]);
  const [menuSourceMode, setMenuSourceMode] = useState<MenuSourceMode>('manual');
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [deals, setDeals] = useState<PublicMenuDeal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const items = useMemo(
    () => filterProductsByMenuSource(rawCatalog, menuSourceMode, hiddenProductIds),
    [rawCatalog, menuSourceMode, hiddenProductIds]
  );

  useEffect(() => {
    let cancelled = false;
    setCategory('all');
    setSort('name');
    setSelectedDealId(null);

    (async () => {
      setLoading(true);
      setLoadError(false);

      if (!isVendorsSchema()) {
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

      const fetchProductsCapped = async (withPos: boolean) => {
        const select = withPos
          ? 'id,name,category,price_cents,images,potency_thc,potency_cbd,description,in_stock,created_at,pos_provider,pos_external_id'
          : 'id,name,category,price_cents,images,potency_thc,potency_cbd,description,in_stock,created_at';

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

      const prodWithPos = await fetchProductsCapped(true);
      const prodRes =
        prodWithPos.error && /pos_provider|pos_external_id|column/i.test(prodWithPos.error.message || '')
          ? await fetchProductsCapped(false)
          : prodWithPos;

      const dealRes = await supabase
        .from('deals')
        .select('id,title,discount_percent,products,deal_options,region_keys,start_date,end_date')
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
        const rows = (prodRes.data || []) as ListingMenuProduct[];
        setRawCatalog(rows);

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
        const normalized: PublicMenuDeal[] = rawDeals.map((row) => ({
          id: String(row.id),
          title: String(row.title ?? ''),
          discount_percent: Math.min(100, Math.max(0, Number(row.discount_percent ?? 0))),
          products: Array.isArray(row.products) ? (row.products as string[]) : [],
          deal_options: (row.deal_options as DealOptions | null) ?? null,
          region_keys: Array.isArray(row.region_keys) ? (row.region_keys as string[]) : null,
          start_date: String(row.start_date ?? ''),
          end_date: String(row.end_date ?? ''),
        }));
        if (dealRes.error) {
          console.warn('Listing menu deals:', dealRes.error);
          setDeals([]);
        } else {
          const visible = normalized.filter(
            (d) => dealIsDateActive(d) && dealAppliesToStoreRegion(d.region_keys, vendorState)
          );
          setDeals(visible);
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [vendorId, vendorState]);

  const categoriesPresent = useMemo(() => {
    const s = new Set(items.map((i) => i.category).filter(Boolean));
    return CATEGORY_ORDER.filter((c) => s.has(c));
  }, [items]);

  const addProductToCart = (p: ListingMenuProduct, priceCentsOverride?: number) => {
    if (!p.in_stock) {
      toast({
        title: 'Out of stock',
        description: 'This item is not available right now.',
        variant: 'destructive',
      });
      return;
    }

    const deal = bestDealForProduct(p.id, deals, selectedDealId);
    const priceCents =
      typeof priceCentsOverride === 'number'
        ? priceCentsOverride
        : deal
          ? salePriceCents(p.price_cents, deal.discount_percent)
          : p.price_cents;

    const line = {
      vendorId,
      vendorName,
      productId: p.id,
      name: p.name,
      priceCents,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      thc: p.potency_thc,
      cbd: p.potency_cbd,
      quantity: 1,
    };

    const r = addItem(line);
    if (r.ok) {
      toast({ title: 'Added to cart', description: p.name });
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
          quantity: 1,
        });
        toast({ title: 'Cart updated', description: `${p.name} from ${vendorName}` });
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
          name: p.name,
          priceCents,
          image: line.image,
          thc: p.potency_thc,
          cbd: p.potency_cbd,
          quantity: 1,
        });
        toast({ title: 'Cart updated', description: p.name });
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

  const filteredSorted = useMemo(() => {
    let base =
      category === 'all' ? [...items] : items.filter((i) => i.category === category);
    if (productSetFromDeal) {
      base = base.filter((i) => productSetFromDeal.has(i.id));
    }
    const rows = base;
    const effective = (p: ListingMenuProduct) => {
      const d = bestDealForProduct(p.id, deals, selectedDealId);
      return d ? salePriceCents(p.price_cents, d.discount_percent) : p.price_cents;
    };
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
  }, [items, category, sort, productSetFromDeal, deals, selectedDealId]);

  if (!isVendorsSchema()) {
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
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" aria-hidden />
        <span className="sr-only">Loading menu</span>
      </div>
    );
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
              <div className="flex aspect-[4/3] items-center justify-center bg-gray-950/90">
                <Package className="h-10 w-10 text-gray-600" aria-hidden />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-white">Full menu</p>
                <p className="text-[10px] text-gray-500">All items</p>
              </div>
            </button>
            {deals.map((d) => {
              const img = d.deal_options?.hero_image_url?.trim();
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
                  <div className="relative aspect-[4/3] w-full bg-gray-950">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
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

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-400">Product type</p>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full border-green-900/30 bg-gray-900/80 text-white sm:w-[220px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent className="border-green-900/30 bg-gray-950 text-white">
              <SelectItem value="all">All types</SelectItem>
              {categoriesPresent.map((c) => (
                <SelectItem key={c} value={c}>
                  {formatCategory(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-400">Sort</p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full border-green-900/30 bg-gray-900/80 text-white sm:w-[220px]">
              <SelectValue />
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

      {filteredSorted.length === 0 ? (
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
              ? 'Clear the deal chip (Full menu) or switch product type.'
              : menuSourceMode === 'pos'
                ? 'The store may still be connecting inventory from Dutchie, Blaze, or another POS.'
                : 'Try “All types” or another product type.'}
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSorted.map((p) => {
            const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
            const rowDeal = bestDealForProduct(p.id, deals, selectedDealId);
            const saleCents = rowDeal ? salePriceCents(p.price_cents, rowDeal.discount_percent) : p.price_cents;
            const onSale = Boolean(rowDeal && saleCents < p.price_cents);
            const listPrice = (p.price_cents / 100).toFixed(2);
            const salePrice = (saleCents / 100).toFixed(2);
            const promoCode = rowDeal?.deal_options?.promo_code?.trim();
            return (
              <li key={p.id}>
                <Card className="h-full overflow-hidden border-green-900/25 bg-gradient-to-br from-gray-900 to-black transition hover:border-green-600/35">
                  <div className="relative aspect-[4/3] w-full bg-gray-950/80">
                    {img ? (
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600">
                        <Package className="h-12 w-12 opacity-40" aria-hidden />
                      </div>
                    )}
                    {onSale && rowDeal && (
                      <>
                        <div className="pointer-events-none absolute left-2 top-2 z-[1] flex flex-col gap-1">
                          <Badge className="border border-red-400/40 bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                            {rowDeal.discount_percent}% off
                          </Badge>
                        </div>
                        <div
                          className={`absolute bottom-0 left-0 right-0 z-[1] flex items-center justify-center gap-1.5 border-t-2 border-dashed border-amber-500/70 bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 px-2 py-1.5 text-amber-100 shadow-[0_-4px_12px_rgba(0,0,0,0.35)] ${
                            promoCode ? '' : 'py-1'
                          }`}
                          title={promoCode ? 'Use this code at checkout' : 'Promotional pricing'}
                        >
                          <TicketPercent className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                          {promoCode ? (
                            <span className="font-mono text-xs font-bold tracking-wide text-amber-50">{promoCode}</span>
                          ) : (
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/95">
                              Sale price
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-green-700/40 text-green-400/90">
                        {formatCategory(p.category)}
                      </Badge>
                      {!p.in_stock && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-400">
                          Out of stock
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold leading-snug text-white">{p.name}</h4>
                    {p.description && (
                      <p className="line-clamp-2 text-sm text-gray-500">{p.description}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          {onSale ? (
                            <>
                              <span className="text-lg font-bold text-green-400">${salePrice}</span>
                              <span className="text-sm text-gray-500 line-through">${listPrice}</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-green-400">${listPrice}</span>
                          )}
                        </div>
                        {(p.potency_thc != null || p.potency_cbd != null) && (
                          <span className="text-xs text-gray-500">
                            {p.potency_thc != null && <>THC {p.potency_thc}%</>}
                            {p.potency_thc != null && p.potency_cbd != null && ' · '}
                            {p.potency_cbd != null && <>CBD {p.potency_cbd}%</>}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!p.in_stock}
                        className="shrink-0 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
                        onClick={() => addProductToCart(p)}
                      >
                        <ShoppingCart className="mr-1.5 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
