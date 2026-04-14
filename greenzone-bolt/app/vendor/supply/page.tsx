'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Inbox, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { SupplyMarketplaceHomeSections } from '@/components/supply/SupplyMarketplaceHomeSections';

export default function VendorSupplyHomePage() {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { vendor, loading: vLoading } = useVendorBusiness({ adminMenuVendorId });
  const [rfqTotal, setRfqTotal] = useState<number | null>(null);
  const [rfqOpen, setRfqOpen] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    if (!vendor?.id) {
      setRfqTotal(0);
      setRfqOpen(0);
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);
    const { data: rows, error } = await supabase
      .from('b2b_rfq_requests')
      .select('id,status')
      .eq('buyer_vendor_id', vendor.id);
    if (error || !rows) {
      setRfqTotal(null);
      setRfqOpen(null);
    } else {
      setRfqTotal(rows.length);
      const open = (rows as { status: string }[]).filter((r) =>
        ['submitted', 'in_review', 'quoted'].includes(r.status)
      ).length;
      setRfqOpen(open);
    }
    setLoadingStats(false);
  }, [vendor?.id]);

  useEffect(() => {
    if (!vLoading) void loadStats();
  }, [vLoading, loadStats]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-sky-800/40 bg-gradient-to-br from-sky-950/50 via-zinc-900/40 to-zinc-950 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">Wholesale · Vendor only</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Supply marketplace</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Your B2B storefront on Da Treehouse: browse published suppliers with brand profiles and coverage, send RFQs
          on live catalogs, and track quote status. Use the Store / Suppliers toggle anytime to return to retail tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-sky-600 hover:bg-sky-500">
            <Link href={q('/vendor/supply/directory')}>
              Open marketplace directory
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-sky-700/50 text-sky-100 hover:bg-sky-950/50">
            <Link href={q('/vendor/supply/rfqs')}>My RFQs</Link>
          </Button>
        </div>
      </section>

      <SupplyMarketplaceHomeSections directoryHref={q('/vendor/supply/directory')} />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-sky-900/30 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-sky-300">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-sm font-medium text-white">Directory</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Grid of suppliers with logos, taglines, and CA coverage vs your stores.</p>
          <Link href={q('/vendor/supply/directory')} className="mt-3 inline-block text-xs font-medium text-sky-400 hover:underline">
            Browse directory
          </Link>
        </Card>
        <Card className="border-sky-900/30 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-sky-300">
            <Inbox className="h-5 w-5" />
            <span className="text-sm font-medium text-white">RFQs</span>
          </div>
          {loadingStats || vLoading ? (
            <Loader2 className="mt-3 h-5 w-5 animate-spin text-sky-500" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-white">
              {rfqTotal ?? '—'}
              <span className="ml-2 text-xs font-normal text-zinc-500">total</span>
            </p>
          )}
          {!loadingStats && rfqOpen != null ? (
            <p className="text-xs text-zinc-500">{rfqOpen} open / in review / quoted</p>
          ) : null}
          <Link href={q('/vendor/supply/rfqs')} className="mt-2 inline-block text-xs font-medium text-sky-400 hover:underline">
            View all
          </Link>
        </Card>
        <Card className="border-sky-900/30 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium text-zinc-300">Orders</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">B2B orders will live here when checkout ships.</p>
          <Link href={q('/vendor/supply/orders')} className="mt-3 inline-block text-xs font-medium text-zinc-500 hover:text-zinc-300">
            Placeholder page
          </Link>
        </Card>
      </section>
    </div>
  );
}
