'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorProductForm } from '@/components/vendor/VendorProductForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function NewVendorProductPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({ adminMenuVendorId });
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Sign in with a vendor account to add products.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Product management requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <VendorNav />
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-8">
          <Card className="max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No dispensary is linked to your account yet.</p>
            <p className="mt-2 text-sm text-gray-500">Ask an admin to connect your store, or use the admin “link user” flow.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1 p-6 md:p-10">
        <Button asChild variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <Link href={`/vendor/menu${menuVendorQuery}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to menu
          </Link>
        </Button>
        <h1 className="mb-8 text-3xl font-bold">Add product</h1>
        <VendorProductForm userId={user.id} vendorId={vendor.id} storeName={vendor.name} mode="create" />
      </div>
    </div>
  );
}
