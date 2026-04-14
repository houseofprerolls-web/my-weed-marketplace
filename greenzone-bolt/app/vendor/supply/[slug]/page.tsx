'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { b2bListingTitle, type B2bListingRow } from '@/lib/b2bListingDisplay';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supplyCoverageBadge } from '@/lib/usStateCodes';
import { fetchApprovedCaListingMarketSlugsForVendorIds } from '@/lib/vendorListingMarketSlugs';
import { useSupplyRfqDraft } from '@/contexts/SupplyRfqDraftContext';
import { useToast } from '@/hooks/use-toast';
import { SupplyBuyerListingCard } from '@/components/supply/SupplyBuyerListingCard';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { sanitizeDisplayImageUrl } from '@/lib/optimizedImageUrl';
import {
  sortSupplyListingsForBuyer,
  type SupplyDealPin,
} from '@/lib/supplyBuyerListingSort';

type BrandEmbed = {
  logo_url: string | null;
  hero_image_url: string | null;
  tagline: string | null;
  slug: string;
} | null;

type SupplyAccount = {
  id: string;
  name: string;
  slug: string;
  account_type: string;
  contact_email: string | null;
  service_listing_market_slugs: string[] | null;
  service_notes: string | null;
  brand_id: string | null;
  brands?: BrandEmbed | BrandEmbed[] | null;
};

type CatalogProductEmbed = {
  name: string;
  images?: string[] | null;
  description?: string | null;
};

type ListingRow = B2bListingRow & {
  id: string;
  category: string;
  list_price_cents: number | null;
  moq: number | null;
  case_size: string | null;
  visibility: string;
  created_at: string;
  catalog_product_id: string | null;
  buyer_showcase_rank?: number | null;
  catalog_products?: CatalogProductEmbed | CatalogProductEmbed[] | null;
};

type ListingPromoBanner = { headline: string; discount_percent: number | null };

type DealRow = {
  id: string;
  headline: string;
  description: string | null;
  discount_percent: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  b2b_supply_deal_items?: { catalog_product_id: string }[] | null;
};

