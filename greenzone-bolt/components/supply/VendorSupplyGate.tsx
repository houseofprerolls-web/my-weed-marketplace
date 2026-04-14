'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { isSupplyExchangeEnabled } from '@/lib/supplyExchange';

/** Auth + feature-flag gate only (no chrome). Wrap supply routes in layout. */
export function VendorSupplyGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({ adminMenuVendorId });
  const enabled = isSupplyExchangeEnabled();

  useEffect(() => {
    if (authLoading || vLoading) return;
    if (!enabled) router.replace('/vendor/dashboard');
    else if (!vendorsMode || !mayEnterVendorShell) {
      router.replace(`/?login=true&redirect=${encodeURIComponent('/vendor/supply')}`);
    }
  }, [authLoading, vLoading, enabled, vendorsMode, mayEnterVendorShell, router]);

  if (!enabled || authLoading || vLoading || !vendorsMode || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
