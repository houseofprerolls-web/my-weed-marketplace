'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FileDown,
  Eye,
  Copy,
  Printer,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import {
  cloneOrderItemsForEdit,
  collectProductIdsFromOrders,
  lineQuantity,
  lineSnapshotImageUrl,
  lineUnitCostCents,
  lineUnitPriceCents,
  orderGrossProfitCents,
  orderItemsArray,
  type RawOrderItem,
} from '@/lib/orderProfit';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { totalsFromSubtotalAndDeliveryCents, CHECKOUT_MERCHANDISE_TAX_RATE } from '@/lib/orderCheckoutTotals';
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
import {
  downloadVendorOrderReceiptPdf,
  openVendorOrderReceiptPdfTab,
  openVendorOrderReceiptPrintPreview,
  type VendorOrderReceiptPayload,
} from '@/lib/vendorOrderReceipt';

type FulfillmentRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
};

export default function VendorOrderDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] ?? '' : '';
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { ownedVendors, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  useLayoutEffect(() => {
    if (!id || typeof window === 'undefined') return;
    window.scrollTo(0, 0);
  }, [id]);

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
    is_scheduled: boolean | null;
    scheduled_for: string | null;
    consumer_id: string | null;
    vendor_id: string | null;
    delivery_address: string | null;
    delivery_city: string | null;
    delivery_zip: string | null;
    customer_phone: string | null;
    fulfillment_notes: string | null;
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
  const [draftItems, setDraftItems] = useState<RawOrderItem[]>([]);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [menuProductSearch, setMenuProductSearch] = useState('');
  const [menuProducts, setMenuProducts] = useState<
    { id: string; name: string; price_cents: number; image: string | null }[]
  >([]);
  const [menuProductsLoading, setMenuProductsLoading] = useState(false);
  const [productImageById, setProductImageById] = useState<Map<string, string>>(() => new Map());

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
        'id,order_number,total_cents,subtotal_cents,delivery_fee_cents,tax_cents,sales_tax_cents,excise_tax_cents,status,items,created_at,pickup_or_delivery,is_scheduled,scheduled_for,consumer_id,vendor_id,delivery_address,delivery_city,delivery_zip,customer_phone,fulfillment_notes'
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
      is_scheduled: boolean | null;
      scheduled_for: string | null;
      consumer_id: string | null;
      vendor_id: string | null;
      delivery_address: string | null;
      delivery_city: string | null;
      delivery_zip: string | null;
      customer_phone: string | null;
      fulfillment_notes: string | null;
    };
    setOrder(row);
    setStatus(row.status);
    setDraftItems(cloneOrderItemsForEdit(row.items));

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

  useEffect(() => {
    if (!order?.id || !user?.id || authLoading) return;
    void supabase.from('vendor_order_reads').upsert(
      { order_id: order.id, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'order_id,user_id' }
    );
  }, [order?.id, user?.id, authLoading]);

  useEffect(() => {
    if (!order?.items) {
      setProductImageById(new Map());
      return;
    }
    const ids = collectProductIdsFromOrders([order.items]);
    if (ids.length === 0) {
      setProductImageById(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from('products').select('id, images').in('id', ids);
      if (cancelled) return;
      if (error) {
        setProductImageById(new Map());
        return;
      }
      const m = new Map<string, string>();
      for (const row of data ?? []) {
        const imgs = row.images as string[] | null | undefined;
        if (!Array.isArray(imgs)) continue;
        const first = imgs.find((u) => typeof u === 'string' && u.trim());
        if (first) m.set(row.id, first.trim());
      }
      setProductImageById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.items]);

  const resolveLineImageUrl = useCallback(
    (line: RawOrderItem) => {
      const snap = lineSnapshotImageUrl(line);
      if (snap) return snap;
      const pid = typeof line.product_id === 'string' ? line.product_id : '';
      return pid ? productImageById.get(pid) ?? null : null;
    },
    [productImageById]
  );

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

  const loadMenuProductsForPicker = useCallback(async () => {
    const vid = order?.vendor_id;
    if (!vid) return;
    setMenuProductsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,price_cents,images')
      .eq('vendor_id', vid)
      .order('name')
      .limit(400);
    setMenuProductsLoading(false);
    if (error) {
      toast({ title: 'Could not load products', description: error.message, variant: 'destructive' });
      setMenuProducts([]);
      return;
    }
    const rows = (data || []) as { id: string; name: string; price_cents: number; images?: string[] | null }[];
    setMenuProducts(
      rows.map((r) => {
        const imgs = r.images;
        const image =
          Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === 'string' && imgs[0].trim()
            ? imgs[0].trim()
            : null;
        return { id: r.id, name: r.name, price_cents: r.price_cents, image };
      })
    );
  }, [order?.vendor_id, toast]);

  async function saveOrderItems() {
    if (!order) return;
    setItemsSaving(true);
    try {
      if (draftItems.length === 0) {
        toast({ title: 'Need at least one line', description: 'Add a product or adjust quantities.', variant: 'destructive' });
        return;
      }
      for (const line of draftItems) {
        if (lineQuantity(line) < 1) {
          toast({ title: 'Invalid quantity', description: 'Each line needs quantity ≥ 1.', variant: 'destructive' });
          return;
        }
      }
      const itemsJson = draftItems.map((line) => {
        const q = lineQuantity(line);
        const uc = lineUnitPriceCents(line);
        return {
          product_id: typeof line.product_id === 'string' ? line.product_id : null,
          name: String(line.name ?? line.product_id ?? 'Item'),
          quantity: q,
          unit_price_cents: uc,
          image: typeof line.image === 'string' ? line.image : null,
          tier_id: typeof line.tier_id === 'string' ? line.tier_id : null,
          quantity_label: typeof line.quantity_label === 'string' ? line.quantity_label : null,
        };
      });
      const subtotalCents = itemsJson.reduce((s, row) => s + row.unit_price_cents * row.quantity, 0);
      const deliveryFeeCents = order.delivery_fee_cents ?? 0;
      const t = totalsFromSubtotalAndDeliveryCents(subtotalCents, deliveryFeeCents);
      const { error: updErr } = await supabase
        .from('orders')
        .update({
          items: itemsJson,
          subtotal_cents: subtotalCents,
          tax_cents: t.taxCents,
          sales_tax_cents: t.salesTaxCents,
          excise_tax_cents: t.exciseTaxCents,
          total_cents: t.totalCents,
        })
        .eq('id', order.id);
      if (updErr) throw updErr;
      setOrder((o) =>
        o
          ? {
              ...o,
              items: itemsJson,
              subtotal_cents: subtotalCents,
              tax_cents: t.taxCents,
              sales_tax_cents: t.salesTaxCents,
              excise_tax_cents: t.exciseTaxCents,
              total_cents: t.totalCents,
            }
          : o
      );
      setDraftItems(cloneOrderItemsForEdit(itemsJson));
      const ids = itemsJson.map((r) => r.product_id).filter((x): x is string => typeof x === 'string' && x.length > 0);
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
      toast({
        title: 'Order updated',
        description: `Line items saved. Tax (${Math.round(CHECKOUT_MERCHANDISE_TAX_RATE * 100)}% on subtotal) and total were recalculated.`,
      });
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: 'Could not save order',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setItemsSaving(false);
    }
  }

  function updateLineQty(idx: number, raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return;
    setDraftItems((prev) => {
      const next = [...prev];
      const copy = { ...next[idx] };
      copy.quantity = n;
      copy.qty = n;
      next[idx] = copy;
      return next;
    });
  }

  function updateLinePriceDollars(idx: number, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setDraftItems((prev) => {
      const next = [...prev];
      const copy = { ...next[idx] };
      copy.unit_price_cents = Math.round(n * 100);
      next[idx] = copy;
      return next;
    });
  }

  function removeLine(idx: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addProductFromMenu(p: { id: string; name: string; price_cents: number; image: string | null }) {
    setDraftItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        name: p.name,
        quantity: 1,
        unit_price_cents: p.price_cents,
        ...(p.image ? { image: p.image } : {}),
      },
    ]);
    setAddProductOpen(false);
    setMenuProductSearch('');
  }

  function exportCustomerCsv() {
    if (!order) return;
    const norm = normalizeOrderStatus(order.status);
    const editable = norm === 'pending' || norm === 'accepted' || norm === 'en_route';
    const lineArr = orderItemsArray(editable ? draftItems : order.items);
    const subtotalCents = lineArr.reduce((s, line) => s + lineUnitPriceCents(line) * lineQuantity(line), 0);
    const deliveryFeeCents = order.delivery_fee_cents ?? 0;
    const t = totalsFromSubtotalAndDeliveryCents(subtotalCents, deliveryFeeCents);
    const salesTaxCents = t.salesTaxCents;
    const exciseTaxCents = t.exciseTaxCents;
    const taxCents = t.taxCents;
    const totalCents = t.totalCents;

    const customerName = customerProfile?.full_name ?? '';
    const customerEmail = customerProfile?.email ?? '';
    const customerPhone = order.customer_phone ?? '';

    const itemsSold = lineArr
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

  const receiptPdfPayload = useMemo((): VendorOrderReceiptPayload | null => {
    if (!order) return null;
    return {
      storeName: vendorMeta?.name,
      storeLogoUrl: vendorMeta?.logo_url ?? null,
      orderNumber: order.order_number,
      orderId: order.id,
      createdAt: order.created_at,
      status: order.status,
      pickupOrDelivery: order.pickup_or_delivery,
      scheduledFor: order.scheduled_for ?? undefined,
      items: order.items,
      subtotalCents: order.subtotal_cents,
      deliveryFeeCents: order.delivery_fee_cents,
      salesTaxCents: order.sales_tax_cents,
      exciseTaxCents: order.excise_tax_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      fulfillmentNotes: order.fulfillment_notes,
      deliveryAddress: order.delivery_address,
      deliveryCity: order.delivery_city,
      deliveryZip: order.delivery_zip,
      customerPhone: order.customer_phone,
      customerName: customerProfile?.full_name ?? null,
      customerEmail: customerProfile?.email ?? null,
    };
  }, [order, vendorMeta, customerProfile]);

  const normalized = normalizeOrderStatus(status);
  const canEditItems =
    order != null && (normalized === 'pending' || normalized === 'accepted' || normalized === 'en_route');
  const next = nextFulfillmentStatus(status);
  const showCancel = canVendorCancelStatus(status);
  const showCompleteNow = canVendorMarkCompleteNow(status) && next !== 'completed';

  if (authLoading || vLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell || !vendorsMode || !ownedVendors.length) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">You can’t view this order.</p>
        <Button asChild className="mt-4 bg-green-600">
          <Link href={vLink('/vendor/orders')}>Back</Link>
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">Order not found.</p>
        {isAdmin ? (
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
            If you are managing a shop as admin, open orders with{' '}
            <span className="font-mono text-zinc-400">?vendor=&lt;store-id&gt;</span> in the URL (use{' '}
            <span className="text-zinc-400">All orders</span> or dashboard links so the store context is kept).
          </p>
        ) : null}
        <Button asChild className="mt-4 bg-green-600">
          <Link href={vLink('/vendor/orders')}>Back</Link>
        </Button>
      </div>
    );
  }

  const lines = canEditItems ? draftItems : orderItemsArray(order.items);
  const profitCents = orderGrossProfitCents(lines, costMap);
  const subtotalCents = lines.reduce((s, line) => s + lineUnitPriceCents(line) * lineQuantity(line), 0);
  const deliveryFeeCents = order.delivery_fee_cents ?? 0;
  const { taxCents, totalCents } = totalsFromSubtotalAndDeliveryCents(subtotalCents, deliveryFeeCents);
  const customerPhone = order.customer_phone ?? '';
  const fullAddress = order.delivery_address
    ? [order.delivery_address, order.delivery_city, order.delivery_zip].filter(Boolean).join(', ')
    : '';

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
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <div className="container mx-auto px-4 py-8 print:max-w-none print:px-6 print:py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 print:block">
          <div className="print:hidden md:col-span-1">
            <VendorNav />
          </div>

          <div className="min-w-0 md:col-span-3 print:w-full">
        <div className="print:hidden">
          <Link href={vLink('/vendor/orders')}>
            <Button variant="outline" className="mb-4 border-green-600/30 hover:bg-green-600/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center print:mb-4">
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

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          <div className="min-w-0 space-y-6 md:col-span-2">
            <Card className="border-green-900/20 bg-gray-900/50 p-6">
              <div className="mb-4 flex flex-col gap-4 border-b border-zinc-800/80 pb-4 print:border-zinc-300 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">Receipt (items & totals)</h2>
                  <p className="mt-1 text-xs text-zinc-500 print:text-zinc-600">
                    Photos come from checkout snapshots and your menu. PDF matches this receipt.
                  </p>
                </div>
                {receiptPdfPayload ? (
                  <div className="flex flex-shrink-0 flex-wrap gap-2 print:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-green-600/40 text-gray-200 hover:bg-green-950/40"
                      onClick={() => {
                        try {
                          openVendorOrderReceiptPrintPreview(receiptPdfPayload);
                        } catch (e) {
                          toast({
                            title: 'Could not open print view',
                            description: formatSupabaseError(e),
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <Printer className="mr-1.5 h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-green-600/40 text-gray-200 hover:bg-green-950/40"
                      onClick={async () => {
                        try {
                          const w = await openVendorOrderReceiptPdfTab(receiptPdfPayload);
                          if (!w) {
                            toast({
                              title: 'Pop-up blocked',
                              description: 'Allow pop-ups to view the PDF, or use Download.',
                              variant: 'destructive',
                            });
                          }
                        } catch (e) {
                          toast({
                            title: 'Could not open PDF',
                            description: formatSupabaseError(e),
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <FileText className="mr-1.5 h-4 w-4" />
                      View PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-green-600/40 text-gray-200 hover:bg-green-950/40"
                      onClick={async () => {
                        try {
                          await downloadVendorOrderReceiptPdf(receiptPdfPayload);
                        } catch (e) {
                          toast({
                            title: 'Could not download PDF',
                            description: formatSupabaseError(e),
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <FileDown className="mr-1.5 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : null}
              </div>
              {canEditItems ? (
                <p className="mb-3 text-xs text-zinc-500">
                  Change quantities, unit prices, remove lines, or add a product from your menu. Tax (
                  {Math.round(CHECKOUT_MERCHANDISE_TAX_RATE * 100)}% on merchandise subtotal) and the order total
                  recalculate when you save. Delivery fee is not changed here.
                </p>
              ) : null}
              {order.fulfillment_notes?.trim() ? (
                <div className="mb-4 rounded-lg border border-amber-800/40 bg-amber-950/25 p-4 print:border-amber-300 print:bg-amber-50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90 print:text-amber-900">
                    Customer / delivery notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-amber-100/95 print:text-gray-900">
                    {order.fulfillment_notes.trim()}
                  </p>
                </div>
              ) : null}
              <div className="space-y-4">
                {lines.length === 0 ? (
                  <p className="text-gray-500 print:text-gray-700">
                    No structured line items (empty or legacy JSON).
                  </p>
                ) : !canEditItems ? (
                  <div className="-mx-1 overflow-x-auto print:overflow-visible">
                    <div className="min-w-[32rem]">
                      <div
                        className="mb-2 grid grid-cols-[56px_minmax(0,1fr)_44px_72px_88px] gap-3 border-b border-zinc-700 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 print:grid"
                        aria-hidden
                      >
                        <span>Photo</span>
                        <span>Product</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit</span>
                        <span className="text-right">Line</span>
                      </div>
                      <div className="divide-y divide-zinc-800/90 print:divide-zinc-300">
                        {lines.map((line, idx) => {
                          const q = lineQuantity(line);
                          const pc = lineUnitPriceCents(line);
                          const cc = lineUnitCostCents(line, costMap);
                          const name = String(line.name ?? line.product_id ?? `Line ${idx + 1}`);
                          const pid = typeof line.product_id === 'string' ? line.product_id : '';
                          const imgUrl = resolveLineImageUrl(line);
                          const tierOrLabel =
                            typeof line.quantity_label === 'string' && line.quantity_label.trim()
                              ? line.quantity_label.trim()
                              : null;
                          return (
                            <div
                              key={`${pid || 'x'}-${idx}`}
                              className="grid grid-cols-[56px_minmax(0,1fr)_44px_72px_88px] items-center gap-3 py-3.5 print:grid"
                            >
                              <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800">
                                {imgUrl ? (
                                  <OptimizedImg
                                    src={imgUrl}
                                    alt={name}
                                    className="h-full w-full object-cover"
                                    preset="thumb"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                    <Package className="h-6 w-6 shrink-0" aria-hidden />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 pr-1">
                                <p className="font-medium leading-snug text-white print:text-gray-900">{name}</p>
                                {tierOrLabel ? (
                                  <p className="mt-0.5 text-xs text-zinc-500 print:text-gray-600">{tierOrLabel}</p>
                                ) : null}
                                {pid ? (
                                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600 print:text-gray-500">
                                    {pid.slice(0, 8)}…{pid.slice(-4)}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs text-zinc-500 print:text-gray-600">
                                  Sell ${((pc * q) / 100).toFixed(2)} · Cost ${((cc * q) / 100).toFixed(2)} · Margin $
                                  {(((pc - cc) * q) / 100).toFixed(2)}
                                </p>
                              </div>
                              <p className="text-center text-sm tabular-nums text-zinc-200 print:text-gray-900">{q}</p>
                              <p className="text-right text-sm tabular-nums text-zinc-300 print:text-gray-900">
                                ${(pc / 100).toFixed(2)}
                              </p>
                              <p className="text-right text-sm font-semibold tabular-nums text-white print:text-gray-900">
                                ${((pc * q) / 100).toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  lines.map((line, idx) => {
                    const q = lineQuantity(line);
                    const pc = lineUnitPriceCents(line);
                    const cc = lineUnitCostCents(line, costMap);
                    const name = String(line.name ?? line.product_id ?? `Line ${idx + 1}`);
                    const pid = typeof line.product_id === 'string' ? line.product_id : '';
                    const imgUrl = resolveLineImageUrl(line);
                    return (
                      <div
                        key={`edit-${pid || 'x'}-${idx}`}
                        className="rounded-lg border border-zinc-700/80 bg-zinc-950/35 p-4 print:border-zinc-300 print:bg-white"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="mx-auto h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 sm:mx-0">
                            {imgUrl ? (
                              <OptimizedImg
                                src={imgUrl}
                                alt={name}
                                className="h-full w-full object-cover"
                                preset="thumb"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                <Package className="h-7 w-7 shrink-0" aria-hidden />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-4">
                            <div>
                              <Label className="text-xs text-zinc-500">Product</Label>
                              <p className="font-medium text-white">{name}</p>
                              {pid ? (
                                <p className="font-mono text-[10px] text-zinc-600">{pid.slice(0, 13)}…</p>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
                              <div className="sm:col-span-3">
                                <Label className="text-xs text-zinc-500">Quantity</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={q}
                                  onChange={(e) => updateLineQty(idx, e.target.value)}
                                  className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                />
                              </div>
                              <div className="sm:col-span-4">
                                <Label className="text-xs text-zinc-500">Unit price ($)</Label>
                                <Input
                                  key={`price-${idx}-${pc}`}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  defaultValue={(pc / 100).toFixed(2)}
                                  onBlur={(e) => updateLinePriceDollars(idx, e.target.value)}
                                  className="mt-1 border-green-900/30 bg-gray-950 text-white"
                                />
                              </div>
                              <div className="flex sm:col-span-5 sm:justify-end sm:pb-0.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-red-900/50 text-red-300 hover:bg-red-950/30 sm:w-auto"
                                  onClick={() => removeLine(idx)}
                                  aria-label="Remove line"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-zinc-500">
                              Line ${((pc * q) / 100).toFixed(2)} · Cost ${((cc * q) / 100).toFixed(2)} · Margin $
                              {(((pc - cc) * q) / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {canEditItems ? (
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-green-600/40 text-gray-200"
                    onClick={() => {
                      setAddProductOpen(true);
                      setMenuProductSearch('');
                      void loadMenuProductsForPicker();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add from menu
                  </Button>
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={itemsSaving}
                    onClick={() => void saveOrderItems()}
                  >
                    {itemsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save item changes'}
                  </Button>
                </div>
              ) : null}

              <Separator className="my-6 bg-gray-800 print:bg-gray-300" />

              <div className="space-y-2 print:text-gray-900">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">Subtotal</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">Delivery</span>
                  <span>${(deliveryFeeCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">
                    Tax ({Math.round(CHECKOUT_MERCHANDISE_TAX_RATE * 100)}% on subtotal)
                  </span>
                  <span>${(taxCents / 100).toFixed(2)}</span>
                </div>
                <Separator className="my-3 bg-gray-800 print:bg-gray-300" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-400 print:text-gray-900">${(totalCents / 100).toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-zinc-600 print:text-gray-600">
                  Tax is calculated automatically (same rule as checkout). Excise is not applied in this flow.
                </p>
              </div>

              <div className="mt-6 flex justify-between text-sm text-green-400/90 print:hidden">
                <span>Est. gross profit (lines only)</span>
                <span>${(profitCents / 100).toFixed(2)}</span>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card className="border-green-900/20 bg-gray-900/50 p-6 print:break-inside-avoid print:border print:border-gray-300 print:bg-white print:text-black print:shadow-none">
              <h3 className="mb-3 font-semibold print:text-black">Fulfillment</h3>
              <p className="text-sm text-gray-400">
                {order.pickup_or_delivery ? (
                  <Badge className="border-gray-600 capitalize">{order.pickup_or_delivery}</Badge>
                ) : (
                  '—'
                )}
              </p>
              {order.is_scheduled && order.scheduled_for ? (
                <p className="mt-2 text-sm text-amber-300">
                  Scheduled for: {new Date(order.scheduled_for).toLocaleString()}
                </p>
              ) : null}
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
                        className="border-green-600/30 bg-transparent text-green-200 hover:bg-green-600/10 print:hidden"
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
                        className="border-green-600/30 bg-transparent text-green-200 hover:bg-green-600/10 print:hidden"
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
                  className="w-full border-green-600/30 bg-transparent hover:bg-green-600/10 print:hidden"
                  disabled={itemsSaving}
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
                    ) : String(order.pickup_or_delivery ?? '') === 'pickup' &&
                      !order.delivery_address &&
                      !order.delivery_city ? (
                      <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                        Not required
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
                  ) : String(order.pickup_or_delivery ?? '') === 'pickup' &&
                    !order.delivery_address &&
                    !order.delivery_city ? (
                    <p className="text-xs text-gray-500">
                      Scheduled in-store pickup — ID was not collected for this order.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">No document was attached to this order.</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="border-green-900/20 bg-gray-900/50 p-6 print:hidden">
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

            <Card className="border-green-900/20 bg-gray-900/50 p-6 print:break-inside-avoid print:border print:border-gray-300 print:bg-white print:shadow-none">
              <h3 className="mb-3 flex items-center gap-2 font-semibold print:text-black">
                <Bell className="h-4 w-4 text-green-500 print:text-gray-800" />
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

            <Card className="border-green-900/20 bg-gray-900/50 p-6 print:hidden">
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

        <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
          <DialogContent className="max-h-[85vh] border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add product to order</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Search menu…"
              value={menuProductSearch}
              onChange={(e) => setMenuProductSearch(e.target.value)}
              className="border-zinc-700 bg-background text-foreground"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto py-2">
              {menuProductsLoading ? (
                <p className="text-sm text-zinc-500">Loading products…</p>
              ) : (
                menuProducts
                  .filter((p) => p.name.toLowerCase().includes(menuProductSearch.trim().toLowerCase()))
                  .slice(0, 100)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-800 px-3 py-2 text-left text-sm hover:bg-zinc-900"
                      onClick={() => addProductFromMenu(p)}
                    >
                      <span className="min-w-0 truncate">{p.name}</span>
                      <span className="shrink-0 font-medium text-green-400">${(p.price_cents / 100).toFixed(2)}</span>
                    </button>
                  ))
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 text-zinc-200"
                onClick={() => setAddProductOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
