"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Search, Sparkles, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';

const PAGE_SIZE = 47;
const TRENDING_SLOTS = 6;

type Strain = {
  id: string;
  name: string;
  slug: string;
  type: string;
  thc_min: number;
  thc_max: number;
  description: string | null;
  effects: string[];
  flavors: string[];
  image_url: string | null;
  rating: number;
  review_count: number;
};

type StrainRow = Strain & { is_site_trending?: boolean };

type TrendingSlugRow = { strain_slug: string; view_count: number };

export default function StrainsPage() {
  const [strains, setStrains] = useState<StrainRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageJump, setPageJump] = useState('1');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
      try {
        const directoryMode = !debouncedSearch && selectedType === 'all';

        let countQuery = supabase.from('strains').select('id', { count: 'exact', head: true });
        if (selectedType !== 'all') {
          countQuery = countQuery.eq('type', selectedType);
        }
        if (debouncedSearch) {
          const s = debouncedSearch.replace(/%/g, '');
          countQuery = countQuery.or(`name.ilike.%${s}%,slug.ilike.%${s}%,description.ilike.%${s}%`);
        }
        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        let dataQuery = supabase
          .from('strains')
          .select('*')
          .order('has_hero_image', { ascending: false })
          .order('popularity_score', { ascending: false });
        if (selectedType !== 'all') {
          dataQuery = dataQuery.eq('type', selectedType);
        }
        if (debouncedSearch) {
          const s = debouncedSearch.replace(/%/g, '');
          dataQuery = dataQuery.or(`name.ilike.%${s}%,slug.ilike.%${s}%,description.ilike.%${s}%`);
        }

        let trendingRows: StrainRow[] = [];
        let excludeIds: string[] = [];

        if (directoryMode) {
          const { data: slugRows, error: rpcError } = await supabase.rpc('trending_strain_slugs', {
            p_limit: TRENDING_SLOTS,
            p_days: 30,
          });

          if (!rpcError && Array.isArray(slugRows) && slugRows.length > 0) {
            const orderedSlugs = (slugRows as TrendingSlugRow[])
              .map((r) => r.strain_slug)
              .filter((slug) => typeof slug === 'string' && slug.length > 0);

            if (orderedSlugs.length > 0) {
              const { data: trendData, error: trendErr } = await supabase
                .from('strains')
                .select('*')
                .in('slug', orderedSlugs);

              if (!trendErr && trendData?.length) {
                const bySlug = new Map(trendData.map((row) => [row.slug as string, row]));
                trendingRows = orderedSlugs
                  .map((slug) => bySlug.get(slug))
                  .filter(Boolean)
                  .map((row) => ({ ...(row as Strain), is_site_trending: true }));
                excludeIds = trendingRows.map((r) => r.id);
              }
            }
          }
        }

        let query = dataQuery;
        if (excludeIds.length > 0) {
          // Use PostgREST/Supabase expected array syntax for `in` operators.
          // Passing a raw SQL string can break parsing and result in empty lists.
          query = query.not('id', 'in', excludeIds as unknown as string[]);
        }

        const ex = excludeIds.length;
        let from: number;
        let rangeLen: number;

        if (!directoryMode || ex === 0) {
          from = page * PAGE_SIZE;
          rangeLen = PAGE_SIZE;
        } else if (page === 0) {
          from = 0;
          rangeLen = Math.max(0, PAGE_SIZE - trendingRows.length);
        } else {
          from = page * PAGE_SIZE - ex;
          rangeLen = PAGE_SIZE;
        }

        const to = from + rangeLen - 1;
        const { data, error } = await query.range(from, to);

        if (cancelled) return;
        if (error) throw error;

        const rest = (data || []) as Strain[];
        const merged: StrainRow[] =
          directoryMode && page === 0 && trendingRows.length > 0
            ? [...trendingRows, ...rest]
            : rest;

        setStrains(merged);
        setTotalCount(typeof count === 'number' ? count : 0);
      } catch (error) {
        console.error('Error loading strains:', error);
        if (!cancelled) {
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

  const fromIdx = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const toIdx = Math.min(totalCount, page * PAGE_SIZE + strains.length);

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
    <div className="min-h-screen bg-black">
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
              {PAGE_SIZE} strains per page · search matches name, slug, or description · on “All strains,” the
              first {TRENDING_SLOTS} are trending by recent strain page views
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : strains.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg">No strains found matching your criteria</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strains.map((strain) => (
                <Card
                  key={strain.id}
                  className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden group"
                >
                  <div className="aspect-video bg-gradient-to-br from-green-900/20 to-black relative overflow-hidden">
                    <StrainHeroImage
                      slug={strain.slug}
                      imageUrl={strain.image_url}
                      alt={strain.name}
                      className="absolute inset-0 h-full w-full"
                      imgClassName="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      {strain.is_site_trending ? (
                        <Badge className="flex items-center gap-0.5 border-0 bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
                          <TrendingUp className="h-3 w-3 shrink-0" />
                          Trending
                        </Badge>
                      ) : null}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className={getTypeColor(strain.type)}>
                        {strain.type}
                      </Badge>
                    </div>
                    {(strain.effects?.[0] || strain.effects?.[1]) && (
                      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                        {strain.effects[0] ? (
                          <Badge className="border-0 bg-black/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-lime backdrop-blur-sm">
                            Top · {strain.effects[0]}
                          </Badge>
                        ) : null}
                        {strain.effects[1] ? (
                          <Badge className="border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-200 backdrop-blur-sm">
                            2nd · {strain.effects[1]}
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
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-white font-semibold">{strain.rating?.toFixed(1) || '4.5'}</span>
                        </div>
                        <span className="text-gray-400 text-sm">({strain.review_count || 0} reviews)</span>
                      </div>
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
                              {effect}
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
