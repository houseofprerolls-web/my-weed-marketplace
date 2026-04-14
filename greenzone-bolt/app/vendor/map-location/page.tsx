'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorUnifiedStoreMap } from '@/components/vendor/VendorUnifiedStoreMap';
import { VendorExtraMapLocations } from '@/components/vendor/VendorExtraMapLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';

export default function VendorMapLocationPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell, refresh } = useVendorBusiness({
    adminMenuVendorId,
  });
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const [mapStoresTick, setMapStoresTick] = useState(0);
  const bumpMapStores = useCallback(() => {
    void refresh();
    setMapStoresTick((t) => t + 1);
  }, [refresh]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href={vLink('/vendor/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Store map pins</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Your primary pin and any extra storefront pins all appear on one map. Drag a pin to move it — each drop saves
            immediately. Extra rows live in <span className="text-gray-200">vendor_locations</span>; an admin sets how many
            extras you may add. When you are at your limit, you can still move pins or delete one to free a slot.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>
          <div className="min-w-0 md:col-span-3">
            <VendorUnifiedStoreMap vendor={vendor} onSaved={bumpMapStores} extrasReloadKey={mapStoresTick} />
            <VendorExtraMapLocations vendor={vendor} formOnly reloadKey={mapStoresTick} onChanged={bumpMapStores} />
          </div>
        </div>
      </div>
    </div>
  );
}
