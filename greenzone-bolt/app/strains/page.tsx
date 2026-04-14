"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadStrainsDirectoryPage,
  STRAINS_DIRECTORY_PAGE_SIZE,
  STRAINS_TRENDING_SLOTS,
  type StrainDirectoryRow,
} from '@/lib/strainsDirectoryLoad';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Sparkles, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';
import { StrainStarAverage } from '@/components/strains/StrainStarAverage';
import { formatStrainEffectForDisplay } from '@/lib/strainEffectLabels';
import {
  displayStrainReviewCountForPhotoCard,
  strainDisplayAverageRating,
  strainRowHasCatalogPhoto,
} from '@/lib/strainDirectoryDisplay';
import { cn } from '@/lib/utils';

type StrainRow = StrainDirectoryRow;

export default function StrainsPage() {
  const [strains, setStrains] = useState<StrainRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageJump, setPageJump] = useState('1');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  /** Set when PostgREST fails so the UI is not indistinguishable from an empty table. */
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedType]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, debouncedSearch, selectedType]);

  useEffect(() => {
    setPageJump(String(page + 1));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / STRAINS_DIRECTORY_PAGE_SIZE));

  const commitPageJump = useCallback(() => {
    const raw = pageJump.trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      setPageJump(String(page + 1));
      return;
    }
    const clamped = Math.min(totalPages, Math.max(1, n));
    setPageJump(String(clamped));
    if (clamped - 1 !== page) {
      setPage(clamped - 1);
    }
  }, [pageJump, page, totalPages]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (!isSupabaseConfigured) {
          setLoadError(
            'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in greenzone-bolt/.env.local.'
          );
          setStrains([]);
          setTotalCount(0);
          return;
        }

        const input = { page, selectedType, debouncedSearch };
        let result: Awaited<ReturnType<typeof loadStrainsDirectoryPage>> | null = null;

        try {
          const u = new URL('/api/strains/directory', window.location.origin);
          u.searchParams.set('page', String(page));
          u.searchParams.set('type', selectedType);
          u.searchParams.set('q', debouncedSearch);
          const res = await fetch(u.toString());
          if (res.ok) {
            result = (await res.json()) as Awaited<ReturnType<typeof loadStrainsDirectoryPage>>;
          }
        } catch {
          result = null;
        }

        if (result?.ok === true) {
          if (cancelled) return;
          setStrains(result.strains);
          setTotalCount(result.totalCount);
          return;
        }
        if (result?.ok === false) {
          if (cancelled) return;
          setLoadError(result.error);
          setStrains([]);
          setTotalCount(result.totalCount ?? 0);
          return;
        }

        const fb = await loadStrainsDirectoryPage(supabase, input);
        if (cancelled) return;
        if (!fb.ok) {
          setLoadError(fb.error);
          setStrains([]);
          setTotalCount(fb.totalCount ?? 0);
          return;
        }
        setStrains(fb.strains);
        setTotalCount(fb.totalCount);
      } catch (error) {
        console.error('Error loading strains:', error);
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : String(error);
          setLoadError(msg);
          setStrains([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, selectedType, debouncedSearch]);

  const fromIdx = totalCount === 0 ? 0 : page * STRAINS_DIRECTORY_PAGE_SIZE + 1;
  const toIdx = Math.min(totalCount, page * STRAINS_DIRECTORY_PAGE_SIZE + strains.length);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'indica':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'sativa':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'hybrid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm mb-4">
              <Sparkles className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Strain Encyclopedia</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Explore Cannabis Strains
            </h1>
            <p className="text-xl text-gray-300">
              Discover detailed information about popular cannabis strains, their effects, and flavors
            </p>
            <p className="text-sm text-gray-500">
              {STRAINS_DIRECTORY_PAGE_SIZE} strains per page · search matches name, slug, or description · on “All strains,” the
              first {STRAINS_TRENDING_SLOTS} are trending by recent strain page views
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, slug, or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-gray-900 border-green-900/20 text-white h-14 text-lg"
            />
          </div>

          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
            <TabsList className="bg-gray-900 border border-green-900/20 w-full md:w-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-green-600 flex-1 md:flex-none">
                All Strains
              </TabsTrigger>
              <TabsTrigger value="indica" className="data-[state=active]:bg-purple-600 flex-1 md:flex-none">
                Indica
              </TabsTrigger>
              <TabsTrigger value="sativa" className="data-[state=active]:bg-orange-600 flex-1 md:flex-none">
                Sativa
              </TabsTrigger>
              <TabsTrigger value="hybrid" className="data-[state=active]:bg-green-600 flex-1 md:flex-none">
                Hybrid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loadError ? (
          <Card className="mb-8 border-amber-500/35 bg-amber-950/25 p-4 text-left">
            <p className="text-sm font-medium text-amber-100">Strain directory request failed</p>
            <p className="mt-1 text-xs text-amber-200/80">{loadError}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Open DevTools → Network: check <code className="rounded bg-black/30 px-1">/api/strains/directory</code>{' '}
              (and direct <code className="rounded bg-black/30 px-1">strains</code> requests if it falls back). Confirm{' '}
              <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> matches the project that has
              data; on the server, <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> helps if
              anon RLS differs. See{' '}
              <code className="rounded bg-black/30 px-1">scripts/diagnostics/supabase-health-check.sql</code>.
            </p>
          </Card>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : strains.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg">
              {loadError
                ? 'See the alert above, then refresh.'
                : totalCount === 0
                  ? 'No strains in this database yet (or filters excluded everything).'
                  : 'No strains found matching your criteria'}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strains.map((strain) => (
                <Card
                  key={strain.id}
                  className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden group"
                >
                  <div className="relative aspect-video overflow-hidden bg-background">
                    <StrainHeroImage
                      slug={strain.slug}
                      imageUrl={strain.image_url}
                      alt={strain.name}
                      maxCandidates={6}
                      photoFit="contain"
                      className="absolute inset-0 h-full w-full"
                      cornerBrandMark={strainRowHasCatalogPhoto(strain)}
                    />
                    <div className="absolute left-2 top-2 z-[8] flex max-w-[min(100%,calc(100%-4.75rem))] flex-col gap-1 sm:left-3 sm:top-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {strain.is_site_trending ? (
                          <Badge className="flex shrink-0 items-center gap-0.5 border-0 bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
                            <TrendingUp className="h-3 w-3 shrink-0" />
                            Trending
                          </Badge>
                        ) : null}
                        <Badge className={cn('shrink-0', getTypeColor(strain.type))}>{strain.type}</Badge>
                      </div>
                    </div>
                    {(strain.effects?.[0] || strain.effects?.[1]) && (
                      <div className="absolute bottom-2 left-2 z-[8] flex max-w-[min(100%,calc(100%-1rem))] flex-col items-start gap-1 sm:bottom-2.5 sm:left-2.5 sm:flex-row sm:flex-wrap">
                        {strain.effects[0] ? (
                          <Badge className="max-w-full border-0 bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-lime backdrop-blur-sm">
                            <span className="line-clamp-2 break-words text-left">
                              Top · {formatStrainEffectForDisplay(strain.effects[0])}
                            </span>
                          </Badge>
                        ) : null}
                        {strain.effects[1] ? (
                          <Badge className="max-w-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-200 backdrop-blur-sm">
                            <span className="line-clamp-2 break-words text-left">
                              2nd · {formatStrainEffectForDisplay(strain.effects[1])}
                            </span>
                          </Badge>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <Link href={`/strains/${strain.slug}`}>
                        <h3 className="text-white font-bold text-xl mb-2 group-hover:text-green-400 transition cursor-pointer">
                          {strain.name}
                        </h3>
                      </Link>
                      <StrainStarAverage
                        className="mb-3"
                        value={strainDisplayAverageRating(strain.slug, strain, strain.rating)}
                        reviewCount={displayStrainReviewCountForPhotoCard(
                          strain.slug,
                          strain,
                          strain.review_count
                        )}
                      />
                      <p className="text-gray-400 text-sm line-clamp-2">{strain.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">THC</span>
                        <span className="text-green-400 font-semibold">
                          {strain.thc_min}% - {strain.thc_max}%
                        </span>
                      </div>
                    </div>

                    {strain.effects && strain.effects.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs mb-2">Effects:</p>
                        <div className="flex flex-wrap gap-1">
                          {strain.effects.slice(0, 3).map((effect, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-green-500/20 text-green-400">
                              {formatStrainEffectForDisplay(effect)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {strain.flavors && strain.flavors.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs mb-2">Flavors:</p>
                        <div className="flex flex-wrap gap-1">
                          {strain.flavors.slice(0, 3).map((flavor, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-gray-500/20 text-gray-400">
                              {flavor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing {fromIdx}–{toIdx} of {totalCount.toLocaleString()}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-green-900/40 text-gray-200"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="whitespace-nowrap">Page</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={totalPages}
                    value={pageJump}
                    onChange={(e) => setPageJump(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPageJump();
                      }
                    }}
                    onBlur={() => {
                      const n = parseInt(pageJump.trim(), 10);
                      if (!Number.isFinite(n) || n < 1 || n > totalPages) {
                        setPageJump(String(page + 1));
                      }
                    }}
                    disabled={loading}
                    className="h-8 w-16 border-green-900/40 bg-gray-950 px-2 text-center text-sm text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label="Page number"
                  />
                  <span className="whitespace-nowrap">/ {totalPages.toLocaleString()}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-green-900/40 px-2 text-gray-200"
                    disabled={loading}
                    onClick={() => commitPageJump()}
                  >
                    Go
                  </Button>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-green-900/40 text-gray-200"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
