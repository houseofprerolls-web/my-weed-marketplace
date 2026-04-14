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
    brand_id?: string | null;
    brand_display_name?: string | null;
    catalog_product_id?: string | null;
    is_featured?: boolean;
    sale_discount_percent?: number | null;
    sale_discount_cents?: number | null;
    menu_text_color?: string | null;
    quantity_tiers?: Array<{
      id: string;
      preset: string;
      label: string;
      price_cents: number;
      sort_order: number;
    }>;
  }>();

  useEffect(() => {
    if (!vendorsMode || !vendor?.id || !id) return;
    let cancelled = false;
    (async () => {
      const selectFull =
        'id,vendor_id,name,category,price_cents,description,inventory_count,in_stock,images,strain_id,brand_id,potency_thc,potency_cbd,brand_display_name,catalog_product_id,is_featured,sale_discount_percent,sale_discount_cents,menu_text_color';
      const selectBase =
        'id,vendor_id,name,category,price_cents,description,inventory_count,in_stock,images,strain_id,brand_id,potency_thc,potency_cbd';

      let row: Record<string, unknown> | null = null;
      let fetchError: { message?: string } | null = null;
      for (const sel of [selectFull, selectBase]) {
        const { data: p, error } = await supabase.from('products').select(sel).eq('id', id).maybeSingle();
        if (!error && p) {
          row = p as unknown as Record<string, unknown>;
          fetchError = null;
          break;
        }
        fetchError = error;
        const msg = String(error?.message || '');
        if (!/brand_display_name|catalog_product_id|is_featured|sale_discount_percent|sale_discount_cents|column|does not exist/i.test(msg)) {
          break;
        }
      }

      if (cancelled) return;
      if (fetchError || !row || (row.vendor_id as string) !== vendor.id) {
        setNotFound(true);
        setReady(true);
        return;
      }
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
      let quantity_tiers: {
        id: string;
        preset: string;
        label: string;
        price_cents: number;
        sort_order: number;
      }[] = [];
      const { data: tierRowsFetch, error: tierErr } = await supabase
        .from('product_quantity_tiers')
        .select('id,preset,label,price_cents,sort_order')
        .eq('product_id', id)
        .order('sort_order', { ascending: true });
      if (!tierErr && tierRowsFetch?.length) {
        quantity_tiers = tierRowsFetch.map((t) => ({
          id: String((t as { id?: string }).id ?? ''),
          preset: String((t as { preset?: string }).preset ?? 'custom'),
          label: String((t as { label?: string }).label ?? ''),
          price_cents: Math.round(Number((t as { price_cents?: number }).price_cents) || 0),
          sort_order: Number((t as { sort_order?: number }).sort_order) || 0,
        }));
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
        brand_id: (row.brand_id as string | null | undefined) ?? null,
        brand_display_name: (row.brand_display_name as string | null | undefined) ?? null,
        catalog_product_id: (row.catalog_product_id as string | null | undefined) ?? null,
        is_featured: row.is_featured === true,
        sale_discount_percent:
          row.sale_discount_percent != null && row.sale_discount_percent !== ''
            ? Number(row.sale_discount_percent)
            : null,
        sale_discount_cents:
          row.sale_discount_cents != null && row.sale_discount_cents !== ''
            ? Number(row.sale_discount_cents)
            : null,
        menu_text_color: (row.menu_text_color as string | null | undefined) ?? null,
        quantity_tiers,
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, vendor?.id, id]);

  if (authLoading || vLoading || !ready) {
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
          Sign in to edit products.
        </Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center text-white">
          Requires vendors schema.
        </Card>
      </div>
    );
  }

  if (!vendor || notFound || !initial) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <VendorNav />
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-8">
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
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1 p-6 md:p-10">
        <Button asChild variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <Link href={`/vendor/menu${menuVendorQuery}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to menu
          </Link>
        </Button>
        <h1 className="mb-8 text-3xl font-bold">Edit product</h1>
        <VendorProductForm
          userId={user.id}
          vendorId={vendor.id}
          storeName={vendor.name}
          mode="edit"
          productId={id}
          initial={initial}
        />
      </div>
    </div>
  );
}
