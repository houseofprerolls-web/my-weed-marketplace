'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { b2bListingTitle, type B2bListingRow } from '@/lib/b2bListingDisplay';

type SupplyDeal = {
  id: string;
  headline: string;
  discount_percent: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type PromoRow = {
  id: string;
  headline: string;
  discount_percent: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  listing_id: string;
};

type ListingMeta = {
  id: string;
  title_override: string | null;
  catalog_product_id: string | null;
  catalog_products: { name: string } | null;
};

export default function SupplyDealsHubPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const [deals, setDeals] = useState<SupplyDeal[]>([]);
  const [dealCounts, setDealCounts] = useState<Map<string, number>>(new Map());
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [listingMeta, setListingMeta] = useState<Map<string, ListingMeta>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);

    const { data: dealRows, error: dealErr } = await supabase
      .from('b2b_supply_deals')
      .select('id,headline,discount_percent,is_active,starts_at,ends_at,created_at')
      .eq('supply_account_id', accountId)
      .order('created_at', { ascending: false });
    if (dealErr) {
      console.error(dealErr);
      setDeals([]);
      setDealCounts(new Map());
    } else {
      const list = (dealRows as SupplyDeal[]) ?? [];
      setDeals(list);
      if (list.length) {
        const ids = list.map((d) => d.id);
        const { data: items } = await supabase.from('b2b_supply_deal_items').select('deal_id').in('deal_id', ids);
        const m = new Map<string, number>();
        for (const row of items ?? []) {
          const did = (row as { deal_id: string }).deal_id;
          m.set(did, (m.get(did) ?? 0) + 1);
        }
        setDealCounts(m);
      } else setDealCounts(new Map());
    }

    const { data: listings, error: lErr } = await supabase
      .from('b2b_listings')
      .select('id,title_override,catalog_product_id,catalog_products(name)')
      .eq('supply_account_id', accountId);
    if (lErr || !listings?.length) {
      setRows([]);
      setListingMeta(new Map());
    } else {
      const list = listings as unknown as ListingMeta[];
      const meta = new Map(list.map((x) => [x.id, x]));
      setListingMeta(meta);
      const ids = list.map((x) => x.id);
      const { data: promos, error: pErr } = await supabase
        .from('b2b_listing_promos')
        .select('id,headline,discount_percent,is_active,starts_at,ends_at,listing_id')
        .in('listing_id', ids)
        .order('created_at', { ascending: false });
      if (pErr) {
        console.error(pErr);
        setRows([]);
      } else {
        setRows((promos as PromoRow[]) ?? []);
      }
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!accountId) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Deals &amp; promos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Account-wide deals (create a deal, then attach catalog products). Listing-level promos remain available on each
            product page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-green-700 hover:bg-green-600">
            <Link href={`/supply/${accountId}/deals/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New deal
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/supply/${accountId}/listings`}>All products</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Account deals</h2>
            {deals.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/80 p-8 text-center text-zinc-400">
                No account deals yet. Create one, then pick which catalog SKUs it covers.
              </Card>
            ) : (
              <ul className="space-y-3">
                {deals.map((d) => (
                  <li key={d.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-3 border-zinc-800 bg-zinc-900/80 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{d.headline}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {dealCounts.get(d.id) ?? 0} catalog {(dealCounts.get(d.id) ?? 0) === 1 ? 'product' : 'products'}
                          {d.discount_percent != null ? ` · ${d.discount_percent}% off` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={d.is_active ? 'default' : 'secondary'}>{d.is_active ? 'active' : 'inactive'}</Badge>
                          {d.starts_at ? (
                            <span className="text-[11px] text-zinc-500">from {d.starts_at.slice(0, 10)}</span>
                          ) : null}
                          {d.ends_at ? (
                            <span className="text-[11px] text-zinc-500">to {d.ends_at.slice(0, 10)}</span>
                          ) : null}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="border-zinc-600">
                        <Link href={`/supply/${accountId}/deals/${d.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit deal
                        </Link>
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Product-level promos</h2>
            {rows.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/80 p-8 text-center text-zinc-400">
                No listing promos. Open a product and add a promo block there.
              </Card>
            ) : (
              <ul className="space-y-3">
                {rows.map((p) => {
                  const L = listingMeta.get(p.listing_id);
                  const title = L
                    ? b2bListingTitle({
                        title_override: L.title_override,
                        catalog_product_id: L.catalog_product_id,
                        catalog_products: L.catalog_products,
                      } as B2bListingRow)
                    : 'Product';
                  return (
                    <li key={p.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3 border-zinc-800 bg-zinc-900/80 p-4">
                        <div className="min-w-0">
                          <p className="font-medium text-white">{p.headline}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {title}
                            {p.discount_percent != null ? ` · ${p.discount_percent}% off` : ''}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'active' : 'inactive'}</Badge>
                            {p.starts_at ? (
                              <span className="text-[11px] text-zinc-500">from {p.starts_at.slice(0, 10)}</span>
                            ) : null}
                            {p.ends_at ? (
                              <span className="text-[11px] text-zinc-500">to {p.ends_at.slice(0, 10)}</span>
                            ) : null}
                          </div>
                        </div>
                        {L ? (
                          <Button asChild size="sm" variant="outline" className="border-zinc-600">
                            <Link href={`/supply/${accountId}/listings/${L.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit product
                            </Link>
                          </Button>
                        ) : null}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
