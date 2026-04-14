'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import VendorNav from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react';

type BrandRow = { id: string; name: string; slug: string; count: number };

export default function VendorMenuCatalogBrandsPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  /** catalog_products reference brands that are not verified=true. */
  const [unverifiedBrandsOnly, setUnverifiedBrandsOnly] = useState(false);

  const load = useCallback(async () => {
    if (!vendorsMode) {
      setBrands([]);
      setCatalogError(null);
      setUnverifiedBrandsOnly(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setCatalogError(null);
    setUnverifiedBrandsOnly(false);

    const { data: rows, error } = await supabase.from('catalog_products').select('brand_id');
    if (error) {
      console.error(error);
      setCatalogError(error.message || 'Could not load catalog_products.');
      setBrands([]);
      setLoading(false);
      return;
    }
    const counts = new Map<string, number>();
    for (const r of rows || []) {
      const bid = (r as { brand_id: string }).brand_id;
      counts.set(bid, (counts.get(bid) || 0) + 1);
    }
    const ids = Array.from(counts.keys());
    if (!ids.length) {
      setBrands([]);
      setLoading(false);
      return;
    }
    const { data: bRows, error: bErr } = await supabase
      .from('brands')
      .select('id,name,slug')
      .in('id', ids)
      .eq('verified', true)
      .order('name');
    if (bErr) {
      console.error(bErr);
      setCatalogError(bErr.message || 'Could not load brands.');
      setBrands([]);
      setLoading(false);
      return;
    }
    if (!(bRows || []).length) {
      setUnverifiedBrandsOnly(true);
      setBrands([]);
      setLoading(false);
      return;
    }
    const list: BrandRow[] = (bRows || []).map((b) => ({
      id: (b as BrandRow).id,
      name: (b as BrandRow).name,
      slug: (b as BrandRow).slug,
      count: counts.get((b as BrandRow).id) || 0,
    }));
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    setBrands(list);
    setLoading(false);
  }, [vendorsMode]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Catalog requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
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
            <p className="text-gray-300">No dispensary linked to your login.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl p-6 md:p-8">
          <div className="mb-8">
            <Link
              href={`/vendor/menu${menuVendorQuery}`}
              className="mb-4 inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to menu
            </Link>
            <h1 className="text-3xl font-bold">Add from brand catalog</h1>
            <p className="mt-2 text-gray-400">
              Choose a brand, set your price on each product, then add it to {vendor.name}&apos;s menu.
            </p>
          </div>

          <div className="mb-6">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands…"
              className="border-green-900/25 bg-gray-950/60 text-white placeholder:text-gray-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
            </div>
          ) : brands.length === 0 ? (
            <Card className="space-y-4 border-green-900/25 bg-gray-900/60 p-8 text-left text-gray-400">
              {catalogError ? (
                <>
                  <p className="font-medium text-amber-200/95">Could not load the catalog</p>
                  <p className="text-sm">{catalogError}</p>
                </>
              ) : unverifiedBrandsOnly ? (
                <>
                  <p className="font-medium text-amber-200/95">Catalog products exist, but brands aren’t verified</p>
                  <p className="text-sm">
                    This screen only lists brands with <code className="text-green-400">brands.verified = true</code>.
                    In Supabase, open <code className="text-green-400">brands</code> and set verified for the rows tied
                    to your <code className="text-green-400">catalog_products</code>, or re-run the import script (it
                    marks brands verified when creating them).
                  </p>
                </>
              ) : (
                <>
                  <p className="text-center font-medium text-gray-300">No master catalog items yet</p>
                  <p className="text-center text-sm">
                    Load data with the repo script (from the <code className="text-green-400">greenzone-bolt</code>{' '}
                    folder):
                  </p>
                  <pre className="overflow-x-auto rounded-md border border-green-900/30 bg-black/50 p-3 text-xs text-green-300/90">
                    node scripts/import-catalog-csv.mjs &quot;C:/path/to/export.csv&quot;
                  </pre>
                  <p className="text-sm">
                    Or insert rows in Supabase table <code className="text-green-400">catalog_products</code> linked to
                    verified <code className="text-green-400">brands</code>. Requires{' '}
                    <code className="text-green-400">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
                    <code className="text-green-400">.env.local</code> for the script.
                  </p>
                  <p className="text-sm text-gray-500">
                    Already see rows in the Supabase table editor but still empty here? Run SQL migration{' '}
                    <code className="text-green-400">0100_catalog_products_reviews_and_rls.sql</code> so vendor owners /
                    team members can read <code className="text-green-400">catalog_products</code> (RLS).
                  </p>
                </>
              )}
            </Card>
          ) : (
            <ul className="space-y-2">
              {brands
                .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
                .map((b) => (
                <li key={b.id}>
                  <Link href={`/vendor/menu/catalog/${encodeURIComponent(b.slug)}${menuVendorQuery}`}>
                    <Card className="flex items-center justify-between border-green-900/25 bg-gray-900/50 p-4 transition hover:border-green-600/35 hover:bg-gray-900/80">
                      <div>
                        <p className="text-lg font-semibold text-white">{b.name}</p>
                        <p className="text-sm text-gray-500">
                          {b.count} catalog {b.count === 1 ? 'product' : 'products'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <Link href={`/vendor/menu/product/new${menuVendorQuery}`}>
              <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                Create custom product instead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
