'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import VendorNav from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { Plus, Search, Grid2x2 as Grid, List, Package, Loader2, Link2 } from 'lucide-react';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  inventory_count: number;
  in_stock: boolean;
  images: string[];
};

export default function MenuManagerPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, isAdminManagingOtherVendor, mayEnterVendorShell } =
    useVendorBusiness({
      adminMenuVendorId,
    });
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [costMap, setCostMap] = useState<Record<string, number>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  const loadProducts = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) {
      setProducts([]);
      setCostMap({});
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);

    const skuCap = 1600;
    const skuPageSize = 1000; // PostgREST default-ish max per request

    const fetchRange = (from: number, to: number) =>
      supabase
        .from('products')
        .select('id,name,category,price_cents,inventory_count,in_stock,images')
        .eq('vendor_id', vendor.id)
        .order('name')
        .range(from, to);

    const firstRes = await fetchRange(0, skuPageSize - 1);

    if (firstRes.error) {
      console.error(firstRes.error);
      setProducts([]);
      setCostMap({});
      setLoadingProducts(false);
      return;
    }

    let rows = (firstRes.data || []) as ProductRow[];
    if (rows.length >= skuPageSize && skuCap > skuPageSize) {
      const secondRes = await fetchRange(skuPageSize, skuCap - 1);
      if (secondRes.error) {
        console.error(secondRes.error);
      } else {
        rows = [...rows, ...((secondRes.data || []) as ProductRow[])].slice(0, skuCap);
      }
    }

    setProducts(rows);
    const ids = rows.map((p) => p.id);
    if (ids.length) {
      const { data: costs, error: cErr } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', ids);
      if (!cErr && costs) {
        const m: Record<string, number> = {};
        for (const r of costs as { product_id: string; unit_cost_cents: number }[]) {
          m[r.product_id] = r.unit_cost_cents;
        }
        setCostMap(m);
      } else {
        setCostMap({});
      }
    } else {
      setCostMap({});
    }
    setLoadingProducts(false);
  }, [vendor?.id, vendorsMode]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

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
        <Card className="border-green-900/30 bg-gray-900 p-6">Sign in with a linked dispensary account to manage your menu.</Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Menu tools require <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <VendorNav />
        <div className="flex flex-1 flex-col items-center justify-center p-8 md:ml-64">
          <Card className="max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No dispensary linked to your login.</p>
          </Card>
        </div>
      </div>
    );
  }

  const withMargin = (p: ProductRow) => {
    const cost = costMap[p.id] ?? 0;
    const margin = p.price_cents - cost;
    return { cost, margin };
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <VendorNav />

      <div className="ml-0 flex-1 md:ml-64">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8">
            {isAdminManagingOtherVendor && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95">
                <span className="font-semibold text-amber-200">Admin mode:</span> you are editing{' '}
                <span className="font-medium text-white">{vendor.name}</span>’s menu (not your own store). Changes save
                to this vendor’s catalog.
              </div>
            )}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold">Menu — {vendor.name}</h1>
                <p className="text-gray-400">Products, photos, and unit cost for margins</p>
              </div>
              <div className="flex gap-3">
                <Link href={`/vendor/menu/categories${menuVendorQuery}`}>
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    Categories (legacy UI)
                  </Button>
                </Link>
                <Link href={`/vendor/menu/sources${menuVendorQuery}`}>
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect POS
                  </Button>
                </Link>
                <Link href={`/vendor/menu/product/new${menuVendorQuery}`}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add product
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">In stock</p>
                <p className="text-2xl font-bold">{products.filter((p) => p.in_stock).length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Tracked COGS</p>
                <p className="text-2xl font-bold">{Object.keys(costMap).length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Store</p>
                <p className="truncate text-lg font-semibold text-green-400">{vendor.slug}</p>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="border border-green-900/20 bg-gray-900/50">
              <TabsTrigger value="products">All products</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-green-900/20 bg-gray-800/50 pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {loadingProducts ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                </div>
              ) : filtered.length === 0 ? (
                <Card className="border-green-900/20 bg-gray-900/50 p-12 text-center text-gray-400">
                  No products yet. Add one with photos and your cost per unit.
                </Card>
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-3'
                  }
                >
                  {filtered.map((product) => {
                    const img = product.images?.[0] || 'https://images.pexels.com/photos/7262757/pexels-photo-7262757.jpeg?w=400';
                    const { cost, margin } = withMargin(product);
                    return (
                      <Link key={product.id} href={`/vendor/menu/product/${product.id}${menuVendorQuery}`}>
                        <Card className="group h-full cursor-pointer overflow-hidden border-green-900/20 bg-gray-900/50 transition hover:border-green-600/30">
                          {viewMode === 'grid' ? (
                            <>
                              <div className="relative aspect-square overflow-hidden">
                                <img
                                  src={img}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                                <div
                                  className={`absolute right-2 top-2 rounded px-2 py-1 text-xs font-medium ${
                                    product.in_stock ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
                                  }`}
                                >
                                  {product.in_stock ? 'In stock' : 'Out of stock'}
                                </div>
                              </div>
                              <div className="p-4">
                                <Badge variant="outline" className="mb-2 border-green-600/30 text-green-400">
                                  {product.category}
                                </Badge>
                                <h3 className="mb-1 text-lg font-semibold">{product.name}</h3>
                                <p className="mb-2 text-xl font-bold text-green-400">
                                  ${(product.price_cents / 100).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Cost ${(cost / 100).toFixed(2)} · Margin ${(margin / 100).toFixed(2)}/unit
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-4 p-4">
                              <img src={img} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold">{product.name}</h3>
                                <p className="text-sm text-gray-400">{product.category}</p>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                  <span>${(product.price_cents / 100).toFixed(2)}</span>
                                  <span className="text-gray-500">
                                    COGS ${(cost / 100).toFixed(2)} · Margin ${(margin / 100).toFixed(2)}
                                  </span>
                                  <span className="text-gray-500">Qty {product.inventory_count}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inventory">
              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <Package className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <h3 className="mb-4 text-center text-lg font-semibold">Stock levels</h3>
                <div className="space-y-2">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded border border-green-900/20 px-3 py-2"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-gray-400">{p.inventory_count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
