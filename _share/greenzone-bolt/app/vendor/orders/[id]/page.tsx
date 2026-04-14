'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import VendorNav from '@/components/vendor/VendorNav';
import {
  ArrowLeft,
  Clock,
  Package,
  CircleCheck as CheckCircle,
  Loader2,
  XCircle,
  Truck,
  Bell,
  Send,
  FileText,
  Eye,
  Copy,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import {
  lineQuantity,
  lineUnitCostCents,
  lineUnitPriceCents,
  orderGrossProfitCents,
  orderItemsArray,
} from '@/lib/orderProfit';
import {
  canVendorCancelStatus,
  canVendorMarkCompleteNow,
  nextFulfillmentStatus,
  normalizeOrderStatus,
  orderStatusLabel,
} from '@/lib/orderFulfillmentStatus';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { useToast } from '@/hooks/use-toast';
import { vendorCompleteOrderNow, vendorFulfillmentRpc } from '@/lib/vendorOrderFulfillment';

type FulfillmentRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
};

export default function VendorOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { ownedVendors, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<{
    id: string;
    order_number: string | null;
    total_cents: number;
    subtotal_cents: number | null;
    delivery_fee_cents: number | null;
    tax_cents: number | null;
    sales_tax_cents: number | null;
    excise_tax_cents: number | null;
    status: string;
    items: unknown;
    created_at: string;
    pickup_or_delivery: string | null;
    consumer_id: string | null;
    vendor_id: string | null;
    delivery_address: string | null;
    delivery_city: string | null;
    delivery_zip: string | null;
    customer_phone: string | null;
  } | null>(null);
  const [customerProfile, setCustomerProfile] = useState<{ email: string | null; full_name: string | null } | null>(
    null
  );
  const [vendorMeta, setVendorMeta] = useState<{ name: string | null; logo_url: string | null } | null>(null);
  const [idDocument, setIdDocument] = useState<{
    document_type: string;
    file_url: string;
    verified_status: string;
    created_at: string;
  } | null>(null);
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map());
  const [status, setStatus] = useState<string>('pending');
  const [saving, setSaving] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [updates, setUpdates] = useState<FulfillmentRow[]>([]);
  const [salesTaxRate, setSalesTaxRate] = useState<string>('');
  const [exciseTaxRate, setExciseTaxRate] = useState<string>('');
  const [applyTaxToDeliveryFee, setApplyTaxToDeliveryFee] = useState<boolean>(false);
  const [taxSaving, setTaxSaving] = useState<boolean>(false);

  const loadUpdates = useCallback(async (orderId: string) => {
    const { data, error } = await supabase
      .from('order_fulfillment_updates')
      .select('id,status,message,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) return;
    setUpdates((data || []) as FulfillmentRow[]);
  }, []);

  const load = useCallback(async () => {
    const vendorIds = ownedVendors.map((v) => v.id).filter(Boolean);
    if (!vendorIds.length || !vendorsMode || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id,order_number,total_cents,subtotal_cents,delivery_fee_cents,tax_cents,sales_tax_cents,excise_tax_cents,status,items,created_at,pickup_or_delivery,consumer_id,vendor_id,delivery_address,delivery_city,delivery_zip,customer_phone'
      )
      .eq('id', id)
      .in('vendor_id', vendorIds)
      .maybeSingle();

    if (error || !data) {
      setOrder(null);
      setCustomerProfile(null);
      setLoading(false);
      return;
    }
    const row = data as {
      id: string;
      order_number: string | null;
      total_cents: number;
      subtotal_cents: number | null;
      delivery_fee_cents: number | null;
      tax_cents: number | null;
      sales_tax_cents: number | null;
      excise_tax_cents: number | null;
      status: string;
      items: unknown;
      created_at: string;
      pickup_or_delivery: string | null;
      consumer_id: string | null;
      vendor_id: string | null;
      delivery_address: string | null;
      delivery_city: string | null;
      delivery_zip: string | null;
      customer_phone: string | null;
    };
    setOrder(row);
    setStatus(row.status);
    // Default tax editor inputs to reflect current `tax_cents` total.
    const baseCentsForTax = (row.subtotal_cents ?? 0) + (row.delivery_fee_cents ?? 0);
    const currSalesTaxCents = row.sales_tax_cents ?? 0;
    const currExciseTaxCents = row.excise_tax_cents ?? 0;
    setApplyTaxToDeliveryFee(true);
    setSalesTaxRate(baseCentsForTax > 0 ? ((currSalesTaxCents / baseCentsForTax) * 100).toFixed(3) : '0');
    setExciseTaxRate(baseCentsForTax > 0 ? ((currExciseTaxCents / baseCentsForTax) * 100).toFixed(3) : '0');

    const ids: string[] = [];
    for (const line of orderItemsArray(row.items)) {
      const pid = line.product_id;
      if (typeof pid === 'string') ids.push(pid);
    }
    if (ids.length) {
      const { data: costs } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', ids);
      const m = new Map<string, number>();
      for (const r of (costs || []) as { product_id: string; unit_cost_cents: number }[]) {
        m.set(r.product_id, r.unit_cost_cents);
      }
      setCostMap(m);
    } else {
      setCostMap(new Map());
    }
    await loadUpdates(row.id);

    if (row.vendor_id) {
      const { data: vrow, error: vErr } = await supabase
        .from('vendors')
        .select('name,logo_url')
        .eq('id', row.vendor_id)
        .maybeSingle();
      if (!vErr && vrow) {
        setVendorMeta({
          name: (vrow as { name?: string | null }).name ?? null,
          logo_url: (vrow as { logo_url?: string | null }).logo_url ?? null,
        });
      } else {
        setVendorMeta(null);
      }
    } else {
      setVendorMeta(null);
    }

    const { data: docRow, error: docErr } = await supabase
      .from('order_documents')
      .select('document_type,file_url,verified_status,created_at')
      .eq('order_id', row.id)
      .maybeSingle();
    if (!docErr && docRow) {
      setIdDocument(docRow as {
        document_type: string;
        file_url: string;
        verified_status: string;
        created_at: string;
      });
    } else {
      setIdDocument(null);
    }

    if (row.consumer_id) {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('email,full_name')
        .eq('id', row.consumer_id)
        .maybeSingle();
      if (!profErr && prof) {
        setCustomerProfile({
          email: (prof as { email?: string | null }).email ?? null,
          full_name: (prof as { full_name?: string | null }).full_name ?? null,
        });
      } else {
        setCustomerProfile(null);
      }
    } else {
      setCustomerProfile(null);
    }
    setLoading(false);
  }, [ownedVendors, vendorsMode, id, loadUpdates]);

  useEffect(() => {
    load();
  }, [load]);

  async function pushFulfillment(pNewStatus: string) {
    if (!order) return;
    setSaving(true);
    const msg = customerNote.trim() || null;
    const { error } = await vendorFulfillmentRpc(order.id, pNewStatus, msg);
    setSaving(false);
    if (error) {
      toast({
        title: 'Could not update order',
        description: formatSupabaseError(error),
        variant: 'destructive',
      });
      return;
    }
    setStatus(pNewStatus);
    setOrder((o) => (o ? { ...o, status: pNewStatus } : o));
    setCustomerNote('');
    await loadUpdates(order.id);
    toast({
      title: 'Customer notified',
      description: 'Status updated and a message was saved to their order timeline.',
    });
    router.refresh();
  }

  async function completeOrderNow() {
    if (!order) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Complete this order now? Intermediate steps are skipped. If you typed a note above, it will be sent to the customer.'
      )
    ) {
      return;
    }
    setSaving(true);
    const msg = customerNote.trim() || null;
    const { error } = await vendorCompleteOrderNow(order.id, msg);
    setSaving(false);
    if (error) {
      toast({
        title: 'Could not complete order',
        description: formatSupabaseError(error),
        variant: 'destructive',
      });
      return;
    }
    setStatus('completed');
    setOrder((o) => (o ? { ...o, status: 'completed' } : o));
    setCustomerNote('');
    await loadUpdates(order.id);
    toast({
      title: 'Order completed',
      description: 'The customer will see this on their order page.',
    });
    router.refresh();
  }

  function downloadTextFile(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const csvEscape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    const needsQuotes = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  async function saveTaxes() {
    if (!order) return;
    setTaxSaving(true);
    try {
      const salesRatePct = Number(salesTaxRate);
      const exciseRatePct = Number(exciseTaxRate);
      const safeSales = Number.isFinite(salesRatePct) ? salesRatePct : 0;
      const safeExcise = Number.isFinite(exciseRatePct) ? exciseRatePct : 0;

      const subtotalCents = order.subtotal_cents ?? 0;
      const deliveryFeeCents = order.delivery_fee_cents ?? 0;
      const taxBaseCents = subtotalCents + (applyTaxToDeliveryFee ? deliveryFeeCents : 0);

      const salesTaxCents = Math.max(0, Math.round((taxBaseCents * safeSales) / 100));
      const exciseTaxCents = Math.max(0, Math.round((taxBaseCents * safeExcise) / 100));
      const newTaxCents = salesTaxCents + exciseTaxCents;
      const newTotalCents = subtotalCents + deliveryFeeCents + newTaxCents;

      const { error: updErr } = await supabase
        .from('orders')
        .update({
          tax_cents: newTaxCents,
          sales_tax_cents: salesTaxCents,
          excise_tax_cents: exciseTaxCents,
          total_cents: newTotalCents,
        })
        .eq('id', order.id);
      if (updErr) throw updErr;

      setOrder((o) =>
        o
          ? {
              ...o,
              tax_cents: newTaxCents,
              sales_tax_cents: salesTaxCents,
              excise_tax_cents: exciseTaxCents,
              total_cents: newTotalCents,
            }
          : o
      );
      toast({ title: 'Taxes saved', description: 'Receipt totals have been updated.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Could not save taxes', description: msg, variant: 'destructive' });
    } finally {
      setTaxSaving(false);
    }
  }

  function exportCustomerCsv() {
    if (!order) return;
    const subtotalCents = order.subtotal_cents ?? 0;
    const deliveryFeeCents = order.delivery_fee_cents ?? 0;
    const salesTaxCents = order.sales_tax_cents ?? 0;
    const exciseTaxCents = order.excise_tax_cents ?? 0;
    const taxCents = order.tax_cents ?? salesTaxCents + exciseTaxCents;
    const totalCents = order.total_cents ?? 0;

    const customerName = customerProfile?.full_name ?? '';
    const customerEmail = customerProfile?.email ?? '';
    const customerPhone = order.customer_phone ?? '';

    const itemsSold = orderItemsArray(order.items)
      .map((line, idx) => {
        const q = lineQuantity(line);
        const pc = lineUnitPriceCents(line);
        const name = String(line.name ?? line.product_id ?? `Item ${idx + 1}`);
        const lineTotal = (pc * q) / 100;
        return `${name} (x${q}) $${lineTotal.toFixed(2)}`;
      })
      .join('; ');

    const created = new Date(order.created_at).toISOString();
    const pickup = order.pickup_or_delivery ?? '';

    const rows = [
      [
        'order_number',
        'order_id',
        'order_created_at',
        'pickup_or_delivery',
        'customer_name',
        'customer_email',
        'customer_phone',
        'delivery_address',
        'delivery_city',
        'delivery_zip',
        'items_sold',
        'subtotal',
        'delivery_fee',
        'sales_tax',
        'excise_tax',
        'tax',
        'total',
      ],
      [
        order.order_number ?? '',
        order.id,
        created,
        pickup,
        customerName,
        customerEmail,
        customerPhone,
        order.delivery_address ?? '',
        order.delivery_city ?? '',
        order.delivery_zip ?? '',
        itemsSold,
        (subtotalCents / 100).toFixed(2),
        (deliveryFeeCents / 100).toFixed(2),
        (salesTaxCents / 100).toFixed(2),
        (exciseTaxCents / 100).toFixed(2),
        (taxCents / 100).toFixed(2),
        (totalCents / 100).toFixed(2),
      ],
    ];

    const csv = rows.map((r) => r.map((c) => csvEscape(c)).join(',')).join('\n');
    downloadTextFile(`order_${order.order_number ?? order.id.slice(0, 8)}_customer.csv`, csv, 'text/csv;charset=utf-8');
  }

  async function copyToClipboard(text: string, label: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: `${label} copied.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Copy failed', description: msg, variant: 'destructive' });
    }
  }

  const normalized = normalizeOrderStatus(status);
  const next = nextFulfillmentStatus(status);
  const showCancel = canVendorCancelStatus(status);
  const showCompleteNow = canVendorMarkCompleteNow(status) && next !== 'completed';

  if (authLoading || vLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !ownedVendors.length) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">You can’t view this order.</p>
        <Button asChild className="mt-4 bg-green-600">
          <Link href="/vendor/orders">Back</Link>
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">Order not found.</p>
        <Button asChild className="mt-4 bg-green-600">
          <Link href="/vendor/orders">Back</Link>
        </Button>
      </div>
    );
  }

  const lines = orderItemsArray(order.items);
  const profitCents = orderGrossProfitCents(order.items, costMap);
  const subtotalCents = order.subtotal_cents ?? 0;
  const deliveryFeeCents = order.delivery_fee_cents ?? 0;
  const salesTaxCents = order.sales_tax_cents ?? 0;
  const exciseTaxCents = order.excise_tax_cents ?? 0;
  const taxCents = order.tax_cents ?? salesTaxCents + exciseTaxCents;
  const totalCents = order.total_cents ?? 0;
  const customerPhone = order.customer_phone ?? '';
  const fullAddress = order.delivery_address
    ? [order.delivery_address, order.delivery_city, order.delivery_zip].filter(Boolean).join(', ')
    : '';

  const salesRatePct = Number(salesTaxRate);
  const exciseRatePct = Number(exciseTaxRate);
  const safeSales = Number.isFinite(salesRatePct) ? salesRatePct : 0;
  const safeExcise = Number.isFinite(exciseRatePct) ? exciseRatePct : 0;
  const taxBaseCents = subtotalCents + (applyTaxToDeliveryFee ? deliveryFeeCents : 0);
  const computedSalesTaxCents = Math.max(0, Math.round((taxBaseCents * safeSales) / 100));
  const computedExciseTaxCents = Math.max(0, Math.round((taxBaseCents * safeExcise) / 100));
  const computedTaxCents = computedSalesTaxCents + computedExciseTaxCents;
  const computedTotalCents = subtotalCents + deliveryFeeCents + computedTaxCents;

  const statusBadgeClass = (s: string) => {
    const n = normalizeOrderStatus(s);
    switch (n) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'accepted':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'en_route':
        return 'bg-sky-600/20 text-sky-300 border-sky-600/30';
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <VendorNav />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/vendor/orders">
          <Button variant="outline" className="mb-4 border-green-600/30 hover:bg-green-600/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Button>
        </Link>

        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            {vendorMeta?.logo_url ? (
              <img
                src={vendorMeta.logo_url}
                alt={vendorMeta.name ?? 'Vendor'}
                className="h-12 w-12 rounded-lg object-cover ring-1 ring-green-900/30 bg-black/40"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-900/50 ring-1 ring-green-900/30" />
            )}
            <div>
              <h1 className="mb-2 font-mono text-3xl font-bold">
                {order.order_number?.trim() || `Order …${order.id.slice(0, 8)}`}
              </h1>
              <p className="text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>
          <Badge className={`border px-3 py-1 ${statusBadgeClass(status)}`}>{orderStatusLabel(status)}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h2 className="mb-4 text-xl font-semibold">Receipt (items & totals)</h2>
              <div className="space-y-4">
                {lines.length === 0 ? (
                  <p className="text-gray-500">No structured line items (empty or legacy JSON).</p>
                ) : (
                  lines.map((line, idx) => {
                    const q = lineQuantity(line);
                    const pc = lineUnitPriceCents(line);
                    const cc = lineUnitCostCents(line, costMap);
                    const name = String(line.name ?? line.product_id ?? `Line ${idx + 1}`);
                    return (
                      <div key={idx} className="flex justify-between gap-4 border-b border-gray-800 pb-4 last:border-0">
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-gray-500">
                            Qty {q} · Sell ${((pc * q) / 100).toFixed(2)} · Cost ${((cc * q) / 100).toFixed(2)} · Margin $
                            {(((pc - cc) * q) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Separator className="my-6 bg-gray-800" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery</span>
                  <span>${(deliveryFeeCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sales tax</span>
                  <span>${(salesTaxCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Excise tax</span>
                  <span>${(exciseTaxCents / 100).toFixed(2)}</span>
                </div>
                <Separator className="my-3 bg-gray-800" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-400">${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>

              <Separator className="my-6 bg-gray-800" />

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Add taxes</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Computed from <span className="text-gray-300">subtotal</span> (and optionally delivery fee) using sales + excise rates.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="sales_tax_rate">Sales tax (%)</Label>
                    <Input
                      id="sales_tax_rate"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={salesTaxRate}
                      onChange={(e) => setSalesTaxRate(e.target.value)}
                      className="border-green-900/30 bg-gray-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="excise_tax_rate">Excise tax (%)</Label>
                    <Input
                      id="excise_tax_rate"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={exciseTaxRate}
                      onChange={(e) => setExciseTaxRate(e.target.value)}
                      className="border-green-900/30 bg-gray-950 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={applyTaxToDeliveryFee}
                    onCheckedChange={setApplyTaxToDeliveryFee}
                    className="border-green-700/40 data-[state=checked]:bg-green-600"
                  />
                  <Label>Apply tax to delivery fee</Label>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Computed sales tax</span>
                    <span>${(computedSalesTaxCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Computed excise tax</span>
                    <span>${(computedExciseTaxCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Computed tax (total)</span>
                    <span>${(computedTaxCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Computed total</span>
                    <span className="text-green-300">${(computedTotalCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={taxSaving}
                  onClick={() => void saveTaxes()}
                >
                  {taxSaving ? <span>Saving…</span> : 'Save taxes'}
                </Button>
              </div>

              <div className="mt-6 flex justify-between text-sm text-green-400/90">
                <span>Est. gross profit (lines only)</span>
                <span>${(profitCents / 100).toFixed(2)}</span>
              </div>
            </Card>
          </div>

          <div className="order-1 space-y-6 lg:order-2">
            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h3 className="mb-3 font-semibold">Fulfillment</h3>
              <p className="text-sm text-gray-400">
                {order.pickup_or_delivery ? (
                  <Badge className="border-gray-600 capitalize">{order.pickup_or_delivery}</Badge>
                ) : (
                  '—'
                )}
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="font-medium">
                    {customerProfile?.full_name?.trim() ? customerProfile.full_name : order.consumer_id ? `User ${order.consumer_id.slice(0, 8)}…` : '—'}
                  </p>
                  <p className="text-xs text-gray-500">{customerProfile?.email?.trim() ? customerProfile.email : '—'}</p>
                  {order.customer_phone && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">Phone: {customerPhone}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-green-600/30 bg-transparent text-green-200 hover:bg-green-600/10"
                        onClick={() => void copyToClipboard(customerPhone, 'Phone')}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Address</p>
                  {order.delivery_address ? (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{order.delivery_address}</p>
                        <p className="text-xs text-gray-500">
                          {[order.delivery_city, order.delivery_zip].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-green-600/30 bg-transparent text-green-200 hover:bg-green-600/10"
                        onClick={() => void copyToClipboard(fullAddress, 'Address')}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-200">—</p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-green-600/30 bg-transparent hover:bg-green-600/10"
                  disabled={taxSaving}
                  onClick={() => exportCustomerCsv()}
                >
                  Export customer CSV
                </Button>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">Identity document</p>
                    {idDocument ? (
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {idDocument.document_type.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-600/40 text-red-300">
                        Missing
                      </Badge>
                    )}
                  </div>

                  {idDocument ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        className="w-full bg-green-600 hover:bg-green-700"
                        asChild
                      >
                        <a href={idDocument.file_url} target="_blank" rel="noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          View ID
                        </a>
                      </Button>
                      <p className="text-xs text-gray-500">
                        Status: <span className="text-gray-300">{idDocument.verified_status}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No document was attached to this order.</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <Send className="h-4 w-4 text-green-500" />
                Notify customer & advance status
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Flow: <span className="text-gray-300">Pending → Accepted → En route → Completed</span>, or use{' '}
                <span className="text-gray-300">Complete order now</span> to jump straight to finished (e.g. pickup).
                Optional note is shown on the shopper&apos;s order page.
              </p>
              <Textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Optional message (e.g. ETA, pickup window, driver name)…"
                rows={3}
                className="mb-4 border-green-900/30 bg-gray-950 text-white"
                disabled={saving || normalized === 'completed' || normalized === 'cancelled'}
              />
              <div className="flex flex-col gap-2">
                {next && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={saving}
                    onClick={() => pushFulfillment(next)}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : next === 'accepted' ? (
                      'Mark accepted'
                    ) : next === 'en_route' ? (
                      'Mark en route'
                    ) : (
                      'Mark completed'
                    )}
                  </Button>
                )}
                {showCompleteNow && (
                  <Button
                    variant="outline"
                    className="w-full border-green-500/50 text-green-300 hover:bg-green-950/40"
                    disabled={saving}
                    onClick={() => completeOrderNow()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete order now'}
                  </Button>
                )}
                {showCancel && (
                  <Button
                    variant="outline"
                    className="w-full border-red-600/40 text-red-300 hover:bg-red-600/10"
                    disabled={saving}
                    onClick={() => {
                      if (typeof window !== 'undefined' && !window.confirm('Cancel this order for the customer?')) return;
                      pushFulfillment('cancelled');
                    }}
                  >
                    Cancel order
                  </Button>
                )}
                {(normalized === 'completed' || normalized === 'cancelled') && (
                  <p className="text-center text-sm text-gray-500">This order is closed — no further status changes.</p>
                )}
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Bell className="h-4 w-4 text-green-500" />
                Sent to customer
              </h3>
              {updates.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications yet. Advance the order to log the default message.</p>
              ) : (
                <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
                  {updates.map((u) => (
                    <li key={u.id} className="border-l-2 border-green-600/30 pl-3">
                      <p className="text-xs text-gray-500">
                        {new Date(u.created_at).toLocaleString()} · {orderStatusLabel(u.status)}
                      </p>
                      <p className="text-gray-200">{u.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <Package className="h-4 w-4 text-green-500" />
                Status reference
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Pending — new order
                </li>
                <li className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Accepted — preparing
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4" /> En route — out for delivery / on the way
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Completed
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> Cancelled
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
