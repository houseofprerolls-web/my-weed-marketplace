'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StrainStarAverage } from '@/components/strains/StrainStarAverage';
import {
  displayStrainReviewCountForPhotoCard,
  strainDisplayAverageRating,
} from '@/lib/strainDirectoryDisplay';
import { listingHrefForVendor } from '@/lib/listingPath';

type SearchVendor = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
};
type SearchBrand = { id: string; name: string; slug: string };
type SearchStrain = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  image_url: string | null;
  has_hero_image: boolean | null;
  rating: number | null;
  review_count: number | null;
};

type SearchPayload = {
  q: string;
  vendors: SearchVendor[];
  brands: SearchBrand[];
  strains: SearchStrain[];
  products?: {
    id: string;
    name: string;
    category: string;
    brand_id: string;
    brand_name: string | null;
    image_url: string | null;
  }[];
};

function clampQuery(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export default function SearchPage() {
  const sp = useSearchParams();
  const qParam = sp.get('q') ?? '';
  const initial = clampQuery(qParam);
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SearchPayload>({ q: '', vendors: [], brands: [], strains: [] });

  const effectiveQ = useMemo(() => clampQuery(qParam), [qParam]);

  useEffect(() => {
    const q = effectiveQ;
    if (q.length < 2) {
      setPayload({ q, vendors: [], brands: [], strains: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const next = (await res.json()) as SearchPayload;
        if (!cancelled) setPayload(next);
      } catch {
        if (!cancelled) setPayload({ q, vendors: [], brands: [], strains: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveQ]);

  const total = payload.vendors.length + payload.brands.length + payload.strains.length;
  const productRows = Array.isArray(payload.products) ? payload.products : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <p className="mt-1 text-sm text-gray-400">
            Stores, brands, and strains
            {effectiveQ ? (
              <>
                {' '}
                for <span className="text-gray-200">“{effectiveQ}”</span>
              </>
            ) : null}
          </p>
        </div>
        <form
          className="flex w-full gap-2 sm:w-[420px]"
          action="/search"
          onSubmit={(e) => {
            // allow normal navigation via action; keep query clamped
            const q = clampQuery(query);
            if (!q) e.preventDefault();
          }}
        >
          <Input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores, brands, strains…"
            className="border-brand-red/20 bg-zinc-950/70 text-white placeholder:text-gray-500"
          />
          <Button type="submit" className="bg-brand-red text-white hover:bg-brand-red-deep">
            Search
          </Button>
        </form>
      </div>

      <Card className="border-brand-red/20 bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-300">
            {loading ? 'Searching…' : effectiveQ.length < 2 ? 'Type at least 2 characters.' : `${total} result(s)`}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/10 text-gray-300">
              Stores {payload.vendors.length}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-gray-300">
              Brands {payload.brands.length}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-gray-300">
              Strains {payload.strains.length}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-gray-300">
              Products {productRows.length}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="border-brand-red/20 bg-zinc-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Stores</div>
          <div className="space-y-2">
            {payload.vendors.map((v) => (
              <Link
                key={v.id}
                href={listingHrefForVendor({ id: v.id, slug: v.slug })}
                className="block rounded-lg border border-white/10 bg-black/40 px-3 py-2 hover:border-brand-red/40"
              >
                <div className="truncate text-sm font-semibold text-white">{v.name}</div>
                <div className="truncate text-xs text-gray-400">
                  {(v.city || '').trim()}
                  {v.city && v.state ? ', ' : ''}
                  {(v.state || '').trim()}
                </div>
              </Link>
            ))}
            {payload.vendors.length === 0 ? <div className="text-sm text-gray-500">No stores found.</div> : null}
          </div>
        </Card>

        <Card className="border-brand-red/20 bg-zinc-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Brands</div>
          <div className="space-y-2">
            {payload.brands.map((b) => (
              <Link key={b.id} href={`/brands/${b.slug}`} className="block rounded-lg border border-white/10 bg-black/40 px-3 py-2 hover:border-brand-red/40">
                <div className="truncate text-sm font-semibold text-white">{b.name}</div>
              </Link>
            ))}
            {payload.brands.length === 0 ? <div className="text-sm text-gray-500">No brands found.</div> : null}
          </div>
        </Card>

        <Card className="border-brand-red/20 bg-zinc-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Strains</div>
          <div className="space-y-2">
            {payload.strains.map((s) => (
              <Link
                key={s.id}
                href={`/strains/${s.slug}`}
                className="block rounded-lg border border-white/10 bg-black/40 px-3 py-2 hover:border-brand-red/40"
              >
                <div className="truncate text-sm font-semibold text-white">{s.name}</div>
                {s.type ? <div className="mb-1 truncate text-xs text-gray-400">{s.type}</div> : null}
                <StrainStarAverage
                  size="sm"
                  value={strainDisplayAverageRating(s.slug, s, s.rating)}
                  reviewCount={displayStrainReviewCountForPhotoCard(s.slug, s, s.review_count ?? 0)}
                  numericClassName="text-xs text-gray-200"
                  reviewsClassName="text-xs text-gray-500"
                />
              </Link>
            ))}
            {payload.strains.length === 0 ? <div className="text-sm text-gray-500">No strains found.</div> : null}
          </div>
        </Card>

        <Card className="border-brand-red/20 bg-zinc-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Products</div>
          <div className="space-y-2">
            {productRows.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
              >
                <div className="truncate font-semibold text-white">{p.name}</div>
                <div className="truncate text-xs text-gray-400">
                  {p.brand_name ? `${p.brand_name} · ` : ''}
                  {p.category}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Use the header search to jump to the cheapest nearby offer.
                </div>
              </div>
            ))}
            {productRows.length === 0 ? <div className="text-sm text-gray-500">No products found.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

