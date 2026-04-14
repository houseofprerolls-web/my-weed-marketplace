'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, ShoppingCart, Percent, Store } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { Product } from '@/lib/types/database';
import { marketplaceCopy } from '@/lib/marketplaceCopy';

type ProductWithService = Product & {
  delivery_services?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
};

type TrendingCard = {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryLabel: string | null;
  vendorLabel: string | null;
  vendorId: string | null;
  priceCents: number;
  price: number;
  compareAtPrice: number | null;
  thc: number | null;
  cbd: number | null;
  showFeaturedBadge: boolean;
  href: string | null;
  inStock: boolean;
};

const PLACEHOLDER_IMG =
  'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=400';

function vendorNameFromJoin(r: Record<string, unknown>): string | null {
  const v = r.vendors;
  if (v && typeof v === 'object' && !Array.isArray(v) && 'name' in v) {
    const n = (v as { name: unknown }).name;
    return n != null ? String(n) : null;
  }
  if (Array.isArray(v) && v[0] && typeof v[0] === 'object' && 'name' in v[0]) {
    const n = (v[0] as { name: unknown }).name;
    return n != null ? String(n) : null;
  }
  return null;
}

function mapVendorProductRow(r: Record<string, unknown>): TrendingCard {
  const images = r.images as string[] | undefined;
  const firstImg = Array.isArray(images) && images.length > 0 ? images[0] : null;
  const cents = Number(r.price_cents) || 0;
  const cat = r.category != null ? String(r.category).replace(/_/g, ' ') : null;
  const vid = r.vendor_id as string | undefined;
  const vname = vendorNameFromJoin(r);
  return {
    id: String(r.id),
    name: String(r.name ?? 'Product'),
    imageUrl: firstImg,
    categoryLabel: cat,
    vendorLabel: vname,
    vendorId: vid ?? null,
    priceCents: cents,
    price: cents / 100,
    compareAtPrice: null,
    thc: r.potency_thc != null ? Number(r.potency_thc) : null,
    cbd: r.potency_cbd != null ? Number(r.potency_cbd) : null,
    showFeaturedBadge: false,
    href: vid ? `/listing/${vid}` : '/discover',
    inStock: r.in_stock !== false,
  };
}

function mapLegacyProduct(p: ProductWithService): TrendingCard {
  const price = p.sale_price ?? p.price;
  const compare = p.sale_price != null && p.sale_price < p.price ? p.price : null;
  const slug = p.delivery_services?.slug;
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.image_url,
    categoryLabel: p.strain_type,
    vendorLabel: p.delivery_services?.name ?? null,
    vendorId: null,
    priceCents: Math.round(price * 100),
    price,
    compareAtPrice: compare,
    thc: p.thc_percentage,
    cbd: p.cbd_percentage,
    showFeaturedBadge: Boolean(p.is_featured),
    href: slug ? `/service/${slug}` : '/deals',
    inStock: p.in_stock !== false,
  };
}

