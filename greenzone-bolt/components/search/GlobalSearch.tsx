'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { useToast } from '@/hooks/use-toast';
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
  vendors_schema?: boolean;
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

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function clampQuery(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function GlobalSearch({
  variant = 'desktop',
}: {
  variant?: 'desktop' | 'mobile' | 'mobileTile' | 'mobileIcon';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SearchPayload>({ q: '', vendors: [], brands: [], strains: [] });
  const debounced = useDebouncedValue(query, 180);
  const activeFetchId = useRef(0);

  useEffect(() => {
    // Cmd/Ctrl+K toggles search
    const onKey = (e: KeyboardEvent) => {
      const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if (k !== 'k') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Reset when opening so previous results don't hang around.
    setQuery('');
    setPayload({ q: '', vendors: [], brands: [], strains: [] });
  }, [open]);

  useEffect(() => {
    const q = clampQuery(debounced);
    if (!open) return;
    if (q.length < 2) {
      setPayload({ q, vendors: [], brands: [], strains: [] });
      return;
    }

    const id = ++activeFetchId.current;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const next = (await res.json()) as SearchPayload;
        if (activeFetchId.current !== id) return;
        setPayload(next);
      } catch {
        if (activeFetchId.current !== id) return;
        setPayload({ q, vendors: [], brands: [], strains: [] });
      } finally {
        if (activeFetchId.current === id) setLoading(false);
      }
    })();
  }, [debounced, open]);

  const productRows = Array.isArray(payload.products) ? payload.products : [];
  const anyResults =
    payload.vendors.length + payload.brands.length + payload.strains.length + productRows.length > 0;

  // SSR and first paint must match (avoid hydration mismatch); refine after mount.
  const [shortcutHint, setShortcutHint] = useState('Ctrl K');
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
    setShortcutHint(isMac ? '⌘K' : 'Ctrl K');
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const goCheapestProduct = async (catalogProductId: string) => {
    const zip = readShopperZip5();
    if (!zip) {
      toast({ title: 'Set your ZIP first', description: 'Enter your ZIP so we can find nearby prices.' });
      return;
    }
    setOpen(false);
    try {
      const res = await fetch(
        `/api/catalog-products/best-offer?catalog_product_id=${encodeURIComponent(catalogProductId)}&zip=${encodeURIComponent(zip)}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as {
        found?: boolean;
        vendor_id?: string;
        vendor_slug?: string | null;
        product_id?: string;
      };
      if (!data.found || !data.vendor_id || !data.product_id) {
        toast({ title: 'Not in your area', description: 'No shops in your area are selling that item right now.' });
        return;
      }
      const path = `${listingHrefForVendor({ id: data.vendor_id, slug: data.vendor_slug })}?product=${encodeURIComponent(data.product_id)}`;
      router.push(path);
    } catch {
      toast({ title: 'Couldn’t load prices', description: 'Try again in a moment.' });
    }
  };

  const currentQ = clampQuery(query);
  const canSearchPage = currentQ.length >= 2;

  return (
    <>
      {variant === 'desktop' ? (
        <Button
          variant="outline"
          className="hidden h-9 w-[min(520px,38vw)] justify-start gap-2 border-brand-red/20 bg-zinc-950/60 px-3 text-gray-300 hover:bg-brand-red/10 hover:text-white md:flex"
          onClick={() => setOpen(true)}
          aria-label="Search stores, brands, strains"
        >
          <Search className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="truncate text-sm">Search stores, brands, strains…</span>
          <span className="ml-auto rounded border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
            {shortcutHint}
          </span>
        </Button>
      ) : variant === 'mobile' ? (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 whitespace-nowrap text-gray-200 hover:bg-brand-red/10 hover:text-white"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
        </Button>
      ) : variant === 'mobileIcon' ? (
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 text-gray-200 hover:bg-brand-red/10 hover:text-white md:min-h-10 md:min-w-10"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search className="h-5 w-5" aria-hidden />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-auto w-[108px] flex-col gap-2 rounded-xl border-brand-red/20 bg-zinc-950/70 px-2 py-2 text-white hover:border-brand-red/40 hover:bg-brand-red/10"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search className="h-5 w-5 text-purple-300" aria-hidden />
          <span className="text-[11px] font-semibold">Search</span>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search stores, brands, strains…"
          value={query}
          onValueChange={(v) => setQuery(v)}
          autoFocus
        />
        <CommandList>
          {!anyResults ? (
            <CommandEmpty>
              {loading
                ? 'Searching…'
                : clampQuery(query).length < 2
                  ? 'Type at least 2 characters.'
                  : 'No matches.'}
            </CommandEmpty>
          ) : null}

          {payload.vendors.length ? (
            <CommandGroup heading="Stores">
              {payload.vendors.map((v) => (
                <CommandItem
                  key={v.id}
                  value={`store:${v.name}`}
                  onSelect={() => go(listingHrefForVendor({ id: v.id, slug: v.slug }))}
                >
                  <span className="truncate">{v.name}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {(v.city || '').trim()}
                    {v.city && v.state ? ', ' : ''}
                    {(v.state || '').trim()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {payload.brands.length ? (
            <>
              {payload.vendors.length ? <CommandSeparator /> : null}
              <CommandGroup heading="Brands">
                {payload.brands.map((b) => (
                  <CommandItem key={b.id} value={`brand:${b.name}`} onSelect={() => go(`/brands/${b.slug}`)}>
                    <span className="truncate">{b.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {payload.strains.length ? (
            <>
              {payload.vendors.length || payload.brands.length ? <CommandSeparator /> : null}
              <CommandGroup heading="Strains">
                {payload.strains.map((s) => (
                  <CommandItem key={s.id} value={`strain:${s.name}`} onSelect={() => go(`/strains/${s.slug}`)}>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{s.name}</span>
                        {s.type ? <span className="shrink-0 text-xs text-gray-400">{s.type}</span> : null}
                      </div>
                      <StrainStarAverage
                        size="sm"
                        value={strainDisplayAverageRating(s.slug, s, s.rating)}
                        reviewCount={displayStrainReviewCountForPhotoCard(s.slug, s, s.review_count ?? 0)}
                        numericClassName="text-xs text-gray-200"
                        reviewsClassName="text-xs text-gray-500"
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {productRows.length ? (
            <>
              {payload.vendors.length || payload.brands.length || payload.strains.length ? <CommandSeparator /> : null}
              <CommandGroup heading="Products">
                {productRows.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`product:${p.name}`}
                    onSelect={() => void goCheapestProduct(p.id)}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {p.brand_name ? `${p.brand_name} · ` : ''}
                      {p.category}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {canSearchPage ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="More">
                <CommandItem
                  value="search:all"
                  onSelect={() => go(`/search?q=${encodeURIComponent(currentQ)}&from=${encodeURIComponent(pathname || '/')}`)}
                >
                  Search all for “{currentQ}”
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}

