'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { cn } from '@/lib/utils';

type Props = {
  vendorId: string | undefined;
  unseenIds: string[];
  unseenCount: number;
  adminMenuVendorId: string | null;
};

function storageKey(vendorId: string) {
  return `gz_vendor_unseen_orders_dismissed:${vendorId}`;
}

export function VendorUnseenOrdersAlert({ vendorId, unseenIds, unseenCount, adminMenuVendorId }: Props) {
  const currentSig = useMemo(() => [...unseenIds].sort().join('\n'), [unseenIds]);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId || typeof window === 'undefined') return;
    setDismissedSig(sessionStorage.getItem(storageKey(vendorId)));
  }, [vendorId, currentSig]);

  const visible =
    Boolean(vendorId) &&
    unseenCount > 0 &&
    (dismissedSig == null || dismissedSig !== currentSig);

  if (!visible) return null;

  const ordersHref = withAdminVendorQuery('/vendor/orders', adminMenuVendorId);

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[45] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2',
        'pointer-events-none print:hidden'
      )}
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-green-600/35',
          'bg-gradient-to-r from-gray-950 via-black to-gray-950 px-4 py-3 shadow-2xl shadow-black/60',
          'md:max-w-2xl'
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-600/20 text-green-400">
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {unseenCount === 1 ? 'New order waiting' : `${unseenCount} new orders waiting`}
          </p>
          <p className="text-xs text-gray-400">Open each order once to clear this reminder.</p>
        </div>
        <Button asChild size="sm" className="flex-shrink-0 bg-green-600 hover:bg-green-500">
          <Link href={ordersHref}>View orders</Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 flex-shrink-0 text-gray-400 hover:bg-white/5 hover:text-white"
          aria-label="Dismiss"
          onClick={() => {
            if (!vendorId) return;
            sessionStorage.setItem(storageKey(vendorId), currentSig);
            setDismissedSig(currentSig);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
