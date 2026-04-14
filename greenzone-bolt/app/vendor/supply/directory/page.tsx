'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutGrid, Rows3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supplyCoverageBadge } from '@/lib/usStateCodes';
import { fetchApprovedCaListingMarketSlugsForVendorIds } from '@/lib/vendorListingMarketSlugs';
import { PlatformAdSlot } from '@/components/ads/PlatformAdSlot';
import {
  SupplyDirectorySupplierCard,
  type SupplyDirectoryBrandEmbed,
  type SupplyDirectoryRow,
} from '@/components/supply/SupplyDirectorySupplierCard';
import { cn } from '@/lib/utils';

const DENSITY_KEY = 'supply-directory-density';

type Density = 'comfortable' | 'compact';

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

export default function VendorSupplyDirectoryPage() {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { ownedVendors } = useVendorBusiness({ adminMenuVendorId });
  const [rows, setRows] = useState<SupplyDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [myAreasOnly, setMyAreasOnly] = useState(false);
  const [vendorMarketSlugs, setVendorMarketSlugs] = useState<string[]>([]);
  const [nameBySlug, setNameBySlug] = useState<Map<string, string>>(new Map());
  const [density, setDensity] = useState<Density>('comfortable');

  const vendorIds = useMemo(() => ownedVendors.map((v) => v.id), [ownedVendors]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(DENSITY_KEY);
      if (v === 'compact' || v === 'comfortable') setDensity(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setDensityPersist = useCallback((d: Density) => {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_KEY, d);
    } catch {
      /* ignore */
    }
  }, []);

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

  const load = useCallback(async () => {
    setLoading(true);
    const selectWithBrand =
      'id,name,slug,account_type,brand_id,service_listing_market_slugs,brands(logo_url,hero_image_url,page_theme,slug,tagline)';

    let { data, error } = await supabase
      .from('supply_accounts')
      .select(selectWithBrand)
      .eq('is_published', true)
      .order('name');

    if (error) {
      const { data: flat, error: e2 } = await supabase
        .from('supply_accounts')
        .select('id,name,slug,account_type,brand_id,service_listing_market_slugs')
        .eq('is_published', true)
        .order('name');
      if (e2 || !flat) {
        console.error(error, e2);
        setRows([]);
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
      setRows(
        (flat as Omit<SupplyDirectoryRow, 'brands'>[]).map((r) => ({
          ...r,
          brands: r.brand_id ? brandMap.get(r.brand_id) ?? null : null,
        }))
      );
      setLoading(false);
      return;
    }

    const list = (data ?? []) as (Omit<SupplyDirectoryRow, 'brands'> & { brands?: unknown })[];
    setRows(
      list.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        account_type: r.account_type,
        brand_id: r.brand_id,
        service_listing_market_slugs: r.service_listing_market_slugs,
        brands: normalizeBrandEmbed(r.brands),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (t) {
        const tag = r.brands?.tagline?.toLowerCase() ?? '';
        if (
          !r.name.toLowerCase().includes(t) &&
          !r.slug.toLowerCase().includes(t) &&
          !tag.includes(t)
        ) {
          return false;
        }
      }
      if (myAreasOnly) {
        if (vendorMarketSlugs.length === 0) return false;
        const b = supplyCoverageBadge(vendorMarketSlugs, r.service_listing_market_slugs, nameBySlug);
        return b.kind === 'overlap';
      }
      return true;
    });
  }, [rows, filter, myAreasOnly, vendorMarketSlugs, nameBySlug]);

  const gridClass =
    density === 'compact'
      ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-8">
      <PlatformAdSlot placementKey="supply_marketplace_top" className="max-w-6xl" stripLabel="Sponsored" />

      <section className="overflow-hidden rounded-2xl border border-sky-800/35 bg-gradient-to-br from-sky-950/40 via-zinc-950/80 to-black p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">Wholesale marketplace</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Browse suppliers</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Discover curated brands and distributors, compare California coverage to your stores, and open RFQs on
              live catalogs.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-sky-800/50 bg-black/30 px-3 py-1 text-sky-100">
                {loading ? '…' : `${filtered.length}`} showing
                {!loading ? <span className="text-zinc-500"> · {rows.length} published</span> : null}
              </span>
              <Link
                href={q('/vendor/supply/rfqs')}
                className="text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
              >
                My RFQs
              </Link>
            </div>
          </div>
          <div className="w-full max-w-md shrink-0 rounded-xl border border-white/[0.06] bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your CA listing areas</p>
            {vendorMarketSlugs.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
                No approved California operating areas on your vendor profile yet — admin approves areas under Smokers
                Club / operating regions.
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-300">
                {vendorMarketSlugs.map((s) => nameBySlug.get(s) ?? s).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-[200px] flex-1 sm:max-w-md">
          <Input
            placeholder="Search by name, slug, or tagline…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border-sky-900/40 bg-zinc-900/80 text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Layout</span>
          <div className="inline-flex rounded-lg border border-sky-900/40 bg-zinc-950/80 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDensityPersist('comfortable')}
              className={cn(
                'gap-1.5 px-2.5 text-xs',
                density === 'comfortable' ? 'bg-sky-900/50 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Comfortable
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDensityPersist('compact')}
              className={cn(
                'gap-1.5 px-2.5 text-xs',
                density === 'compact' ? 'bg-sky-900/50 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              <Rows3 className="h-3.5 w-3.5" aria-hidden />
              Compact
            </Button>
          </div>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={myAreasOnly}
          onChange={(e) => setMyAreasOnly(e.target.checked)}
          className="rounded border-zinc-600"
        />
        In my CA listing areas only
      </label>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-sky-900/30 bg-zinc-900/50 p-8 text-center text-zinc-400">
          {rows.length === 0
            ? 'No published suppliers yet. Check back soon.'
            : 'No suppliers match these filters.'}
        </Card>
      ) : (
        <ul className={gridClass}>
          {filtered.map((r) => {
            const cov =
              vendorMarketSlugs.length > 0
                ? supplyCoverageBadge(vendorMarketSlugs, r.service_listing_market_slugs, nameBySlug)
                : null;
            return (
              <li key={r.id}>
                <SupplyDirectorySupplierCard
                  row={r}
                  href={q(`/vendor/supply/${encodeURIComponent(r.slug)}`)}
                  coverage={cov}
                  density={density}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
