'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { BRAND_INDEX_CARD_THEME, resolveBrandPageThemeId } from '@/lib/brandShowcaseThemes';
import { ChevronLeft, ChevronRight, LayoutGrid, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const BRAND_LIST_SELECT_FULL =
  'id,name,slug,logo_url,tagline,hero_image_url,page_theme';

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  hero_image_url: string | null;
  page_theme: string | null;
  /** Master catalog rows for this brand (used for directory sort + card badge). */
  catalog_item_count?: number;
};

/** Strip characters that break PostgREST `ilike` patterns. */
function safeIlikePattern(raw: string): string {
  const t = raw.trim().replace(/[%_]/g, '');
  if (!t) return '%';
  return `%${t}%`;
}

function BrandsSplitBanner() {
  return (
    <section
      className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.09] bg-zinc-950/80 shadow-[0_24px_80px_-40px_rgba(139,92,246,0.45)] backdrop-blur-sm"
      aria-labelledby="brands-directory-heading"
    >
      <div className="grid md:grid-cols-2">
        <div className="relative z-[1] flex flex-col justify-center gap-4 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/25 bg-violet-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" aria-hidden />
            Directory
          </div>
          <div>
            <h1
              id="brands-directory-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-tight"
            >
              Brand showcases
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
              Verified cannabis brands on GreenZone — stories, lineup, and where to shop. Sorted by catalog size (most
              products first), twelve per page; search by name.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-violet-600 text-white hover:bg-violet-500"
            >
              <Link href="/brand">Brand dashboard</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              <Link href="/discover">Discover shops</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[11rem] md:min-h-full">
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-600/35 via-fuchsia-950/40 to-zinc-950"
            aria-hidden
          />
          <div
            className="absolute -right-4 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-fuchsia-400/20 blur-3xl md:right-8"
            aria-hidden
          />
          <div
            className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-white/25 to-transparent md:block"
            aria-hidden
          />
          <div className="relative flex h-full min-h-[11rem] flex-col items-center justify-center gap-3 px-6 py-8 md:px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/25 shadow-lg backdrop-blur-md sm:h-20 sm:w-20">
              <LayoutGrid className="h-8 w-8 text-violet-200/90 sm:h-9 sm:w-9" aria-hidden />
            </div>
            <p className="max-w-[16rem] text-center text-xs font-medium leading-relaxed text-zinc-200/85 sm:text-sm">
              Each card opens a full brand page with hero art, socials, and live catalog picks.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandsIndexFallback() {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <Sparkles className="h-8 w-8 animate-pulse text-violet-400/60" aria-hidden />
        <p className="text-sm">Loading brands…</p>
      </div>
    </div>
  );
}

