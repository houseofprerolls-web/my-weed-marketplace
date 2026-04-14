'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorMapMarkerEditor } from '@/components/vendor/VendorMapMarkerEditor';
import { VendorExtraMapLocations } from '@/components/vendor/VendorExtraMapLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';

export default function VendorMapLocationPage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell, refresh } = useVendorBusiness();

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
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
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
          <h1 className="text-3xl font-bold">Store map pin</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Your primary pin is saved on your vendor profile. Extra pins (delivery hubs, second storefronts) live in{' '}
            <span className="text-gray-200">vendor_locations</span> and are capped per state by your administrator.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>
          <div className="lg:col-span-3">
            <VendorMapMarkerEditor vendor={vendor} onSaved={() => refresh()} />
            <VendorExtraMapLocations vendor={vendor} onChanged={() => refresh()} />
          </div>
        </div>
      </div>
    </div>
  );
}