export function TrendingProducts() {
  const [items, setItems] = useState<TrendingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, replaceCartWith } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    loadTrendingProducts();
  }, []);

  const loadTrendingProducts = async () => {
    if (!isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (isVendorsSchema()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, category, price_cents, images, in_stock, vendor_id, potency_thc, potency_cbd, created_at, vendors ( name )'
          )
          .eq('in_stock', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        const rows = (data || []) as Record<string, unknown>[];
        setItems(rows.map(mapVendorProductRow));
      } catch (e) {
        console.error('Error loading products (vendors schema):', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          *,
          delivery_services (
            id,
            name,
            slug
          )
        `
        )
        .eq('in_stock', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!error && data && data.length > 0) {
        setItems((data as ProductWithService[]).map(mapLegacyProduct));
        return;
      }

      const fallback = await supabase
        .from('products')
        .select(
          `
          *,
          delivery_services (
            id,
            name,
            slug
          )
        `
        )
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (fallback.error) throw fallback.error;
      setItems(((fallback.data || []) as ProductWithService[]).map(mapLegacyProduct));
    } catch (e) {
      console.error('Error loading products:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const displayImage = (url: string | null) => url || PLACEHOLDER_IMG;

  const addVendorProduct = (product: TrendingCard) => {
    if (!product.vendorId || !isVendorsSchema()) return;
    if (!product.inStock) {
      toast({
        title: 'Out of stock',
        description: 'This item is not available right now.',
        variant: 'destructive',
      });
      return;
    }

    const vendorName = product.vendorLabel?.trim() || 'Shop';
    const line = {
      vendorId: product.vendorId,
      vendorName,
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      image: product.imageUrl,
      thc: product.thc,
      cbd: product.cbd,
      quantity: 1,
    };

    const r = addItem(line);
    if (r.ok) {
      toast({ title: 'Added to cart', description: product.name });
      return;
    }
    if (r.reason === 'DIFFERENT_VENDOR') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(
          `Your cart has items from ${r.currentVendorName}. Replace the cart with ${vendorName}?`
        );
      if (ok) {
        replaceCartWith({ kind: 'vendors', ...line, quantity: 1 });
        toast({ title: 'Cart updated', description: product.name });
      }
      return;
    }
    if (r.reason === 'SCHEMA_MIX') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Your cart uses a different checkout. Replace it with this shop?');
      if (ok) {
        replaceCartWith({ kind: 'vendors', vendorId: line.vendorId, vendorName, productId: product.id, name: product.name, priceCents: product.priceCents, image: line.image, thc: product.thc, cbd: product.cbd, quantity: 1 });
        toast({ title: 'Cart updated', description: product.name });
      }
    }
  };

  if (loading) {
    return (
      <section className="bg-black py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Trending products</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-80 animate-pulse border-green-900/20 bg-gray-900/50" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-green-400">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Trending products</h2>
          <p className="text-lg text-gray-400">{marketplaceCopy.trendingProductsSubline}</p>
        </div>

        {items.length === 0 ? (
          <Card className="mx-auto max-w-xl border-green-900/30 bg-gray-900/40 p-10 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <p className="text-gray-300">{marketplaceCopy.trendingProductsEmpty}</p>
            {!isSupabaseConfigured && (
              <p className="mt-4 text-sm text-amber-400/90">
                Add Supabase environment variables so live menus can load.
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/discover">
                <Button className="bg-green-600 text-white hover:bg-green-700">Browse directory</Button>
              </Link>
              <Link href="/deals">
                <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white">
                  View deals
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => {
                const discount =
                  product.compareAtPrice != null &&
                  product.compareAtPrice > 0 &&
                  product.price < product.compareAtPrice;
                const pctOff =
                  discount && product.compareAtPrice
                    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                    : 0;

                const showVendorAdd = isVendorsSchema() && product.vendorId;

                return (
                  <Card
                    key={product.id}
                    className="group flex h-full flex-col overflow-hidden border-green-900/20 bg-gray-900/50 transition-all hover:border-green-600/50"
                  >
                    {product.href ? (
                      <Link href={product.href} className="block">
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={displayImage(product.imageUrl)}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute left-2 right-2 top-2 flex items-start justify-between gap-2">
                            {discount && (
                              <Badge className="bg-red-600 text-white">{pctOff}% OFF</Badge>
                            )}
                            {product.showFeaturedBadge && (
                              <Badge className="ml-auto border-green-600/30 bg-green-600/20 text-green-400">
                                <Star className="h-3 w-3 fill-current" />
                              </Badge>
                            )}
                          </div>
                          {(product.thc != null || product.cbd != null) && (
                            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                              {product.thc != null && (
                                <Badge className="bg-black/80 text-xs text-white">THC {product.thc}%</Badge>
                              )}
                              {product.cbd != null && (
                                <Badge className="bg-black/80 text-xs text-white">CBD {product.cbd}%</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={displayImage(product.imageUrl)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col space-y-3 p-4">
                      {product.href ? (
                        <Link href={product.href} className="block">
                          <h3 className="line-clamp-1 font-semibold text-white transition group-hover:text-green-400">
                            {product.name}
                          </h3>
                        </Link>
                      ) : (
                        <h3 className="line-clamp-1 font-semibold text-white">{product.name}</h3>
                      )}
                      {product.categoryLabel && (
                        <p className="text-sm capitalize text-gray-400">{product.categoryLabel}</p>
                      )}
                      {product.vendorLabel && (
                        <div className="text-xs text-gray-500">
                          <p className="line-clamp-1">{product.vendorLabel}</p>
                        </div>
                      )}

                      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          {discount && product.compareAtPrice != null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-400">
                                ${product.price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                ${product.compareAtPrice.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-white">${product.price.toFixed(2)}</span>
                          )}
                        </div>
                        {showVendorAdd ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!product.inStock}
                            className="shrink-0 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
                            onClick={() => addVendorProduct(product)}
                          >
                            <ShoppingCart className="mr-1.5 h-4 w-4" />
                            Add
                          </Button>
                        ) : product.href ? (
                          <Link
                            href={product.href}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-600 text-white"
                            aria-label={`View ${product.name}`}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Link href="/deals">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                >
                  <Percent className="mr-2 h-5 w-5" />
                  View all deals
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
