'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutList, Inbox, MapPin, ImageIcon, BarChart3, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Stats = {
  listingsLive: number;
  listingsDraft: number;
  rfqsOpen: number;
  rfqsTotal: number;
  activePromos: number;
  activeAccountDeals: number;
};

export default function SupplyDashboardPage() {
  const params = useParams();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);

    const { data: listings } = await supabase
      .from('b2b_listings')
      .select('id,visibility')
      .eq('supply_account_id', accountId);

    const list = listings ?? [];
    const listingsLive = list.filter((l) => l.visibility === 'live').length;
    const listingsDraft = list.filter((l) => l.visibility === 'draft').length;
    const listingIds = list.map((l) => l.id);

    const { count: rfqsTotal } = await supabase
      .from('b2b_rfq_requests')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_supply_account_id', accountId);

    const { count: rfqsOpen } = await supabase
      .from('b2b_rfq_requests')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_supply_account_id', accountId)
      .in('status', ['submitted', 'in_review', 'quoted']);

    let activePromos = 0;
    if (listingIds.length) {
      const { data: promos } = await supabase
        .from('b2b_listing_promos')
        .select('id,is_active')
        .in('listing_id', listingIds);
      activePromos = (promos ?? []).filter((p) => p.is_active).length;
    }

    const { data: dealRows } = await supabase.from('b2b_supply_deals').select('is_active').eq('supply_account_id', accountId);
    const activeAccountDeals = (dealRows ?? []).filter((d) => (d as { is_active: boolean }).is_active).length;

    setStats({
      listingsLive,
      listingsDraft,
      rfqsOpen: rfqsOpen ?? 0,
      rfqsTotal: rfqsTotal ?? 0,
      activePromos,
      activeAccountDeals,
    });
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!accountId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">Supply account snapshot, quick links, and activity.</p>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Live products</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.listingsLive}</p>
              <p className="mt-1 text-xs text-zinc-500">{stats.listingsDraft} draft</p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Open RFQs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.rfqsOpen}</p>
              <p className="mt-1 text-xs text-zinc-500">{stats.rfqsTotal} total</p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Promos &amp; deals</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.activePromos + stats.activeAccountDeals}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {stats.activeAccountDeals} account deal{stats.activeAccountDeals === 1 ? '' : 's'} · {stats.activePromos} product
                promo{stats.activePromos === 1 ? '' : 's'}
              </p>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Quick actions</p>
              <div className="mt-3 flex flex-col gap-2">
                <Button asChild size="sm" variant="secondary" className="justify-start">
                  <Link href={`/supply/${accountId}/listings/new`}>
                    <LayoutList className="mr-2 h-4 w-4" />
                    New product
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start border-zinc-600">
                  <Link href={`/supply/${accountId}/rfqs`}>
                    <Inbox className="mr-2 h-4 w-4" />
                    RFQ inbox
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-white">Workspace</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link href={`/supply/${accountId}/listings`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <LayoutList className="h-5 w-5 text-green-400" />
                  <p className="mt-2 font-medium text-white">Products</p>
                  <p className="mt-1 text-xs text-zinc-500">B2B SKUs, pricing, visibility</p>
                </Card>
              </Link>
              <Link href={`/supply/${accountId}/service-areas`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <MapPin className="h-5 w-5 text-sky-400" />
                  <p className="mt-2 font-medium text-white">Service areas</p>
                  <p className="mt-1 text-xs text-zinc-500">CA map listing regions (vendor overlap)</p>
                </Card>
              </Link>
              <Link href={`/supply/${accountId}/catalog-media`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <ImageIcon className="h-5 w-5 text-violet-400" />
                  <p className="mt-2 font-medium text-white">Catalog media</p>
                  <p className="mt-1 text-xs text-zinc-500">SKU photos for your brand catalog</p>
                </Card>
              </Link>
              <Link href={`/supply/${accountId}/analytics`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                  <p className="mt-2 font-medium text-white">Analytics</p>
                  <p className="mt-1 text-xs text-zinc-500">RFQs and product mix</p>
                </Card>
              </Link>
              <Link href={`/supply/${accountId}/deals`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <Tag className="h-5 w-5 text-rose-400" />
                  <p className="mt-2 font-medium text-white">Deals &amp; promos</p>
                  <p className="mt-1 text-xs text-zinc-500">Account deals and product promos</p>
                </Card>
              </Link>
              <Link href={`/supply/${accountId}/rfqs`}>
                <Card className="h-full border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-green-800/50 hover:bg-zinc-900">
                  <Inbox className="h-5 w-5 text-zinc-300" />
                  <p className="mt-2 font-medium text-white">RFQs</p>
                  <p className="mt-1 text-xs text-zinc-500">Buyer quote requests</p>
                </Card>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
