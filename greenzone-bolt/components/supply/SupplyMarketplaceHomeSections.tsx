'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Flame, Sparkles, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supplyCoverageBadge } from '@/lib/usStateCodes';
import { fetchApprovedCaListingMarketSlugsForVendorIds } from '@/lib/vendorListingMarketSlugs';
import {
  SupplyDirectorySupplierCard,
  type SupplyDirectoryBrandEmbed,
  type SupplyDirectoryRow,
} from '@/components/supply/SupplyDirectorySupplierCard';

type DealRow = {
  id: string;
  supply_account_id: string;
  headline: string;
  description: string | null;
  discount_percent: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function normalizeBrandEmbed(raw: unknown): SupplyDirectoryBrandEmbed {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    if (!first) return null;
    return {
      logo_url: (first.logo_url as string) ?? null,
      hero_image_url: (first.hero_image_url as string) ?? null,
      page_theme: (first.page_theme as string) ?? null,
      slug: String(first.slug ?? ''),
      tagline: (first.tagline as string) ?? null,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    logo_url: (o.logo_url as string) ?? null,
    hero_image_url: (o.hero_image_url as string) ?? null,
    page_theme: (o.page_theme as string) ?? null,
    slug: String(o.slug ?? ''),
    tagline: (o.tagline as string) ?? null,
  };
}

function dealIsLive(d: DealRow, nowIso: string): boolean {
  if (!d.is_active) return false;
  if (d.starts_at && d.starts_at > nowIso) return false;
  if (d.ends_at && d.ends_at < nowIso) return false;
  return true;
}

export function SupplyMarketplaceHomeSections({ directoryHref }: { directoryHref: string }) {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { ownedVendors } = useVendorBusiness({ adminMenuVendorId });
  const vendorIds = useMemo(() => ownedVendors.map((v) => v.id), [ownedVendors]);

  const [rows, setRows] = useState<SupplyDirectoryRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [listingCounts, setListingCounts] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [vendorMarketSlugs, setVendorMarketSlugs] = useState<string[]>([]);
  const [nameBySlug, setNameBySlug] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: mkts } = await supabase.from('listing_markets').select('slug,name').eq('region_key', 'ca');
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

  const load = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const selectWithBrand =
      'id,name,slug,account_type,brand_id,service_listing_market_slugs,brands(logo_url,hero_image_url,page_theme,slug,tagline)';

    const [accRes, dealsRes, listRes] = await Promise.all([
      supabase.from('supply_accounts').select(selectWithBrand).eq('is_published', true).order('name'),
      supabase
        .from('b2b_supply_deals')
        .select('id,supply_account_id,headline,description,discount_percent,is_active,starts_at,ends_at')
        .eq('is_active', true),
      supabase.from('b2b_listings').select('supply_account_id').eq('visibility', 'live'),
    ]);

    let accounts: SupplyDirectoryRow[] = [];
    if (accRes.error) {
      const { data: flat, error: e2 } = await supabase
        .from('supply_accounts')
        .select('id,name,slug,account_type,brand_id,service_listing_market_slugs')
        .eq('is_published', true)
        .order('name');
      if (e2 || !flat) {
        console.error(accRes.error, e2);
        setRows([]);
        const dealRows = (dealsRes.data ?? []) as DealRow[];
        const t = new Date().toISOString();
        setDeals(dealRows.filter((d) => dealIsLive(d, t)));
        setListingCounts(new Map());
        setLoading(false);
        return;
      }
      const ids = Array.from(
        new Set((flat as { brand_id: string | null }[]).map((r) => r.brand_id).filter(Boolean) as string[])
      );
      let brandMap = new Map<string, SupplyDirectoryBrandEmbed>();
      if (ids.length) {
        const { data: brands, error: bErr } = await supabase
          .from('brands')
          .select('id,logo_url,hero_image_url,page_theme,slug,tagline')
          .in('id', ids);
        if (!bErr && brands) {
          for (const br of brands as {
            id: string;
            logo_url: string | null;
            hero_image_url: string | null;
            page_theme: string | null;
            slug: string;
            tagline: string | null;
          }[]) {
            brandMap.set(br.id, {
              logo_url: br.logo_url,
              hero_image_url: br.hero_image_url,
              page_theme: br.page_theme,
              slug: br.slug,
              tagline: br.tagline,
            });
          }
        }
      }
      accounts = (flat as Omit<SupplyDirectoryRow, 'brands'>[]).map((r) => ({
        ...r,
        brands: r.brand_id ? brandMap.get(r.brand_id) ?? null : null,
      }));
    } else {
      const list = (accRes.data ?? []) as (Omit<SupplyDirectoryRow, 'brands'> & { brands?: unknown })[];
      accounts = list.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        account_type: r.account_type,
        brand_id: r.brand_id,
        service_listing_market_slugs: r.service_listing_market_slugs,
        brands: normalizeBrandEmbed(r.brands),
      }));
    }

    const counts = new Map<string, number>();
    if (!listRes.error && listRes.data) {
      for (const r of listRes.data as { supply_account_id: string }[]) {
        const id = r.supply_account_id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    const dealRows = (dealsRes.data ?? []) as DealRow[];
    const liveDeals = dealRows.filter((d) => dealIsLive(d, nowIso));

    setRows(accounts);
    setDeals(liveDeals);
    setListingCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slugByAccountId = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.id, r.slug);
    return m;
  }, [rows]);

  const { featured, trending } = useMemo(() => {
    const dealBoost = new Set(deals.map((d) => d.supply_account_id));
    const scored = rows.map((r) => {
      const lc = listingCounts.get(r.id) ?? 0;
      const b = r.brands;
      const score =
        (dealBoost.has(r.id) ? 1000 : 0) +
        lc * 12 +
        (b?.hero_image_url ? 40 : 0) +
        (b?.logo_url ? 15 : 0);
      return { r, score, lc };
    });
    scored.sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name));
    const featuredList = scored.slice(0, 6).map((x) => x.r);
    const featIds = new Set(featuredList.map((x) => x.id));
    const trendingList = scored
      .filter((x) => !featIds.has(x.r.id))
      .sort((a, b) => b.lc - a.lc || a.r.name.localeCompare(b.r.name))
      .slice(0, 6)
      .map((x) => x.r);
    return { featured: featuredList, trending: trendingList };
  }, [rows, deals, listingCounts]);

  const dealCards = useMemo(() => {
    return [...deals]
      .sort((a, b) => {
        const da = a.discount_percent != null ? Number(a.discount_percent) : -1;
        const db = b.discount_percent != null ? Number(b.discount_percent) : -1;
        if (db !== da) return db - da;
        return a.headline.localeCompare(b.headline);
      })
      .slice(0, 12);
  }, [deals]);

  const coverageFor = (r: SupplyDirectoryRow) =>
    vendorMarketSlugs.length > 0
      ? supplyCoverageBadge(vendorMarketSlugs, r.service_listing_market_slugs, nameBySlug)
      : null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-label="Loading marketplace" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Explore the marketplace</h2>
          <p className="mt-1 text-sm text-zinc-500">Featured suppliers, active wholesale deals, and trending catalogs.</p>
        </div>
        <Button asChild variant="outline" className="w-full border-sky-700/50 text-sky-100 hover:bg-sky-950/50 sm:w-auto">
          <Link href={directoryHref}>
            All suppliers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" aria-hidden />
          <h3 className="text-base font-semibold text-white">Featured suppliers</h3>
        </div>
        {featured.length === 0 ? (
          <Card className="border-sky-900/30 bg-zinc-900/40 p-6 text-sm text-zinc-500">No published suppliers yet.</Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => (
              <li key={r.id}>
                <SupplyDirectorySupplierCard
                  row={r}
                  href={q(`/vendor/supply/${encodeURIComponent(r.slug)}`)}
                  coverage={coverageFor(r)}
                  density="comfortable"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-sky-400" aria-hidden />
          <h3 className="text-base font-semibold text-white">Deals</h3>
        </div>
        {dealCards.length === 0 ? (
          <Card className="border-sky-900/30 bg-zinc-900/40 p-6 text-sm text-zinc-500">
            No active supply deals right now. Browse suppliers for live SKUs and RFQs.
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dealCards.map((d) => {
              const slug = slugByAccountId.get(d.supply_account_id);
              const href = slug ? q(`/vendor/supply/${encodeURIComponent(slug)}`) : directoryHref;
              return (
                <li key={d.id}>
                  <Link href={href}>
                    <Card className="h-full border-sky-900/35 bg-zinc-900/50 p-4 transition hover:border-sky-600/50 hover:bg-zinc-900/80">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-white">{d.headline}</p>
                        {d.discount_percent != null ? (
                          <Badge className="shrink-0 bg-sky-700/80 text-white">{Number(d.discount_percent)}% off</Badge>
                        ) : null}
                      </div>
                      {d.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{d.description}</p>
                      ) : null}
                      <p className="mt-3 text-xs font-medium text-sky-400">View supplier →</p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" aria-hidden />
          <h3 className="text-base font-semibold text-white">Trending suppliers</h3>
        </div>
        <p className="text-xs text-zinc-500">Ranked by number of live catalog SKUs on the exchange.</p>
        {trending.length === 0 ? (
          <Card className="border-sky-900/30 bg-zinc-900/40 p-6 text-sm text-zinc-500">
            {featured.length > 0
              ? 'Featured suppliers already cover the top catalogs — open the directory for the full list.'
              : 'No catalog activity yet.'}
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((r) => (
              <li key={r.id}>
                <SupplyDirectorySupplierCard
                  row={r}
                  href={q(`/vendor/supply/${encodeURIComponent(r.slug)}`)}
                  coverage={coverageFor(r)}
                  density="compact"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-center border-t border-sky-900/25 pt-8">
        <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-500">
          <Link href={directoryHref}>
            Browse all suppliers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
