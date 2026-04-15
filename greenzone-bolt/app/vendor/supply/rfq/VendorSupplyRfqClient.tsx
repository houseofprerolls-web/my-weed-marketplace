'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupplyRfqDraft } from '@/contexts/SupplyRfqDraftContext';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAuth } from '@/contexts/AuthContext';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { useToast } from '@/hooks/use-toast';

export default function VendorSupplyRfqClient({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const { vendor, loading: vLoading } = useVendorBusiness({ adminMenuVendorId });
  const { linesFor, removeLine, setQty, clearDraft } = useSupplyRfqDraft();

  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierSlug, setSupplierSlug] = useState<string>('');
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [buyerNote, setBuyerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lines = useMemo(() => (supplierId ? linesFor(supplierId) : []), [supplierId, linesFor]);

  const loadSupplier = useCallback(async () => {
    if (!supplierId) return;
    setLoadingMeta(true);
    const { data } = await supabase
      .from('supply_accounts')
      .select('name,slug')
      .eq('id', supplierId)
      .eq('is_published', true)
      .maybeSingle();
    if (data) {
      setSupplierName((data as { name: string }).name);
      setSupplierSlug((data as { slug: string }).slug ?? '');
    } else {
      setSupplierName('');
      setSupplierSlug('');
    }
    setLoadingMeta(false);
  }, [supplierId]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const submit = async () => {
    if (!vendor?.id || !supplierId) {
      toast({ variant: 'destructive', title: 'Missing vendor', description: 'Select a shop context first.' });
      return;
    }
    if (!lines.length) {
      toast({ variant: 'destructive', title: 'Empty RFQ', description: 'Add line items from supplier listings first.' });
      return;
    }
    setSubmitting(true);
    const { data: rfq, error: rErr } = await supabase
      .from('b2b_rfq_requests')
      .insert({
        buyer_vendor_id: vendor.id,
        supplier_supply_account_id: supplierId,
        status: 'submitted',
        buyer_note: buyerNote.trim() || null,
      })
      .select('id')
      .single();
    if (rErr || !rfq) {
      toast({ variant: 'destructive', title: 'Could not create RFQ', description: rErr?.message ?? 'Unknown error' });
      setSubmitting(false);
      return;
    }
    const rfqId = (rfq as { id: string }).id;
    for (const line of lines) {
      const { error: lErr } = await supabase.from('b2b_rfq_line_items').insert({
        rfq_id: rfqId,
        listing_id: line.listingId,
        title_snapshot: line.titleSnapshot,
        qty: line.qty,
        unit: line.unit,
        target_price_cents: line.targetPriceCents,
      });
      if (lErr) {
        toast({ variant: 'destructive', title: 'RFQ partially saved', description: lErr.message });
        setSubmitting(false);
        return;
      }
    }
    clearDraft(supplierId);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      void fetch('/api/vendor/supply/rfq-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rfqId }),
      }).catch(() => {});
    }
    toast({ title: 'RFQ submitted', description: 'The supplier will be notified when email is configured.' });
    router.push(q('/vendor/supply/rfqs'));
    setSubmitting(false);
  };

  if (!supplierId) {
    return (
      <Card className="border-sky-900/30 bg-zinc-900/50 p-6 text-zinc-300">
        <p className="text-sm">Pick a supplier from the directory, then use &quot;Review RFQ&quot;.</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href={q('/vendor/supply/directory')}>Browse suppliers</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-400 hover:text-white">
        <Link
          href={q(supplierSlug ? `/vendor/supply/${encodeURIComponent(supplierSlug)}` : '/vendor/supply/directory')}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-white">Request for quote</h1>
        <p className="mt-1 text-sm text-zinc-400">{loadingMeta ? 'Loading…' : supplierName || 'Supplier'}</p>
      </div>
      {vLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      ) : (
        <Card className="space-y-4 border-sky-900/30 bg-zinc-900/50 p-4">
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-500">No items in this RFQ yet. Browse listings and add SKUs.</p>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.listingId} className="flex flex-wrap items-end gap-2 border-b border-zinc-800 pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{l.titleSnapshot}</p>
                    <p className="text-xs text-zinc-500">
                      {l.targetPriceCents != null ? `Target $${(l.targetPriceCents / 100).toFixed(2)} · ` : null}
                      {l.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      className="w-24 border-zinc-700 bg-zinc-900 text-white"
                      value={l.qty}
                      onChange={(e) => setQty(supplierId, l.listingId, parseFloat(e.target.value) || 1)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-zinc-500 hover:text-red-400"
                      onClick={() => removeLine(supplierId, l.listingId)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Label className="text-zinc-400">Note to supplier</Label>
            <Textarea
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
              className="mt-1 border-zinc-700 bg-zinc-900 text-white"
              rows={4}
              placeholder="Delivery window, licensed location, SKUs questions…"
            />
          </div>
          <Button
            type="button"
            disabled={submitting || !lines.length || !user}
            onClick={() => void submit()}
            className="w-full bg-sky-600 hover:bg-sky-500"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit RFQ'}
          </Button>
        </Card>
      )}
    </div>
  );
}
