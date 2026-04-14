"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, ShoppingCart, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/database';

type ProductWithService = Product & {
  delivery_services?: {
    id: string;
    name: string;
  } | null;
};

export function TrendingProducts() {
  const [products, setProducts] = useState<ProductWithService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingProducts();
  }, []);

  const loadTrendingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          delivery_services (
            id,
            name
          )
        `)
        .eq('in_stock', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setProducts((data as ProductWithService[]) || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductImage = (imageUrl: string | null) => {
    if (imageUrl) {
      return imageUrl;
    }
    return 'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=400';
  };

  const getEffectivePrice = (product: Product) => {
    return product.sale_price || product.price;
  };

  const hasDiscount = (product: Product) => {
    return product.sale_price !== null && product.sale_price < product.price;
  };

  if (loading) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trending Products
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-900/50 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Trending Products
          </h2>
          <p className="text-gray-400 text-lg">
            Popular items from top-rated vendors near you
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const effectivePrice = getEffectivePrice(product);
            const discount = hasDiscount(product);

            return (
              <Card
                key={product.id}
                className="group bg-gray-900/50 border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={getProductImage(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                    {discount && (
                      <Badge className="bg-red-600 text-white">
                        {Math.round(((product.price - effectivePrice) / product.price) * 100)}% OFF
                      </Badge>
                    )}
                    {product.is_featured && (
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30 ml-auto">
                        <Star className="h-3 w-3 fill-current" />
                      </Badge>
                    )}
                  </div>

                  {(product.thc_percentage !== null || product.cbd_percentage !== null) && (
                    <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                      {product.thc_percentage !== null && (
                        <Badge className="bg-black/80 text-white text-xs">
                          THC {product.thc_percentage}%
                        </Badge>
                      )}
                      {product.cbd_percentage !== null && (
                        <Badge className="bg-black/80 text-white text-xs">
                          CBD {product.cbd_percentage}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white line-clamp-1 group-hover:text-green-400 transition">
                      {product.name}
                    </h3>
                    {product.strain_type && (
                      <p className="text-sm text-gray-400 capitalize">{product.strain_type}</p>
                    )}
                  </div>

                  {product.delivery_services && (
                    <div className="text-xs text-gray-500">
                      <p className="line-clamp-1">{product.delivery_services.name}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      {discount ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-green-400">
                            ${effectivePrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-white">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/deals">
            <Button size="lg" variant="outline" className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white">
              <Percent className="h-5 w-5 mr-2" />
              View All Deals
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
