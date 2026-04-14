'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { b2bListingTitle, type B2bListingRow } from '@/lib/b2bListingDisplay';
import { SupplyListingsCsvImportPanel } from '@/components/supply/SupplyListingsCsvImportPanel';

type Row = B2bListingRow & {
  category: string;
  visibility: string;
  list_price_cents: number | null;
  buyer_showcase_rank?: number | null;
};

export default function SupplyListingsPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('b2b_listings')
      .select(
        'id,title_override,catalog_product_id,category,visibility,list_price_cents,buyer_showcase_rank,catalog_products(name)'
      )
      .eq('supply_account_id', accountId)
      .order('updated_at', { ascending: false });
    if (error) console.error(error);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Products</h1>
        <Button asChild className="bg-green-700 hover:bg-green-600">
          <Link href={`/supply/${accountId}/listings/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>

      {accountId ? (
        <SupplyListingsCsvImportPanel supplyAccountId={accountId} onImported={() => void load()} />
      ) : null}

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : rows.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No products yet.</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/supply/${accountId}/listings/${r.id}`}>
                <Card className="border-zinc-800 bg-zinc-900 p-4 transition hover:border-green-700/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">{b2bListingTitle(r)}</span>
                    <div className="flex flex-wrap gap-1">
                      {r.buyer_showcase_rank != null && r.buyer_showcase_rank >= 1 ? (
                        <Badge variant="outline" className="border-emerald-700/50 text-emerald-200">
                          Showcase #{r.buyer_showcase_rank}
                        </Badge>
                      ) : null}
                      <Badge variant={r.visibility === 'live' ? 'default' : 'secondary'}>
                        {r.visibility}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {r.list_price_cents != null ? `$${(r.list_price_cents / 100).toFixed(2)}` : 'Contact pricing'} ·{' '}
                    {r.category}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
