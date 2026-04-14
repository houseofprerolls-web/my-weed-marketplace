'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Package, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CatalogSkuPick = {
  catalog_product_id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  category: string;
  description: string | null;
  images: string[];
  strain_id: string | null;
  potency_thc: number | null;
  potency_cbd: number | null;
};

type Props = {
  value: string;
  onChange: (s: string) => void;
  onPickSku: (row: CatalogSkuPick) => void;
  onPickBrandOnly: (brandId: string, brandName: string) => void;
  /** Clear linked brand + catalog product (in addition to emptying the field). */
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
};

type SkuRow = CatalogSkuPick;
type BrandHit = { id: string; name: string };

export function VendorBrandCatalogAutocomplete({
  value,
  onChange,
  onPickSku,
  onPickBrandOnly,
  onClear,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [brands, setBrands] = useState<BrandHit[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setSkus([]);
      setBrands([]);
      return;
    }
    const safe = term.replace(/%/g, '').slice(0, 80);
    setLoading(true);
    try {
      const pattern = `%${safe}%`;

      const [{ data: byName, error: e1 }, { data: bRows, error: e2 }] = await Promise.all([
        supabase
          .from('catalog_products')
          .select('id,name,category,description,images,strain_id,potency_thc,potency_cbd,brand_id')
          .ilike('name', pattern)
          .limit(24),
        supabase.from('brands').select('id,name').eq('verified', true).ilike('name', pattern).limit(14),
      ]);

      if (e1) console.warn('catalog search by product name', e1);
      if (e2) console.warn('catalog search brands', e2);

      const brandIds = Array.from(new Set((bRows || []).map((b) => (b as BrandHit).id)));
      let byBrand: unknown[] = [];
      if (brandIds.length) {
        const { data: c2, error: e3 } = await supabase
          .from('catalog_products')
          .select('id,name,category,description,images,strain_id,potency_thc,potency_cbd,brand_id')
          .in('brand_id', brandIds)
          .limit(28);
        if (e3) console.warn('catalog search by brand id', e3);
        else byBrand = c2 || [];
      }

      const allRaw = [...(byName || []), ...byBrand] as Record<string, unknown>[];
      const needBrandIds = Array.from(
        new Set(allRaw.map((r) => String(r.brand_id ?? '')).filter(Boolean))
      );
      const nameByBrandId = new Map<string, string>();
      if (needBrandIds.length) {
        const { data: bn } = await supabase.from('brands').select('id,name').in('id', needBrandIds);
        for (const b of bn || []) {
          nameByBrandId.set(String((b as BrandHit).id), String((b as BrandHit).name ?? '').trim());
        }
      }

      const map = new Map<string, SkuRow>();
      const push = (raw: Record<string, unknown>) => {
        const id = String(raw.id ?? '');
        if (!id || map.has(id)) return;
        const brand_id = String(raw.brand_id ?? '');
        if (!brand_id) return;
        const brandName = nameByBrandId.get(brand_id) || 'Brand';
        map.set(id, {
          catalog_product_id: id,
          brand_id,
          brand_name: brandName,
          name: String(raw.name ?? ''),
          category: String(raw.category ?? 'other'),
          description: raw.description != null ? String(raw.description) : null,
          images: Array.isArray(raw.images) ? (raw.images as string[]).filter(Boolean) : [],
          strain_id: raw.strain_id != null ? String(raw.strain_id) : null,
          potency_thc:
            raw.potency_thc != null && raw.potency_thc !== ''
              ? Number(raw.potency_thc)
              : null,
          potency_cbd:
            raw.potency_cbd != null && raw.potency_cbd !== ''
              ? Number(raw.potency_cbd)
              : null,
        });
      };

      for (const r of byName || []) push(r as Record<string, unknown>);
      for (const r of byBrand) push(r as Record<string, unknown>);

      setSkus(Array.from(map.values()).slice(0, 40));
      setBrands((bRows || []) as BrandHit[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onInputChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSearch(v);
    }, 280);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-gray-300">Brand / master catalog</Label>
      <p className="text-xs text-gray-500">
        Type to search verified brands and master catalog SKUs. Pick a row to autofill the product. Leave custom text
        only to show a shelf label without linking a brand.
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => {
                onInputChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              disabled={disabled}
              placeholder="Search brand or catalog product…"
              autoComplete="off"
              className="border-green-900/40 bg-gray-900 pr-10 text-white placeholder:text-gray-600"
            />
            {loading ? (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-500" />
            ) : null}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,24rem)] border-green-900/40 bg-gray-950 p-0 text-white"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[min(70vh,22rem)] overflow-y-auto py-1">
            {value.trim().length < 2 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-500">Type at least 2 characters…</p>
            ) : loading ? (
              <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </p>
            ) : skus.length === 0 && brands.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-500">No catalog matches.</p>
            ) : (
              <>
                {skus.length > 0 ? (
                  <div className="border-b border-green-900/30 pb-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Catalog SKUs
                    </p>
                    {skus.map((s) => (
                      <button
                        key={s.catalog_product_id}
                        type="button"
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-green-900/35"
                        onClick={() => {
                          onPickSku(s);
                          onChange(s.brand_name);
                          setOpen(false);
                        }}
                      >
                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-green-400/90" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-white">{s.name}</span>
                          <span className="text-xs text-gray-500">{s.brand_name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {brands.length > 0 ? (
                  <div className="pt-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Brands (logo / photos only)
                    </p>
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-green-900/35"
                        onClick={() => {
                          onPickBrandOnly(b.id, b.name);
                          onChange(b.name);
                          setOpen(false);
                        }}
                      >
                        <Tag className="h-4 w-4 shrink-0 text-amber-400/90" />
                        <span className="font-medium text-white">{b.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-gray-500 hover:text-white"
        disabled={disabled}
        onClick={() => {
          onChange('');
          onClear?.();
        }}
      >
        Clear brand & catalog link
      </Button>
    </div>
  );
}
