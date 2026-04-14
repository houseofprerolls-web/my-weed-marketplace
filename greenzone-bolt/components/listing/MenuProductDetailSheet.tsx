'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Package, ShoppingCart, TicketPercent } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';
import { TreehouseCatalogVerifiedBadge } from '@/components/brand/TreehouseCatalogVerifiedBadge';
import { dealPromoImageUrl, menuThumbUsesPlaceholderFit, parseStrainsEmbed } from '@/lib/strainProductImage';
import { resolveMenuBrandLabel } from '@/lib/productBrandLabel';
import { ProductBrandCardChip } from '@/components/product/ProductThumbnailBrandTab';
import type { ListingMenuProduct, PublicMenuDeal } from '@/components/listing/ListingPublicMenu';
import { shopperMenuChargeCents, sortedQuantityTiers } from '@/lib/vendorMenuProductPricing';
import { menuSkuTitleStyle } from '@/lib/menuTextColor';

type DealOptions = { promo_code?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ListingMenuProduct | null;
  vendorName: string;
  deals: PublicMenuDeal[];
  selectedDealId: string | null;
  formatCategory: (cat: string) => string;
  onAddToCart: (
    p: ListingMenuProduct,
    tier: { tierId: string; quantityLabel: string; listPriceCents: number } | null
  ) => void;
  /** When the menu is iframed, open brand links in the top window */
  brandLinkTarget?: React.HTMLAttributeAnchorTarget;
};

