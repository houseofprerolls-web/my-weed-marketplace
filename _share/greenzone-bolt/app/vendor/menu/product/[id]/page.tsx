'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import VendorNav from '@/components/vendor/VendorNav';
import { VendorProductForm } from '@/components/vendor/VendorProductForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EditVendorProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [initial, setInitial] = useState<{
    name: string;
    category: string;
    priceCents: number;
    description: string;
    inventory_count: number;
    in_stock: boolean;
    images: string[];
    unit_cost_cents: number;
    strain_id?: string | null;
    strain_name?: string | null;
    strain_slug?: string | null;
    potency_thc?: number | null;
    potency_cbd?: number | null;
  }>();

  useEffect(() => {
    if (!vendorsMode || !vendor?.id || !id) return;
    let cancelled = false;
    (async () => {
      const { data: p, error } = await supabase
        .from('products')
        .select(
          'id,vendor_id,name,category,price_cents,description,inventory_count,in_stock,images,strain_id,potency_thc,potency_cbd'
        )
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !p || (p as { vendor_id: string }).vendor_id !== vendor.id) {
        setNotFound(true);
        setReady(true);
        return;
      }
      const row = p as Record<string, unknown>;
      const { data: costRow } = await supabase
        .from('product_unit_costs')
        .select('unit_cost_cents')
        .eq('product_id', id)
        .maybeSingle();
      const uc = (costRow as { unit_cost_cents?: number } | null)?.unit_cost_cents ?? 0;
      const sid = (row.strain_id as string | null | undefined) ?? null;
      let strain_name: string | null = null;
      let strain_slug: string | null = null;
      if (sid) {
        const { data: st } = await supabase
          .from('strains')
          .select('name,slug')
          .eq('id', sid)
          .maybeSingle();
        if (st) {
          strain_name = String((st as { name?: string }).name ?? '');
          strain_slug = String((st as { slug?: string }).slug ?? '');
        }
      }
      setInitial({
        name: String(row.name ?? ''),
        category: String(row.category ?? 'flower'),
        priceCents: Number(row.price_cents ?? 0),
        description: String(row.description ?? ''),
        inventory_count: Number(row.inventory_count ?? 0),
        in_stock: row.in_stock !== false,
        images: Array.isArray(row.images) ? (row.images as string[]) : [],
        unit_cost_cents: uc,
        strain_id: sid,
        strain_name,
        strain_slug,
        potency_thc:
          row.potency_thc != null && row.potency_thc !== ''
            ? Number(row.potency_thc)
            : null,
        potency_cbd:
          row.potency_cbd != null && row.potency_cbd !== ''
            ? Number(row.potency_cbd)
            : null,
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, vendor?.id, id]);

  if (authLoading || vLoading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Sign in to edit products.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Requires vendors schema.
        </Card>
      </div>
    );
  }

  if (!vendor || notFound || !initial) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <VendorNav />
        <div className="flex flex-1 flex-col items-center justify-center p-8 md:ml-64">
          <Card className="max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">Product not found or not part of your store.</p>
            <Button asChild className="mt-4 bg-green-600">
              <Link href="/vendor/menu">Back to menu</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <VendorNav />
      <div className="flex-1 p-6 md:ml-64 md:p-10">
        <Button asChild variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <Link href={`/vendor/menu${menuVendorQuery}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to menu
          </Link>
        </Button>
        <h1 className="mb-8 text-3xl font-bold">Edit product</h1>
        <VendorProductForm userId={user.id} vendorId={vendor.id} mode="edit" productId={id} initial={initial} />
      </div>
    </div>
  );
}