function normalizeBrand(embed: SupplyAccount['brands']): BrandEmbed {
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function firstCatalogProduct(row: ListingRow): CatalogProductEmbed | null {
  const cp = row.catalog_products;
  if (!cp) return null;
  return Array.isArray(cp) ? cp[0] ?? null : cp;
}

function dealMapFromRows(dealRows: DealRow[], nowIso: string): Map<string, SupplyDealPin> {
  const map = new Map<string, SupplyDealPin>();
  for (const d of dealRows) {
    if (!d.is_active) continue;
    if (d.starts_at && d.starts_at > nowIso) continue;
    if (d.ends_at && d.ends_at < nowIso) continue;
    const items = d.b2b_supply_deal_items ?? [];
    for (const it of items) {
      const pid = it.catalog_product_id;
      if (!pid || map.has(pid)) continue;
      map.set(pid, {
        catalogProductId: pid,
        headline: d.headline,
        discountPercent: d.discount_percent != null ? Number(d.discount_percent) : null,
      });
    }
  }
  return map;
}

export default function VendorSupplySupplierPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { ownedVendors } = useVendorBusiness({ adminMenuVendorId });
  const vendorIds = useMemo(() => ownedVendors.map((v) => v.id), [ownedVendors]);
  const [vendorMarketSlugs, setVendorMarketSlugs] = useState<string[]>([]);
  const [nameBySlug, setNameBySlug] = useState<Map<string, string>>(new Map());
  const { addOrUpdateLine, linesFor } = useSupplyRfqDraft();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: mkts } = await supabase
        .from('listing_markets')
        .select('slug,name')
        .eq('region_key', 'ca');
      if (!cancelled && mkts) {
        const m = new Map<string, string>();
        for (const r of mkts as { slug: string; name: string }[]) {
          m.set(String(r.slug).toLowerCase(), r.name);
        }
        setNameBySlug(m);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vendorIds.length) {
        setVendorMarketSlugs([]);
        return;
      }
      const slugs = await fetchApprovedCaListingMarketSlugsForVendorIds(supabase, vendorIds);
      if (!cancelled) setVendorMarketSlugs(slugs);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorIds]);

  const [account, setAccount] = useState<SupplyAccount | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [dealRows, setDealRows] = useState<DealRow[]>([]);
  const [listingPromos, setListingPromos] = useState<ListingPromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const { data: acc, error: aErr } = await supabase
      .from('supply_accounts')
      .select(
        'id,name,slug,account_type,contact_email,service_listing_market_slugs,service_notes,brand_id,brands(logo_url,hero_image_url,tagline,slug)'
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (aErr || !acc) {
      setError(aErr?.message || 'Supplier not found.');
      setAccount(null);
      setListings([]);
      setDealRows([]);
      setListingPromos([]);
      setLoading(false);
      return;
    }
    setAccount(acc as SupplyAccount);
    const now = new Date().toISOString();
    const accRow = acc as SupplyAccount;

    const { data: fullDeals } = await supabase
      .from('b2b_supply_deals')
      .select('id,headline,description,discount_percent,is_active,starts_at,ends_at,b2b_supply_deal_items(catalog_product_id)')
      .eq('supply_account_id', accRow.id);
    setDealRows((fullDeals as DealRow[]) ?? []);

    const { data: list, error: lErr } = await supabase
      .from('b2b_listings')
      .select(
        'id,title_override,catalog_product_id,category,list_price_cents,moq,case_size,visibility,created_at,buyer_showcase_rank,catalog_products(name,images,description)'
      )
      .eq('supply_account_id', accRow.id)
      .eq('visibility', 'live')
      .order('created_at', { ascending: false });
    if (lErr) {
      setError(lErr.message);
      setListings([]);
      setListingPromos([]);
    } else {
      const rows = (list as ListingRow[]) ?? [];
      setListings(rows);
      const lids = rows.map((l) => l.id);
      let activeListingPromos: ListingPromoBanner[] = [];
      if (lids.length) {
        const { data: pr } = await supabase
          .from('b2b_listing_promos')
          .select('headline,discount_percent,is_active,starts_at,ends_at')
          .in('listing_id', lids);
        activeListingPromos = (pr ?? []).filter((p) => {
          if (!(p as { is_active: boolean }).is_active) return false;
          const st = (p as { starts_at: string | null }).starts_at;
          const en = (p as { ends_at: string | null }).ends_at;
          if (st && st > now) return false;
          if (en && en < now) return false;
          return true;
        }) as ListingPromoBanner[];
      }
      setListingPromos(activeListingPromos);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const coverage = useMemo(() => {
    if (!account || vendorMarketSlugs.length === 0) return null;
    return supplyCoverageBadge(vendorMarketSlugs, account.service_listing_market_slugs, nameBySlug);
  }, [account, vendorMarketSlugs, nameBySlug]);

  const brand = account ? normalizeBrand(account.brands) : null;
  const heroUrl = brand?.hero_image_url ? sanitizeDisplayImageUrl(brand.hero_image_url) : '';
  const logoUrl = brand?.logo_url ? sanitizeDisplayImageUrl(brand.logo_url) : '';

  const dealByCatalog = useMemo(
    () => dealMapFromRows(dealRows, new Date().toISOString()),
    [dealRows]
  );

  const sortedListings = useMemo(
    () => sortSupplyListingsForBuyer(listings, dealByCatalog),
    [listings, dealByCatalog]
  );

  const draftLines = account ? linesFor(account.id) : [];
  const draftCount = draftLines.length;

  const spotlightDeals = useMemo(() => {
    const now = new Date().toISOString();
    return dealRows.filter((d) => {
      if (!d.is_active) return false;
      if (d.starts_at && d.starts_at > now) return false;
      if (d.ends_at && d.ends_at < now) return false;
      return true;
    });
  }, [dealRows]);

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-zinc-400 hover:text-white">
          <Link href={q('/vendor/supply/directory')} className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All suppliers
          </Link>
        </Button>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          </div>
        ) : error || !account ? (
          <Card className="border-sky-900/30 bg-zinc-900/50 p-6 text-zinc-300">{error || 'Not found.'}</Card>
        ) : (
          <>
            {/* Storefront hero */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-xl shadow-black/30">
              <div className="relative min-h-[140px] sm:min-h-[180px]">
                {heroUrl ? (
                  <OptimizedImg
                    src={heroUrl}
                    alt=""
                    preset="hero"
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
                <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
                  <div className="flex min-w-0 items-start gap-4">
                    {logoUrl ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-lg sm:h-20 sm:w-20">
                        <OptimizedImg src={logoUrl} alt="" preset="thumb" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300/90">Wholesale catalog</p>
                      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{account.name}</h1>
                      {brand?.tagline ? (
                        <p className="mt-2 max-w-xl text-sm text-zinc-300">{brand.tagline}</p>
                      ) : account.service_notes ? (
                        <p className="mt-2 max-w-xl text-sm text-zinc-300">{account.service_notes}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-zinc-900/80 text-zinc-200">{account.account_type}</Badge>
                        {coverage ? (
                          <Badge
                            variant="outline"
                            className={
                              coverage.kind === 'overlap'
                                ? 'border-emerald-700/60 text-emerald-300'
                                : coverage.kind === 'none'
                                  ? 'border-amber-800/60 text-amber-200/90'
                                  : 'border-zinc-600 text-zinc-400'
                            }
                          >
                            {coverage.label}
                          </Badge>
                        ) : null}
                        {account.contact_email ? (
                          <span className="self-center text-xs text-zinc-500">{account.contact_email}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    {draftCount > 0 ? (
                      <Badge variant="secondary" className="border-sky-800/50 bg-sky-950/80 text-sky-100">
                        <ShoppingBag className="mr-1 inline h-3.5 w-3.5" />
                        {draftCount} in RFQ
                      </Badge>
                    ) : null}
                    <Button asChild className="bg-sky-600 hover:bg-sky-500">
                      <Link href={q(`/vendor/supply/rfq?supplier=${encodeURIComponent(account.id)}`)}>
                        Review RFQ
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {spotlightDeals.length > 0 ? (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Active deals</h2>
                <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {spotlightDeals.map((d) => (
                    <Card
                      key={d.id}
                      className="min-w-[240px] max-w-[280px] shrink-0 border-amber-800/35 bg-gradient-to-br from-amber-950/40 to-zinc-950 p-4"
                    >
                      <p className="font-semibold text-amber-100">{d.headline}</p>
                      {d.discount_percent != null ? (
                        <p className="mt-1 text-sm text-amber-200/80">{Number(d.discount_percent)}% off eligible SKUs</p>
                      ) : null}
                      {d.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{d.description}</p>
                      ) : null}
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {listingPromos.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">SKU promos</h2>
                <ul className="flex flex-col gap-2">
                  {listingPromos.map((b, i) => (
                    <li
                      key={`${b.headline}-${i}`}
                      className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300"
                    >
                      <span className="font-medium text-zinc-200">{b.headline}</span>
                      {b.discount_percent != null ? (
                        <span className="text-zinc-500"> · {b.discount_percent}%</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sortedListings.length === 0 ? (
              <Card className="border-sky-900/30 bg-zinc-900/50 p-8 text-center text-zinc-400">
                No live products for this supplier yet.
              </Card>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Products</h2>
                    <p className="text-xs text-zinc-500">
                      Deal and featured SKUs appear first. Add to your RFQ without leaving the page.
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {sortedListings.length} SKU{sortedListings.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedListings.map((l) => {
                    const cat = firstCatalogProduct(l);
                    const img0 = cat?.images?.[0] ?? null;
                    const title = b2bListingTitle(l);
                    const deal =
                      l.catalog_product_id && dealByCatalog.has(l.catalog_product_id)
                        ? dealByCatalog.get(l.catalog_product_id)!
                        : null;
                    const rank = l.buyer_showcase_rank ?? null;
                    const draftLine = draftLines.find((x) => x.listingId === l.id);
                    const inDraft = !!draftLine;
                    const listPriceLabel =
                      l.list_price_cents != null
                        ? `List $${(l.list_price_cents / 100).toFixed(2)}`
                        : 'Contact for pricing';

                    return (
                      <SupplyBuyerListingCard
                        key={l.id}
                        title={title}
                        category={l.category}
                        imageUrl={img0}
                        listPriceLabel={listPriceLabel}
                        moq={l.moq}
                        caseSize={l.case_size}
                        deal={deal}
                        showcaseRank={rank != null && rank >= 1 ? rank : null}
                        inDraft={inDraft}
                        listingHref={q(`/vendor/supply/listing/${l.id}`)}
                        rfqHref={q(`/vendor/supply/rfq?supplier=${encodeURIComponent(account.id)}`)}
                        onAddToRfq={() => {
                          addOrUpdateLine(account.id, {
                            listingId: l.id,
                            titleSnapshot: title,
                            qty: draftLine?.qty ?? 1,
                            unit: draftLine?.unit ?? 'case',
                            targetPriceCents: draftLine?.targetPriceCents ?? null,
                          });
                          toast({
                            title: inDraft ? 'RFQ updated' : 'Added to RFQ',
                            description: `${title} · qty ${draftLine?.qty ?? 1} ${draftLine?.unit ?? 'case'}`,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
