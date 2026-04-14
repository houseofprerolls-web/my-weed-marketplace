'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorReviewsManager } from '@/components/vendor/VendorReviewsManager';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { Loader2 } from 'lucide-react';

export default function VendorReviewsPage() {
  const { loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();

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
        <p className="text-gray-400">Reviews manager requires a linked store and vendors mode.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black text-white">
        <VendorNav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-gray-400">Link a dispensary to your account first.</p>
        </div>
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
          <h1 className="text-3xl font-bold">Reviews — {vendor.name}</h1>
          <p className="mt-2 text-gray-400">Reply publicly or report reviews to admins.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>
          <div className="lg:col-span-3">
            <VendorReviewsManager vendorId={vendor.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