export function MenuProductDetailSheet({
  open,
  onOpenChange,
  product,
  vendorName,
  deals,
  selectedDealId,
  formatCategory,
  onAddToCart,
  brandLinkTarget,
}: Props) {
  const tiers = product ? sortedQuantityTiers(product.quantity_tiers) : [];
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  useEffect(() => {
    const t = product ? sortedQuantityTiers(product.quantity_tiers) : [];
    setSelectedTierId(t[0]?.id ?? null);
  }, [product?.id]);

  const selectedTier = tiers.find((x) => x.id === selectedTierId) ?? tiers[0] ?? null;

  const strainRow = product ? parseStrainsEmbed(product) : null;
  const listPriceCents = product
    ? selectedTier
      ? selectedTier.price_cents
      : product.price_cents
    : 0;
  const pricing = product
    ? shopperMenuChargeCents(product, deals, selectedDealId, selectedTier?.price_cents)
    : { chargeCents: 0, deal: null as PublicMenuDeal | null, shelfSalePct: null as number | null };
  const saleCents = pricing.chargeCents;
  const rowDeal = pricing.deal;
  const productImg =
    product && Array.isArray(product.images) && product.images.length > 0
      ? String(product.images[0] ?? '').trim() || null
      : null;
  const dealHero = rowDeal ? dealPromoImageUrl(rowDeal) : null;
  const img = dealHero || productImg;
  const onSale = Boolean(product && saleCents < listPriceCents);
  const offPct = rowDeal ? rowDeal.discount_percent : product?.sale_discount_percent ?? null;
  const listPrice = (listPriceCents / 100).toFixed(2);
  const salePrice = (saleCents / 100).toFixed(2);
  const promoCode = (rowDeal?.deal_options as DealOptions | null)?.promo_code?.trim();
  const brandLabel = product
    ? resolveMenuBrandLabel({
        linkedBrandName: product.brands?.name,
        brandDisplayName: product.brand_display_name,
        storeName: vendorName,
      })
    : '';
  const brandPageHref =
    product?.brand_id &&
    product.brands?.slug &&
    product.brands?.verified === true
      ? `/brands/${encodeURIComponent(product.brands.slug)}`
      : undefined;
  const sheetTitleStyle = product ? menuSkuTitleStyle(product.menu_text_color) : undefined;

  const desc = product?.description?.trim();
  const potencyBits: string[] = [];
  if (product?.potency_thc != null) potencyBits.push(`THC ${product.potency_thc}%`);
  if (product?.potency_cbd != null) potencyBits.push(`CBD ${product.potency_cbd}%`);
  const potencyLine = potencyBits.join(' · ');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {product ? (
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto border-green-900/40 bg-gray-950 p-0 text-gray-100 sm:max-w-md"
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-background sm:max-h-[min(50vh,22rem)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Back to menu"
              className="pointer-events-auto ml-2 mt-[max(0.5rem,env(safe-area-inset-top,0px))] gap-1 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-sm font-medium text-white shadow-md backdrop-blur-sm hover:bg-black/70 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
              Back
            </Button>
          </div>
          {img || strainRow?.slug ? (
            <StrainHeroImage
              preferredUrl={img}
              slug={strainRow?.slug ?? ''}
              imageUrl={strainRow?.image_url}
              alt={product.name}
              maxCandidates={8}
              className="h-full w-full"
              imgClassName={
                menuThumbUsesPlaceholderFit(img)
                  ? 'h-full w-full object-contain object-center bg-zinc-900 p-3 sm:p-6'
                  : 'h-full w-full object-cover'
              }
              photoFit="cover"
              placeholder={
                <div className="flex h-full w-full items-center justify-center bg-gray-950 text-gray-600">
                  <Package className="h-14 w-14 opacity-40" aria-hidden />
                </div>
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Package className="h-14 w-14 opacity-40" aria-hidden />
            </div>
          )}
          {product.catalog_product_id ? (
            <TreehouseCatalogVerifiedBadge className="absolute right-3 top-3 z-[2]" />
          ) : null}
          {onSale && offPct != null ? (
            <Badge className="absolute left-3 top-3 max-md:top-14 border border-red-400/40 bg-red-600 text-sm font-bold text-white shadow-md">
              {offPct}% off
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6 pt-5">
          <SheetHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <ProductBrandCardChip label={brandLabel} href={brandPageHref} linkTarget={brandLinkTarget} />
              <Badge variant="outline" className="border-green-700/50 text-xs text-green-400/90">
                {formatCategory(product.category)}
              </Badge>
              {!product.in_stock ? (
                <Badge variant="secondary" className="bg-gray-800 text-gray-400">
                  Out of stock
                </Badge>
              ) : null}
            </div>
            <SheetTitle
              className={`pr-8 text-xl leading-snug${sheetTitleStyle ? '' : ' text-white'}`}
              style={sheetTitleStyle}
            >
              {product.name}
            </SheetTitle>
            <SheetDescription asChild>
              <div className="space-y-2 text-left text-gray-400">
                {desc ? (
                  <p className="text-sm leading-relaxed text-gray-300">{desc}</p>
                ) : (
                  <p className="text-sm italic text-gray-500">No description for this item.</p>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {potencyLine ? <p className="text-sm text-gray-400">{potencyLine}</p> : null}

          {strainRow?.slug ? (
            <p className="text-sm">
              <Link
                href={`/strains/${strainRow.slug}`}
                className="text-green-400 underline-offset-2 hover:text-green-300 hover:underline"
              >
                View strain profile
              </Link>
            </p>
          ) : null}

          {promoCode && onSale ? (
            <p className="font-mono text-sm text-amber-200/90">
              <TicketPercent className="mr-1 inline h-4 w-4" aria-hidden />
              Code at checkout: {promoCode}
            </p>
          ) : null}

          {tiers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">Quantity</p>
              <Select
                value={selectedTierId ?? tiers[0]?.id ?? ''}
                onValueChange={(v) => setSelectedTierId(v)}
              >
                <SelectTrigger className="border-green-900/40 bg-gray-900 text-white">
                  <SelectValue placeholder="Choose amount" />
                </SelectTrigger>
                <SelectContent className="border-green-900/40 bg-gray-950 text-white">
                  {tiers.map((t) => {
                    const row = shopperMenuChargeCents(product!, deals, selectedDealId, t.price_cents);
                    const eff = (row.chargeCents / 100).toFixed(2);
                    const list = (t.price_cents / 100).toFixed(2);
                    const hit = row.chargeCents < t.price_cents;
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} — ${hit ? eff : list}
                        {hit ? ` (was $${list})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              {onSale ? (
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-400">${salePrice}</span>
                  <span className="text-sm text-gray-500 line-through">${listPrice}</span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-green-400">${listPrice}</span>
              )}
              <p className="mt-1 text-xs text-gray-500">{vendorName}</p>
            </div>
            <Button
              type="button"
              size="lg"
              disabled={!product.in_stock}
              className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
              onClick={() => {
                if (!product) return;
                if (!tiers.length) {
                  onAddToCart(product, null);
                  return;
                }
                const t = selectedTier;
                if (!t) return;
                onAddToCart(product, {
                  tierId: t.id,
                  quantityLabel: t.label,
                  listPriceCents: t.price_cents,
                });
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to cart
            </Button>
          </div>
        </div>
      </SheetContent>
      ) : null}
    </Sheet>
  );
}
