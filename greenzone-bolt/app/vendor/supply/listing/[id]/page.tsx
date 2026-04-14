'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { sanitizeDisplayImageUrl } from '@/lib/optimizedImageUrl';
import { supabase } from '@/lib/supabase';
import { useSupplyRfqDraft } from '@/contexts/SupplyRfqDraftContext';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { b2bListingTitle, type B2bListingRow } from '@/lib/b2bListingDisplay';
import { useToast } from '@/hooks/use-toast';

type ListingFull = Omit<B2bListingRow, 'catalog_products'> & {
  description: string | null;
  category: string;
  list_price_cents: number | null;
  moq: number | null;
  case_size: string | null;
  supply_account_id: string;
  supply_accounts: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  catalog_products?:
    | { name: string; images?: string[] | null; description?: string | null }
    | { name: string; images?: string[] | null; description?: string | null }[]
    | null;
};

export default function VendorSupplyListingPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { toast } = useToast();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { addOrUpdateLine, linesFor } = useSupplyRfqDraft();

  const [row, setRow] = useState<ListingFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('case');
  const [targetPrice, setTargetPrice] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('b2b_listings')
      .select(
        'id,title_override,catalog_product_id,description,category,list_price_cents,moq,case_size,supply_account_id,supply_accounts(id,name,slug),catalog_products(name,images,description)'
      )
      .eq('id', id)
      .eq('visibility', 'live')
      .maybeSingle();
    if (error || !data) {
      setRow(null);
      setLoading(false);
      return;
    }
    setRow(data as ListingFull);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = row ? b2bListingTitle(row) : '';

  const supplyAcc = row?.supply_accounts;
  const supplyOne = supplyAcc && Array.isArray(supplyAcc) ? supplyAcc[0] : supplyAcc;
  const catProd = row?.catalog_products;
  const catOne = catProd && Array.isArray(catProd) ? catProd[0] : catProd;
  const existingDraft =
    row && supplyOne ? linesFor(supplyOne.id).find((l) => l.listingId === row.id) : undefined;

  const addLineToDraft = (navigateToRfq: boolean) => {
    if (!row || !supplyOne?.id) return;
    const cents =
      targetPrice.trim() === '' ? null : Math.round(parseFloat(targetPrice) * 100);
    const tp = cents != null && Number.isFinite(cents) ? cents : null;
    addOrUpdateLine(supplyOne.id, {
      listingId: row.id,
      titleSnapshot: title,
      qty,
      unit: unit.trim() || 'case',
      targetPriceCents: tp,
    });
    toast({ title: navigateToRfq ? 'Saved to RFQ' : 'Added to RFQ', description: `${title} · qty ${qty} ${unit}` });
    if (navigateToRfq && supplyOne.slug) {
      router.push(q(`/vendor/supply/rfq?supplier=${encodeURIComponent(supplyOne.id)}`));
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      ) : !row ? (
        <Card className="border-sky-900/30 bg-zinc-900/50 p-6 text-zinc-400">Listing not found or not live.</Card>
      ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400 hover:text-white">
              <Link
                href={q(`/vendor/supply/${encodeURIComponent(supplyOne?.slug ?? '')}`)}
                className="inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {supplyOne?.name ?? 'supplier'}
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="mt-1 text-sm capitalize text-zinc-500">{row.category}</p>
            </div>
            {catOne?.images?.[0] ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <OptimizedImg
                  src={sanitizeDisplayImageUrl(catOne.images[0])}
                  alt=""
                  preset="hero"
                  className="max-h-64 w-full object-cover"
                />
              </div>
            ) : null}
            <Card className="border-sky-900/30 bg-zinc-900/50 p-4 text-sm text-zinc-300">
              <p className="whitespace-pre-wrap">{row.description || catOne?.description || '—'}</p>
              <dl className="mt-4 grid gap-2 text-xs text-zinc-500">
                <div>
                  <dt className="inline font-medium text-zinc-400">List price: </dt>
                  <dd className="inline">
                    {row.list_price_cents != null ? `$${(row.list_price_cents / 100).toFixed(2)}` : 'Contact for pricing'}
                  </dd>
                </div>
                {row.moq != null ? (
                  <div>
                    <dt className="inline font-medium text-zinc-400">MOQ: </dt>
                    <dd className="inline">{row.moq}</dd>
                  </div>
                ) : null}
                {row.case_size ? (
                  <div>
                    <dt className="inline font-medium text-zinc-400">Case size: </dt>
                    <dd className="inline">{row.case_size}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>
            <Card className="border-sky-900/30 bg-zinc-900/50 space-y-4 p-4">
              <h2 className="font-semibold text-white">Add to RFQ</h2>
              {existingDraft ? (
                <p className="text-xs text-amber-200/90">This SKU is already in your draft for this supplier.</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-zinc-400">Quantity</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={qty}
                    onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                    className="border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Unit</Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Target price (USD, optional)</Label>
                <Input
                  placeholder="e.g. 120"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="border-zinc-700 bg-zinc-900 text-white"
                />
              </div>
              <Button
                type="button"
                onClick={() => addLineToDraft(false)}
                className="w-full bg-sky-600 hover:bg-sky-500"
              >
                Add to RFQ
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => addLineToDraft(true)}
                className="w-full border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              >
                Add and open RFQ
              </Button>
            </Card>
          </>
        )}
    </div>
  );
}
