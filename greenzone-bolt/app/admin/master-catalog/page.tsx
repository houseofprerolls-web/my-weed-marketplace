'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { AdminMasterCatalogManager } from '@/components/admin/AdminMasterCatalogManager';
import { Loader2, ArrowLeft, CircleAlert as AlertCircle, Library } from 'lucide-react';

export default function AdminMasterCatalogPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const vendorsSchema = useVendorsSchema();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-red-900/30 bg-gray-950 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-white">Admins only</h1>
          <p className="text-gray-400">You need an admin account to edit the master brand catalog.</p>
        </Card>
      </div>
    );
  }

  if (!vendorsSchema) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-amber-900/30 bg-gray-950 p-8 text-center text-gray-300">
          Master catalog uses the vendors schema. Enable{' '}
          <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/30 bg-gradient-to-b from-green-950/40 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <Library className="h-10 w-10 text-green-400" />
            <div>
              <h1 className="text-3xl font-bold">Master brand catalog</h1>
              <p className="text-gray-400">
                Pick a brand and add SKUs to <code className="text-green-400/90">catalog_products</code>. Verified brands
                show under Vendor → Brand catalog.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <AdminMasterCatalogManager />
      </div>
    </div>
  );
}
