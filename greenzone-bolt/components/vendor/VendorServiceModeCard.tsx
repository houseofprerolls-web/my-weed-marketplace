'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import { resolvePublicVendorServiceModes } from '@/lib/vendorStorefrontDelivery';
import {
  fetchPendingVendorServiceModeRequest,
  submitVendorServiceModeRequest,
} from '@/lib/vendorServiceModeRequest';

type Props = {
  vendor: VendorBusinessRow;
  /** Refresh parent vendor row after a successful request. */
  onChanged?: () => void;
};

export function VendorServiceModeCard({ vendor, onChanged }: Props) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<Awaited<ReturnType<typeof fetchPendingVendorServiceModeRequest>>>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  const effective = resolvePublicVendorServiceModes({
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    zip: vendor.zip,
    offers_delivery: vendor.offers_delivery,
    offers_storefront: vendor.offers_storefront,
    allow_both_storefront_and_delivery: vendor.allow_both_storefront_and_delivery,
    admin_service_mode: vendor.admin_service_mode,
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const row = await fetchPendingVendorServiceModeRequest(vendor.id);
      setPending(row);
    } finally {
      setRefreshing(false);
    }
  }, [vendor.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(mode: 'delivery' | 'storefront') {
    setLoading(true);
    try {
      const res = await submitVendorServiceModeRequest(vendor.id, mode, note || null);
      if (!res.ok) {
        toast({ title: 'Could not submit', description: res.message, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Request sent',
        description:
          'An administrator will review it. You will keep your current public mode until they approve the change.',
      });
      setNote('');
      await refresh();
      onChanged?.();
    } finally {
      setLoading(false);
    }
  }

  const adminLabel =
    vendor.admin_service_mode === 'force_delivery'
      ? 'Admin has set your shop to delivery-only for public listings.'
      : vendor.admin_service_mode === 'force_storefront'
        ? 'Admin has set your shop to storefront / pickup for public listings.'
        : null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 to-black p-5">
      <h3 className="font-semibold text-white">Public service mode</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Shoppers see you as either <span className="text-zinc-200">delivery</span> or{' '}
        <span className="text-zinc-200">storefront / pickup</span> — not both. Normally this follows your business
        address on file; an admin can override it when needed.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {effective.offers_delivery && !effective.offers_storefront ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-lime/25 bg-brand-lime/10 px-3 py-1 text-xs font-medium text-brand-lime-soft">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            Delivery (public)
          </span>
        ) : null}
        {effective.offers_storefront && !effective.offers_delivery ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-100/90">
            <Store className="h-3.5 w-3.5" aria-hidden />
            Storefront / pickup (public)
          </span>
        ) : null}
      </div>

      {adminLabel ? <p className="mt-3 text-xs text-amber-200/85">{adminLabel}</p> : null}

      {refreshing ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Checking for open requests…
        </p>
      ) : pending ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-300">
          You have a pending request for{' '}
          <strong>{pending.requested_mode === 'delivery' ? 'delivery' : 'storefront / pickup'}</strong>. Our team
          will review it soon.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor="svc-mode-note">
              Optional note to admins
            </label>
            <Textarea
              id="svc-mode-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. We just got our storefront license…"
              className="min-h-[72px] border-zinc-800 bg-black/50 text-sm text-white"
              maxLength={500}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {!effective.offers_delivery ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-brand-lime/30 text-brand-lime-soft hover:bg-brand-lime/10"
                disabled={loading}
                onClick={() => void submit('delivery')}
              >
                Request delivery for listings
              </Button>
            ) : null}
            {!effective.offers_storefront ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-500/35 text-amber-100/90 hover:bg-amber-950/40"
                disabled={loading}
                onClick={() => void submit('storefront')}
              >
                Request storefront / pickup
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
