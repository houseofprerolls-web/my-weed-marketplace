'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorAnalyticsCharts } from '@/components/vendor/VendorAnalyticsCharts';
import { VendorOrderHistoryExplorer, type ExplorerOrderRow } from '@/components/vendor/VendorOrderHistoryExplorer';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useVendorAnalyticsScope } from '@/hooks/useVendorAnalyticsScope';
import { supabase } from '@/lib/supabase';
import { normalizeOrderStatus } from '@/lib/orderFulfillmentStatus';

export default function VendorAnalyticsPage() {
  const { loading: authLoading } = useAuth();
  const { vendor, ownedVendors, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();
  const {
    analyticsScope,
    setAnalyticsScope,
    effectiveVendorIds,
    dashboardTitle,
    analyticsSubtitle,
    showScopePicker,
  } = useVendorAnalyticsScope(vendor, ownedVendors);
  const [loading, setLoading] = useState(true);
  const [chartOrders, setChartOrders] = useState<
    { created_at: string; total_cents: number; items?: unknown }[]
  >([]);
  const [allOrderRows, setAllOrderRows] = useState<ExplorerOrderRow[]>([]);
  const [cancelledOrderCount, setCancelledOrderCount] = useState(0);
  const [cancelledOrdersValueCents, setCancelledOrdersValueCents] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [analyticsEvents, setAnalyticsEvents] = useState<number | null>(null);

  const storeStartYmd = useMemo(() => {
    const times = ownedVendors
      .map((v) => (v.created_at ? new Date(v.created_at).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    const d = times.length ? new Date(Math.min(...times)) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [ownedVendors]);

  const load = useCallback(async () => {
    const vendorIds = effectiveVendorIds.filter(Boolean);
    if (!vendorIds.length || !vendorsMode) {
      setChartOrders([]);
      setAllOrderRows([]);
      setCancelledOrderCount(0);
      setCancelledOrdersValueCents(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const productsQ =
      vendorIds.length === 1
        ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorIds[0]!)
        : supabase.from('products').select('id', { count: 'exact', head: true }).in('vendor_id', vendorIds);
    const reviewsQ =
      vendorIds.length === 1
        ? supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', 'vendor')
            .eq('entity_id', vendorIds[0]!)
        : supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', 'vendor')
            .in('entity_id', vendorIds);
    const [oRes, pRes, rRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, created_at, total_cents, status, items')
        .in('vendor_id', vendorIds)
        .order('created_at', { ascending: true }),
      productsQ,
      reviewsQ,
    ]);

    const rows = (oRes.data || []) as {
      id: string;
      order_number: string | null;
      created_at: string;
      total_cents: number;
      status: string;
      items?: unknown;
    }[];

    setAllOrderRows(
      rows.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
      }))
    );

    const nonCancelled = rows.filter((o) => normalizeOrderStatus(o.status) !== 'cancelled');
    const cancelled = rows.filter((o) => normalizeOrderStatus(o.status) === 'cancelled');
    setCancelledOrderCount(cancelled.length);
    setCancelledOrdersValueCents(cancelled.reduce((s, o) => s + (o.total_cents || 0), 0));

    setChartOrders(
      nonCancelled.map((o) => ({
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
        items: o.items,
      }))
    );

    setProductCount(pRes.count ?? 0);
    setReviewCount(rRes.count ?? 0);
    const ev =
      vendorIds.length === 1
        ? await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendorIds[0]!)
        : await supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .in('vendor_id', vendorIds);
    setAnalyticsEvents(!ev.error && typeof ev.count === 'number' ? ev.count : null);
    setLoading(false);
  }, [vendorsMode, effectiveVendorIds]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!mayEnterVendorShell || !vendorsMode) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">Analytics requires a linked store and vendors schema.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href="/vendor/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Analytics — {dashboardTitle}</h1>
          <p className="mt-2 text-gray-300">{analyticsSubtitle}</p>
          <p className="mt-1 text-sm text-gray-500">
            Revenue and order trends exclude cancelled orders. Explore by day below.
          </p>
          {showScopePicker ? (
            <div className="mt-4 max-w-md space-y-2">
              <Label htmlFor="analytics-scope" className="text-gray-400">
                Data scope
              </Label>
              <Select value={analyticsScope} onValueChange={(v) => setAnalyticsScope(v as 'all' | string)}>
                <SelectTrigger id="analytics-scope" className="border-green-900/40 bg-gray-950 text-white">
                  <SelectValue placeholder="Choose location" />
                </SelectTrigger>
                <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                  <SelectItem value="all">All linked locations (combined)</SelectItem>
                  {ownedVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} · {[v.city, v.state].filter(Boolean).join(', ') || v.zip || 'Area TBD'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>
          <div className="space-y-8 lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
              </div>
            ) : (
              <>
                <VendorAnalyticsCharts
                  orders={chartOrders}
                  cancelledOrderCount={cancelledOrderCount}
                  cancelledOrdersValueCents={cancelledOrdersValueCents}
                  productCount={productCount}
                  reviewCount={reviewCount}
                  analyticsEventCount={analyticsEvents}
                  showDispensarySuite
                />
                <VendorOrderHistoryExplorer orders={allOrderRows} storeStartYmd={storeStartYmd} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
