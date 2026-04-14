'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { VendorOrderHistoryExplorer, type ExplorerOrderRow } from '@/components/vendor/VendorOrderHistoryExplorer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Phone,
  MapPin,
  Globe,
  Plus,
  CreditCard as Edit,
  ChartBar as BarChart3,
  Award,
  Loader2,
  ShoppingBag,
  Truck,
  Link2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import VendorNav from '@/components/vendor/VendorNav';
import { AssistantPanel } from '@/components/ai/AssistantPanel';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useVendorAnalyticsScope } from '@/hooks/useVendorAnalyticsScope';
import { collectProductIdsFromOrders, orderGrossProfitCents } from '@/lib/orderProfit';
import { normalizeOrderStatus, orderStatusLabel } from '@/lib/orderFulfillmentStatus';
import { VendorAnalyticsCharts } from '@/components/vendor/VendorAnalyticsCharts';
import { VendorReviewsManager } from '@/components/vendor/VendorReviewsManager';

type DealRow = { id: string; title: string; discount_percent: number; start_date: string; end_date: string };
type ReviewRow = { id: string; rating: number; title: string; body: string | null; created_at: string };
type VendorOrderPreview = { id: string; status: string; created_at: string; total_cents: number };

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, ownedVendors, loading: vLoading, vendorsMode, refresh, mayEnterVendorShell } =
    useVendorBusiness();

  const {
    analyticsScope,
    setAnalyticsScope,
    effectiveVendorIds,
    resolvedVendor,
    dashboardTitle,
    analyticsSubtitle,
    showScopePicker,
  } = useVendorAnalyticsScope(vendor, ownedVendors);

  const [loadingStats, setLoadingStats] = useState(true);
  const [revenueCents, setRevenueCents] = useState(0);
  const [profitCents, setProfitCents] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<number | null>(null);
  const [chartOrders, setChartOrders] = useState<
    { created_at: string; total_cents: number; items?: unknown }[]
  >([]);
  const [ordersPreview, setOrdersPreview] = useState<VendorOrderPreview[]>([]);
  const [allOrderRows, setAllOrderRows] = useState<ExplorerOrderRow[]>([]);
  const [cancelledOrderCount, setCancelledOrderCount] = useState(0);
  const [cancelledOrdersValueCents, setCancelledOrdersValueCents] = useState(0);
  const [dashTab, setDashTab] = useState('overview');

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

  const loadStats = useCallback(async () => {
    const vendorIds = effectiveVendorIds.filter(Boolean);
    if (!vendorIds.length || !vendorsMode) {
      setOrdersPreview([]);
      setAllOrderRows([]);
      setChartOrders([]);
      setCancelledOrderCount(0);
      setCancelledOrdersValueCents(0);
      setOrderCount(0);
      setRevenueCents(0);
      setProfitCents(0);
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);

    const productsQ =
      vendorIds.length === 1
        ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorIds[0]!)
        : supabase.from('products').select('id', { count: 'exact', head: true }).in('vendor_id', vendorIds);

    const dealsQ = supabase
      .from('deals')
      .select('id,title,discount_percent,start_date,end_date')
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: false })
      .limit(12);

    const reviewsQ = supabase
      .from('reviews')
      .select('id,rating,title,body,created_at')
      .eq('entity_type', 'vendor')
      .in('entity_id', vendorIds)
      .order('created_at', { ascending: false })
      .limit(15);

    const [{ data: orders }, { count: pc }, { data: dealsData }, { data: revs }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_cents, items, created_at, status')
        .in('vendor_id', vendorIds)
        .order('created_at', { ascending: false }),
      productsQ,
      dealsQ,
      reviewsQ,
    ]);

    const orderRows = (orders || []) as {
      id: string;
      order_number: string | null;
      total_cents: number;
      items: unknown;
      created_at: string;
      status: string;
    }[];

    const explorerRows: ExplorerOrderRow[] = orderRows.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      total_cents: o.total_cents || 0,
    }));
    setAllOrderRows(explorerRows);

    const nonCancelled = orderRows.filter((o) => normalizeOrderStatus(o.status) !== 'cancelled');
    const cancelled = orderRows.filter((o) => normalizeOrderStatus(o.status) === 'cancelled');
    setCancelledOrderCount(cancelled.length);
    setCancelledOrdersValueCents(cancelled.reduce((s, o) => s + (o.total_cents || 0), 0));

    setChartOrders(
      nonCancelled.map((o) => ({
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
        items: o.items,
      }))
    );
    setOrdersPreview(
      orderRows.slice(0, 12).map((o) => ({
        id: o.id,
        status: o.status,
        created_at: o.created_at,
        total_cents: o.total_cents || 0,
      }))
    );
    setOrderCount(nonCancelled.length);
    const rev = nonCancelled.reduce((s, o) => s + (o.total_cents || 0), 0);
    setRevenueCents(rev);

    const allIds = collectProductIdsFromOrders(nonCancelled.map((o) => o.items));
    let costMap = new Map<string, number>();
    if (allIds.length) {
      const { data: costs } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', allIds);
      for (const r of (costs || []) as { product_id: string; unit_cost_cents: number }[]) {
        costMap.set(r.product_id, r.unit_cost_cents);
      }
    }
    const pSum = nonCancelled.reduce((s, o) => s + orderGrossProfitCents(o.items, costMap), 0);
    setProfitCents(pSum);

    setProductCount(pc ?? 0);
    setDeals((dealsData || []) as DealRow[]);
    const rlist = (revs || []) as ReviewRow[];
    setReviews(rlist);
    if (rlist.length) {
      const ar = rlist.reduce((a, b) => a + b.rating, 0) / rlist.length;
      setAvgRating(Math.round(ar * 10) / 10);
    } else {
      setAvgRating(null);
    }

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
    if (!ev.error && typeof ev.count === 'number') {
      setAnalyticsEvents(ev.count);
    } else {
      setAnalyticsEvents(null);
    }

    setLoadingStats(false);
  }, [vendorsMode, effectiveVendorIds]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const fulfillmentCounts = useMemo(() => {
    const m = { pending: 0, accepted: 0, en_route: 0, completed: 0, cancelled: 0, other: 0 };
    for (const o of allOrderRows) {
      const s = normalizeOrderStatus(o.status);
      if (s === 'pending') m.pending += 1;
      else if (s === 'accepted') m.accepted += 1;
      else if (s === 'en_route') m.en_route += 1;
      else if (s === 'completed') m.completed += 1;
      else if (s === 'cancelled') m.cancelled += 1;
      else m.other += 1;
    }
    return m;
  }, [allOrderRows]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          <p className="text-white">You need a linked dispensary to open the vendor dashboard.</p>
          <p className="mt-2 text-sm text-gray-400">
            Sign in with the account that owns your store (e.g. Saferock for the master QA user), or apply under List
            your business.
          </p>
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Dashboard data requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold">Vendor dashboard</h1>
            <p className="mt-2 text-gray-400">No dispensary is linked to your login.</p>
            <p className="mt-2 text-sm text-gray-500">
              Run migrations 0043–0046 and sign in as the store owner. Saferock uses slug <code className="text-green-400">saferock</code> and the master email when seeded.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <VendorNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-green-600/30 bg-green-900/30">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-green-500">{vendor.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{dashboardTitle}</h1>
                {(resolvedVendor ?? vendor).verified && (
                  <Badge className="border-green-600/30 bg-green-600/20 text-green-500">Verified</Badge>
                )}
                <Badge className="border-purple-600/30 bg-purple-600/20 text-purple-500">
                  {(resolvedVendor ?? vendor).is_live ? 'Live' : 'Not live'}
                </Badge>
              </div>
              <p className="text-gray-300">{analyticsSubtitle}</p>
              <p className="mt-1 text-sm text-gray-500">
                Listing slug /{(resolvedVendor ?? vendor).slug}
              </p>
              {showScopePicker ? (
                <div className="mt-4 max-w-md space-y-2">
                  <Label htmlFor="dash-analytics-scope" className="text-gray-400">
                    Analytics &amp; orders scope
                  </Label>
                  <Select value={analyticsScope} onValueChange={(v) => setAnalyticsScope(v as 'all' | string)}>
                    <SelectTrigger
                      id="dash-analytics-scope"
                      className="border-green-900/40 bg-gray-950 text-white"
                    >
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
                  <p className="text-xs text-gray-500">
                    Charts, order totals, deals, and reviews follow this scope. Switch to see one shop only.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div className="flex flex-wrap gap-3">
              <Link href="/vendor/profile">
                <Button className="border border-green-900/20 bg-gray-800 text-white hover:bg-gray-700">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit profile & photos
                </Button>
              </Link>
              <Link href="/vendor/menu/product/new">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add menu item
                </Button>
              </Link>
              <Link href="/vendor/menu/sources">
                <Button variant="outline" className="border-green-600/40 text-green-400 hover:bg-green-600/10">
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect POS
                </Button>
              </Link>
              <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => refresh().then(loadStats)}>
                Refresh data
              </Button>
            </div>

            {loadingStats ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
              </div>
            ) : (
              <Tabs value={dashTab} onValueChange={setDashTab} className="space-y-6">
                <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 overflow-x-auto border border-green-900/20 bg-gray-900 p-1">
                  <TabsTrigger value="overview" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="fulfillment"
                    className="shrink-0 gap-1.5 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Fulfillment
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="deals" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Deals
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="shrink-0 data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger
                    value="placements"
                    className="hidden shrink-0 md:flex data-[state=active]:bg-gray-800 data-[state=active]:text-green-400"
                  >
                    <span className="md:hidden">Smokers club</span>
                    <span className="hidden md:inline">Smokers Club</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Order revenue</p>
                      <p className="text-3xl font-bold text-white">${(revenueCents / 100).toFixed(2)}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {orderCount} orders (excludes {cancelledOrderCount} cancelled)
                      </p>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Est. gross profit</p>
                      <p className="text-3xl font-bold text-green-400">${(profitCents / 100).toFixed(2)}</p>
                      <p className="mt-2 text-xs text-gray-500">From line items × your unit costs</p>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Menu products</p>
                      <p className="text-3xl font-bold text-white">{productCount}</p>
                      <Link href="/vendor/menu" className="mt-2 inline-block text-xs text-green-400 hover:underline">
                        Manage menu
                      </Link>
                    </Card>
                    <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                      <p className="mb-1 text-sm text-gray-400">Reviews</p>
                      <p className="text-3xl font-bold text-white">{avgRating != null ? `${avgRating}` : '—'}</p>
                      <p className="mt-2 text-xs text-gray-500">{reviews.length} loaded</p>
                    </Card>
                  </div>

                  <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                      Storefront
                    </h3>
                    <div className="space-y-3 text-sm">
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-4 w-4 text-gray-500" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.website && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <a href={vendor.website} className="text-green-400 hover:underline" target="_blank" rel="noreferrer">
                            {vendor.website}
                          </a>
                        </div>
                      )}
                      {(vendor.address || vendor.city) && (
                        <div className="flex items-start gap-2 text-gray-300">
                          <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
                          <span>
                            {[vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="fulfillment" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Order fulfillment</p>
                      <p className="text-sm text-gray-400">
                        Move orders through pending → accepted → en route → completed. Use the green buttons on{' '}
                        <span className="text-gray-300">All orders</span> for one-tap updates, or open an order for an
                        optional note to the customer. Shoppers see each step under <span className="text-gray-300">My orders</span>.
                      </p>
                    </div>
                    <Link href="/vendor/orders">
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        All orders
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['pending', fulfillmentCounts.pending],
                        ['accepted', fulfillmentCounts.accepted],
                        ['en_route', fulfillmentCounts.en_route],
                        ['completed', fulfillmentCounts.completed],
                        ['cancelled', fulfillmentCounts.cancelled],
                      ] as const
                    ).map(([key, n]) => (
                      <Badge key={key} variant="outline" className="border-green-800/50 text-gray-200">
                        {orderStatusLabel(key)}: {n}
                      </Badge>
                    ))}
                  </div>
                  {ordersPreview.length === 0 ? (
                    <Card className="border-green-900/20 bg-gray-900/50 p-8 text-center text-gray-400">
                      No orders yet. They appear here after checkout.
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {ordersPreview.map((o) => (
                        <Link key={o.id} href={`/vendor/orders/${o.id}`}>
                          <Card className="border-green-900/20 bg-gray-800/50 p-4 transition hover:border-green-600/40">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-mono text-sm text-white">{o.id.slice(0, 8)}…</p>
                                <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-gray-600 text-gray-300">
                                  {orderStatusLabel(o.status)}
                                </Badge>
                                <span className="text-sm font-medium text-green-400">
                                  ${(o.total_cents / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <VendorAnalyticsCharts
                    orders={chartOrders}
                    cancelledOrderCount={cancelledOrderCount}
                    cancelledOrdersValueCents={cancelledOrdersValueCents}
                    productCount={productCount}
                    reviewCount={reviews.length}
                    analyticsEventCount={analyticsEvents}
                    showTopSellingProducts
                  />
                  <VendorOrderHistoryExplorer orders={allOrderRows} storeStartYmd={storeStartYmd} />
                  <div className="text-center">
                    <Link href="/vendor/analytics" className="text-sm text-green-400 hover:underline">
                      Open full analytics page
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="deals" className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Link href="/vendor/deals/new">
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Create new deal
                      </Button>
                    </Link>
                    <Link href="/vendor/deals">
                      <Button variant="outline" className="border-gray-600 text-gray-300">
                        Manage all deals
                      </Button>
                    </Link>
                  </div>
                  {deals.length === 0 ? (
                    <Card className="border-green-900/20 bg-gray-900/50 p-8 text-center text-gray-400">
                      No deals yet.{' '}
                      <Link href="/vendor/deals/new" className="text-green-400 hover:underline">
                        Create one
                      </Link>
                    </Card>
                  ) : (
                    deals.map((d) => (
                      <Card key={d.id} className="border-green-900/20 bg-gray-800/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">{d.title}</p>
                            <p className="text-sm text-gray-500">
                              {d.discount_percent}% · {d.start_date} → {d.end_date}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-green-600/40 text-green-400">
                            Active window
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  <VendorReviewsManager vendorId={vendor.id} />
                  <p className="text-center text-sm text-gray-500">
                    <Link href="/vendor/reviews" className="text-green-400 hover:underline">
                      Open reviews page
                    </Link>
                  </p>
                </TabsContent>

                <TabsContent value="placements" className="space-y-6">
                  <section className="md:hidden" aria-label="Smokers club">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Smokers club</p>
                    <div className="-mx-4 flex flex-nowrap gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-pl-4 scroll-pr-12 pb-3 pl-4 pr-12 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:scroll-pr-16 sm:pl-6 sm:pr-16 [&::-webkit-scrollbar]:hidden">
                      {vendor.smokers_club_eligible === true ? (
                        <>
                          <Link
                            href="/vendor/advertising"
                            className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 shadow-sm transition hover:border-green-600/45 hover:bg-gray-900/70 sm:max-w-[280px]"
                          >
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Tree &amp; CTR</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Slot, click-through, and spotlight banner—open the full Smokers club page.
                            </span>
                            <span className="mt-3 text-sm font-medium text-green-400">Open insights →</span>
                          </Link>
                          <div className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 text-left shadow-sm sm:max-w-[280px]">
                            <Sparkles className="mb-3 h-8 w-8 text-brand-lime" aria-hidden />
                            <span className="font-semibold text-white">Discover</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Shoppers see the club as featured-style cards on Discover—higher rungs first.
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4 shadow-sm sm:max-w-[280px]">
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Invite-only</span>
                            <span className="mt-2 text-sm text-gray-400">
                              Homepage tree placement for eligible shops—we review each store.
                            </span>
                          </div>
                          <Link
                            href="/vendor/advertising"
                            className="flex w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none flex-col rounded-2xl border border-amber-900/30 bg-gray-900/50 p-4 shadow-sm transition hover:border-amber-600/40 sm:max-w-[280px]"
                          >
                            <Award className="mb-3 h-8 w-8 text-amber-400" aria-hidden />
                            <span className="font-semibold text-white">Request access</span>
                            <span className="mt-2 text-sm text-gray-400">Learn more and email our team from one place.</span>
                            <span className="mt-3 text-sm font-medium text-amber-400">Open page →</span>
                          </Link>
                        </>
                      )}
                      <div className="min-w-6 shrink-0 sm:min-w-8" aria-hidden />
                    </div>
                  </section>

                  <div className="hidden space-y-6 md:block">
                    {vendor.smokers_club_eligible === true ? (
                      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
                        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                          <Award className="h-5 w-5 text-amber-400" />
                          Smokers club visibility
                        </h3>
                        <p className="text-gray-400">
                          See your numbered tree slot and <strong className="text-gray-300">tree click-through rate</strong>{' '}
                          on the club. Higher slots (#1 is top) mean more prominence for{' '}
                          <span className="text-white">{vendor.name}</span>. Raw reach stats stay with our team.
                        </p>
                        <Link href="/vendor/advertising">
                          <Button className="mt-4 bg-green-600 hover:bg-green-700">Open Smokers club insights</Button>
                        </Link>
                      </Card>
                    ) : (
                      <Card className="border-amber-900/25 bg-gradient-to-br from-amber-950/30 to-black p-6">
                        <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                          <Award className="h-5 w-5 text-amber-400" />
                          Smokers club
                        </h3>
                        <p className="text-gray-400">
                          Your shop is not marked Smokers club–eligible yet, so tree placement and club metrics stay hidden
                          here. Read what the program offers and send a request from the Smokers club page—we will review
                          your store for the homepage tree.
                        </p>
                        <Link href="/vendor/advertising">
                          <Button className="mt-4 bg-amber-600 hover:bg-amber-700">Learn more &amp; request access</Button>
                        </Link>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      <AssistantPanel assistantType="vendor" triggerVariant="fab" />
    </div>
  );
}
