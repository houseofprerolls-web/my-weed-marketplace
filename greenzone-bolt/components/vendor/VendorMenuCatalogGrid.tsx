'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { Loader2, Check, Star } from 'lucide-react';
import { TreehouseCatalogVerifiedBadge } from '@/components/brand/TreehouseCatalogVerifiedBadge';
import { SITE_IMAGE_SLOTS } from '@/lib/siteImageSlots';
import { OptimizedImg } from '@/components/media/OptimizedImg';

export type CatalogProductRow = {
  id: string;
  brand_id: string;
  name: string;
  category: string;
  description: string | null;
  images: string[] | null;
  strain_id: string | null;
  potency_thc: number | null;
  potency_cbd: number | null;
  avg_rating: number | null;
  review_count: number | null;
};

type Props = {
  vendorId: string;
  brandName: string;
  items: CatalogProductRow[];
  onMenuCatalogIds: Set<string>;
  onAdded: (catalogProductId: string) => void;
};

const PLACEHOLDER = SITE_IMAGE_SLOTS.productPlaceholder;

export function VendorMenuCatalogGrid({
  vendorId,
  brandName,
  items,
  onMenuCatalogIds,
  onAdded,
}: Props) {
  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  const setPrice = useCallback((id: string, v: string) => {
    setPrices((p) => ({ ...p, [id]: v }));
  }, []);

  const handleAdd = async (row: CatalogProductRow) => {
    if (onMenuCatalogIds.has(row.id)) {
      toast({ title: 'Already on your menu', description: row.name });
      return;
    }
    const raw = (prices[row.id] ?? '').trim();
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n < 0) {
      toast({
        title: 'Enter a price',
        description: 'Set your menu price before adding.',
        variant: 'destructive',
      });
      return;
    }
    const price_cents = Math.round(n * 100);
    setAddingId(row.id);
    try {
      const { error } = await supabase.from('products').insert({
        vendor_id: vendorId,
        catalog_product_id: row.id,
        brand_id: row.brand_id,
        strain_id: row.strain_id,
        name: row.name,
        category: row.category,
        description: row.description ?? null,
        images: Array.isArray(row.images) ? row.images : [],
        potency_thc: row.potency_thc,
        potency_cbd: row.potency_cbd,
        price_cents,
        inventory_count: 0,
        in_stock: true,
      });
      if (error) throw error;
      onAdded(row.id);
      toast({ title: 'Added to menu', description: `${row.name} · ${brandName}` });
    } catch (err: unknown) {
      const msg = formatSupabaseError(err);
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === '23505') {
        toast({
          title: 'Already on menu',
          description: 'This catalog item is already linked to your store.',
          variant: 'destructive',
        });
        onAdded(row.id);
      } else {
        toast({ title: 'Could not add', description: msg, variant: 'destructive' });
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((row) => {
        const img = row.images?.[0] || PLACEHOLDER;
        const onMenu = onMenuCatalogIds.has(row.id);
        const busy = addingId === row.id;
        return (
          <Card
            key={row.id}
            className="flex flex-col overflow-hidden border-green-900/25 bg-gray-900/50"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
              <TreehouseCatalogVerifiedBadge className="absolute left-2 top-2 z-[2]" />
              <OptimizedImg src={img} alt="" className="h-full w-full object-cover" preset="card" />
              {onMenu ? (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-green-700/95 px-2 py-1 text-xs font-medium text-white">
                  <Check className="h-3.5 w-3.5" />
                  On menu
                </div>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <Badge variant="outline" className="w-fit border-green-600/35 text-green-400">
                {row.category}
              </Badge>
              <h3 className="text-lg font-semibold leading-snug text-white">{row.name}</h3>
              {(row.avg_rating != null || (row.review_count != null && row.review_count > 0)) && (
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-amber-200/90">
                  {row.avg_rating != null && (
                    <>
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="font-medium tabular-nums">{row.avg_rating.toFixed(1)}</span>
                    </>
                  )}
                  {row.review_count != null && row.review_count > 0 && (
                    <span className="text-gray-400">
                      {row.avg_rating != null ? '·' : ''} {row.review_count.toLocaleString()} reviews
                    </span>
                  )}
                </p>
              )}
              {row.description ? (
                <p className="line-clamp-2 text-sm text-gray-400">{row.description}</p>
              ) : null}
              <div className="mt-auto space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Your price ($)
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  disabled={onMenu}
                  value={prices[row.id] ?? ''}
                  onChange={(e) => setPrice(row.id, e.target.value)}
                  className="border-green-900/30 bg-gray-950/80 text-white"
                />
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={onMenu || busy}
                  onClick={() => handleAdd(row)}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : onMenu ? (
                    'On menu'
                  ) : (
                    'Add to menu'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
