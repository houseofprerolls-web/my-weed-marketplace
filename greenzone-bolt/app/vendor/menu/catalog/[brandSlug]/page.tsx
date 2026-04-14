'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import VendorNav from '@/components/vendor/VendorNav';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import {
  VendorMenuCatalogGrid,
  type CatalogProductRow,
} from '@/components/vendor/VendorMenuCatalogGrid';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function VendorMenuCatalogByBrandPage() {
  const params = useParams();
  const brandSlug = decodeURIComponent((params.brandSlug as string) || '');
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [items, setItems] = useState<CatalogProductRow[]>([]);
  const [query, setQuery] = useState('');
  const [onMenu, setOnMenu] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refreshOnMenu = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) return;
    const { data, error } = await supabase
      .from('products')
      .select('catalog_product_id')
      .eq('vendor_id', vendor.id)
      .not('catalog_product_id', 'is', null);
    if (error) {
      console.error(error);
      return;
    }
    const s = new Set<string>();
    for (const r of data || []) {
      const id = (r as { catalog_product_id: string | null }).catalog_product_id;
      if (id) s.add(id);
    }
    setOnMenu(s);
  }, [vendor?.id, vendorsMode]);

  const load = useCallback(async () => {
    if (!vendorsMode || !brandSlug || !vendor?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    const { data: brand, error: bErr } = await supabase
      .from('brands')
      .select('id,name')
      .eq('slug', brandSlug)
      .eq('verified', true)
      .maybeSingle();
    if (bErr || !brand) {
      setNotFound(true);
      setBrandId(null);
      setBrandName('');
      setItems([]);
      setLoading(false);
      return;
    }
    const bid = (brand as { id: string; name: string }).id;
    const bname = (brand as { id: string; name: string }).name;
    setBrandId(bid);
    setBrandName(bname);
    const { data: prows, error: pErr } = await supabase
      .from('catalog_products')
      .select(
        'id,brand_id,name,category,description,images,strain_id,potency_thc,potency_cbd,avg_rating,review_count'
      )
      .eq('brand_id', bid)
      .order('name');
    if (pErr) {
      console.error(pErr);
      setItems([]);
    } else {
      setItems((prows || []) as CatalogProductRow[]);
    }
    await refreshOnMenu();
    setLoading(false);
  }, [brandSlug, refreshOnMenu, vendor?.id, vendorsMode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdded = useCallback((catalogProductId: string) => {
    setOnMenu((prev) => {
      const next = new Set(prev);
      next.add(catalogProductId);
      return next;
    });
  }, []);

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
        <Card className="border-green-900/30 bg-gray-900 p-6">Sign in with a linked dispensary account.</Card>
      </div>
    );
  }

  if (!vendorsMode || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="border-green-900/30 bg-gray-900 p-6">Unable to load vendor.</Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <Link
            href={`/vendor/menu/catalog${menuVendorQuery}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300"
          >
            <ArrowLeft className="h-4 w-4" />
            All brands
          </Link>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
            </div>
          ) : notFound || !brandId ? (
            <Card className="border-green-900/25 bg-gray-900/60 p-8 text-center text-gray-400">
              Brand not found or not verified.
            </Card>
          ) : (
            <>
              <h1 className="mb-2 text-3xl font-bold">{brandName}</h1>
              <p className="mb-8 text-gray-400">
                Enter your menu price on each card, then tap <span className="text-white">Add to menu</span>.
              </p>
              <div className="mb-6">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search this brand’s products…"
                  className="border-green-900/25 bg-gray-950/60 text-white placeholder:text-gray-500"
                />
              </div>
              {items.length === 0 ? (
                <Card className="border-green-900/25 bg-gray-900/60 p-8 text-center text-gray-400">
                  No catalog products for this brand yet.
                </Card>
              ) : (
                <VendorMenuCatalogGrid
                  vendorId={vendor.id}
                  brandName={brandName}
                  items={items.filter((p) =>
                    p.name.toLowerCase().includes(query.trim().toLowerCase())
                  )}
                  onMenuCatalogIds={onMenu}
                  onAdded={handleAdded}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