function BrandDirectoryCard({ b }: { b: BrandRow }) {
  const themeId = resolveBrandPageThemeId(b.page_theme);
  const th = BRAND_INDEX_CARD_THEME[themeId];
  const hero = (b.hero_image_url || '').trim();
  const hasHero = /^https?:\/\//i.test(hero);

  return (
    <Link
      href={`/brands/${encodeURIComponent(b.slug)}`}
      className={cn(
        'group relative flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-md outline-none transition duration-300 sm:max-w-none',
        'hover:-translate-y-0.5 hover:border-white/18 hover:shadow-lg',
        th.glow,
        'focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
      )}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {hasHero ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            <div
              className={cn('absolute inset-0 bg-gradient-to-t', th.heroTint)}
              aria-hidden
            />
            <div
              className={cn('absolute inset-0 bg-gradient-to-br opacity-80 mix-blend-soft-light', th.mesh)}
              aria-hidden
            />
          </>
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', th.mesh)} aria-hidden>
            <div
              className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl"
              aria-hidden
            />
            <div
              className="absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-white/5 blur-2xl"
              aria-hidden
            />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5 sm:pt-14">
          <div className="flex items-end gap-2.5 sm:gap-3">
            <div
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-zinc-900/95 shadow-md ring-1 ring-black/40 backdrop-blur-sm sm:h-12 sm:w-12'
              )}
            >
              {b.logo_url ? (
                <OptimizedImg src={b.logo_url} alt="" className="h-full w-full object-contain p-1.5" preset="thumb" />
              ) : (
                <span className={cn('text-lg font-bold tracking-tight sm:text-xl', th.accent)}>
                  {b.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <h2 className="truncate text-base font-semibold leading-snug tracking-tight text-white drop-shadow-md sm:text-[1.0625rem]">
                {b.name}
              </h2>
              {b.tagline?.trim() ? (
                <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug text-zinc-300/95 sm:text-xs">
                  {b.tagline.trim()}
                </p>
              ) : (
                <p className={cn('mt-0.5 text-[0.6875rem] font-medium sm:text-xs', th.accent)}>Verified showcase</p>
              )}
              {typeof b.catalog_item_count === 'number' && b.catalog_item_count > 0 ? (
                <p className="mt-1 text-[0.625rem] font-medium tabular-nums text-zinc-400 sm:text-[0.6875rem]">
                  {b.catalog_item_count} catalog {b.catalog_item_count === 1 ? 'product' : 'products'}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/35 px-3 py-2 backdrop-blur-md sm:px-3.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Brand page</span>
        <span className={cn('text-[11px] font-semibold transition group-hover:translate-x-0.5 sm:text-xs', th.accent)}>
          View →
        </span>
      </div>
    </Link>
  );
}

function BrandsIndexInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlQ = (searchParams.get('q') || '').trim();

  const [draftQ, setDraftQ] = useState(urlQ);
  useEffect(() => {
    setDraftQ(urlQ);
  }, [urlQ]);

  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page =
    totalCount > 0 ? Math.min(Math.max(1, urlPage), totalPages) : Math.max(1, urlPage);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    const requestedPage = Math.max(1, urlPage);
    const from = (requestedPage - 1) * PAGE_SIZE;
    const searchArg = urlQ.trim() || null;

    const parseCount = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const [listRpc, countRpc] = await Promise.all([
      supabase.rpc('brand_directory_list_verified', {
        p_search: searchArg,
        p_limit: PAGE_SIZE,
        p_offset: from,
      }),
      supabase.rpc('brand_directory_count_verified', { p_search: searchArg }),
    ]);

    const rpcOk = !listRpc.error && !countRpc.error && Array.isArray(listRpc.data);

    if (rpcOk) {
      const count = parseCount(countRpc.data);
      const tp = Math.max(1, Math.ceil(count / PAGE_SIZE));
      if (requestedPage > tp && count > 0) {
        setTotalCount(count);
        setBrands([]);
        setLoading(false);
        const p = new URLSearchParams();
        if (tp > 1) p.set('page', String(tp));
        if (urlQ.trim()) p.set('q', urlQ.trim());
        const qs = p.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        return;
      }
      const rows = listRpc.data as Array<
        BrandRow & { catalog_item_count?: number | string | null }
      >;
      setBrands(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          logo_url: r.logo_url ?? null,
          tagline: r.tagline ?? null,
          hero_image_url: r.hero_image_url ?? null,
          page_theme: r.page_theme ?? null,
          catalog_item_count: parseCount(r.catalog_item_count),
        }))
      );
      setTotalCount(count);
      setLoading(false);
      return;
    }

    const run = async (cols: string) => {
      let q = supabase
        .from('brands')
        .select(cols, { count: 'exact' })
        .eq('verified', true)
        .order('name');
      if (urlQ) q = q.ilike('name', safeIlikePattern(urlQ));
      return q.range(from, from + PAGE_SIZE - 1);
    };

    let res = await run(BRAND_LIST_SELECT_FULL);
    if (res.error && /column|does not exist/i.test(res.error.message)) {
      res = await run('id,name,slug,logo_url');
    }

    if (res.error) {
      setBrands([]);
      setTotalCount(0);
    } else {
      const count = typeof res.count === 'number' ? res.count : (res.data || []).length;
      const tp = Math.max(1, Math.ceil(count / PAGE_SIZE));
      if (requestedPage > tp) {
        setTotalCount(count);
        setBrands([]);
        setLoading(false);
        const p = new URLSearchParams();
        if (tp > 1) p.set('page', String(tp));
        if (urlQ.trim()) p.set('q', urlQ.trim());
        const qs = p.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        return;
      }
      const rows = (Array.isArray(res.data) ? res.data : []) as unknown as BrandRow[];
      setBrands(
        rows.map((r) => ({
          ...r,
          tagline: r.tagline ?? null,
          hero_image_url: r.hero_image_url ?? null,
          page_theme: r.page_theme ?? null,
          catalog_item_count: 0,
        }))
      );
      setTotalCount(count);
    }
    setLoading(false);
  }, [urlPage, urlQ, pathname, router]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const setUrl = useCallback(
    (nextPage: number, q: string) => {
      const p = new URLSearchParams();
      if (nextPage > 1) p.set('page', String(nextPage));
      if (q.trim()) p.set('q', q.trim());
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
    },
    [pathname, router]
  );

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrl(1, draftQ);
  };

  const fromIdx = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-violet-600/10 via-transparent to-transparent blur-3xl"
        aria-hidden
      />

      <BrandsSplitBanner />

      <div className="relative mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-zinc-500">
          <span className="text-zinc-400">{PAGE_SIZE} brands per page</span>
          <span className="mx-2 text-zinc-600">·</span>
          Largest catalogs first
          <span className="mx-2 text-zinc-600">·</span>
          Search by name
        </p>
        <form onSubmit={onSearchSubmit} className="flex w-full flex-col gap-2 sm:w-[min(100%,28rem)] sm:flex-row">
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search by name…"
            className="border-white/10 bg-zinc-950/80 text-white placeholder:text-zinc-500"
            aria-label="Search brands"
          />
          <div className="flex gap-2">
            <Button type="submit" className="bg-violet-600 text-white hover:bg-violet-700">
              Search
            </Button>
            <Button type="button" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/5" asChild>
              <Link href="/discover">Discover</Link>
            </Button>
          </div>
        </form>
      </div>

      <Card className="relative border-white/10 bg-zinc-900/40 p-4 backdrop-blur-sm">
        <div className="text-sm text-zinc-300">
          {loading ? (
            'Loading…'
          ) : urlQ ? (
            <>
              {totalCount} match{totalCount === 1 ? '' : 'es'} for “{urlQ}”
              {totalCount > 0 ? (
                <>
                  {' '}
                  · showing {fromIdx}–{toIdx}
                </>
              ) : null}
            </>
          ) : (
            <>
              {totalCount} verified brand{totalCount === 1 ? '' : 's'}
              {totalCount > 0 ? (
                <>
                  {' '}
                  · page {page} of {totalPages} ({fromIdx}–{toIdx})
                </>
              ) : null}
            </>
          )}
        </div>
      </Card>

      {/*
        Card width ~328px (20.5rem): slightly larger than Discover SKU strip cards (280–300px, discoverFeaturedStrip.ts).
      */}
      <div className="relative mt-8 grid grid-cols-1 justify-items-stretch gap-3 sm:grid-cols-[repeat(auto-fill,20.5rem)] sm:justify-center sm:gap-4">
        {loading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/2] w-full max-w-full animate-pulse rounded-xl bg-zinc-900/60 ring-1 ring-white/5 sm:aspect-auto sm:h-[18.25rem] sm:max-w-none"
              aria-hidden
            />
          ))
        ) : brands.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-zinc-950/50 py-16 text-center text-sm text-zinc-500">
            {urlQ ? 'No brands match your search.' : 'No verified brands yet.'}
          </div>
        ) : (
          brands.map((b) => <BrandDirectoryCard key={b.id} b={b} />)
        )}
      </div>

      {!loading && totalPages > 1 ? (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-8"
          aria-label="Pagination"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="border-white/15 bg-zinc-900/50 text-white hover:bg-zinc-800"
            onClick={() => setUrl(page - 1, urlQ)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <span className="px-3 text-sm text-zinc-400">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            className="border-white/15 bg-zinc-900/50 text-white hover:bg-zinc-800"
            onClick={() => setUrl(page + 1, urlQ)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

export default function BrandsIndexPage() {
  return (
    <Suspense fallback={<BrandsIndexFallback />}>
      <BrandsIndexInner />
    </Suspense>
  );
}
