"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, Clock, TrendingUp, ShoppingCart, Star, MapPin, Percent } from 'lucide-react';

type ProductDeal = {
  id: string;
  deal_name: string;
  deal_type: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  deal_price: number | null;
  end_time: string | null;
  vendor_products: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    images: string[];
    thc_percentage: number | null;
    cbd_percentage: number | null;
  } | null;
  vendor_profiles: {
    id: string;
    business_name: string;
    city: string;
    logo_url: string | null;
  } | null;
};

type VendorDeal = {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  code: string | null;
  valid_until: string | null;
  delivery_services: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
};

export default function DealsPage() {
  const [productDeals, setProductDeals] = useState<ProductDeal[]>([]);
  const [vendorDeals, setVendorDeals] = useState<VendorDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'vendors'>('products');

  useEffect(() => {
    loadAllDeals();
  }, []);

  const loadAllDeals = async () => {
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('product_deals')
        .select(`
          id,
          deal_name,
          deal_type,
          discount_percentage,
          discount_amount,
          deal_price,
          end_time,
          vendor_products!inner (
            id,
            name,
            brand,
            price,
            images,
            thc_percentage,
            cbd_percentage
          ),
          vendor_profiles!inner (
            id,
            business_name,
            city,
            logo_url
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!prodError) {
        setProductDeals((prodData as any) || []);
      }

      const { data: vendData, error: vendError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          description,
          discount_type,
          discount_value,
          code,
          valid_until,
          delivery_services (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!vendError) {
        setVendorDeals((vendData as any) || []);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVendorDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}% OFF`;
    }
    return `$${value} OFF`;
  };

  const formatProductDiscount = (deal: ProductDeal) => {
    if (deal.discount_percentage) {
      return `${deal.discount_percentage}% OFF`;
    }
    if (deal.discount_amount) {
      return `$${deal.discount_amount} OFF`;
    }
    if (deal.deal_price && deal.vendor_products) {
      const savings = deal.vendor_products.price - deal.deal_price;
      return `Save $${savings.toFixed(2)}`;
    }
    return 'DEAL';
  };

  const getEffectivePrice = (deal: ProductDeal) => {
    if (!deal.vendor_products) return 0;
    if (deal.deal_price) return deal.deal_price;
    if (deal.discount_percentage) {
      return deal.vendor_products.price * (1 - deal.discount_percentage / 100);
    }
    if (deal.discount_amount) {
      return Math.max(0, deal.vendor_products.price - deal.discount_amount);
    }
    return deal.vendor_products.price;
  };

  const getProductImage = (images: string[]) => {
    if (images && images.length > 0) {
      return images[0];
    }
    return 'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=400';
  };

  const getDaysRemaining = (validUntil: string | null) => {
    if (!validUntil) return null;
    const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <Percent className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Today's Best Deals
          </h1>
          <p className="text-xl text-gray-400">
            Save big on premium cannabis products from top-rated vendors
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            onClick={() => setActiveTab('products')}
            variant={activeTab === 'products' ? 'default' : 'outline'}
            className={activeTab === 'products' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600/30 hover:bg-green-600/10'}
          >
            Product Deals ({productDeals.length})
          </Button>
          <Button
            onClick={() => setActiveTab('vendors')}
            variant={activeTab === 'vendors' ? 'default' : 'outline'}
            className={activeTab === 'vendors' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600/30 hover:bg-green-600/10'}
          >
            Vendor Promotions ({vendorDeals.length})
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="bg-gray-900/50 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              productDeals.length === 0 ? (
                <Card className="bg-gray-900/50 border-green-900/20 p-12 text-center">
                  <Tag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No product deals available</h2>
                  <p className="text-gray-400 mb-6">Check back soon for new promotions</p>
                  <Link href="/directory">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Browse Services
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {productDeals.map((deal) => {
                    if (!deal.vendor_products) return null;
                    const effectivePrice = getEffectivePrice(deal);

                    return (
                      <Card
                        key={deal.id}
                        className="group bg-gray-900/50 border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={getProductImage(deal.vendor_products.images)}
                            alt={deal.vendor_products.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />

                          <div className="absolute top-2 left-2 right-2">
                            <Badge className="bg-red-600 text-white">
                              {formatProductDiscount(deal)}
                            </Badge>
                          </div>

                          {(deal.vendor_products.thc_percentage !== null || deal.vendor_products.cbd_percentage !== null) && (
                            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                              {deal.vendor_products.thc_percentage !== null && (
                                <Badge className="bg-black/80 text-white text-xs">
                                  THC {deal.vendor_products.thc_percentage}%
                                </Badge>
                              )}
                              {deal.vendor_products.cbd_percentage !== null && (
                                <Badge className="bg-black/80 text-white text-xs">
                                  CBD {deal.vendor_products.cbd_percentage}%
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1 group-hover:text-green-400 transition">
                              {deal.vendor_products.name}
                            </h3>
                            {deal.vendor_products.brand && (
                              <p className="text-sm text-gray-400">{deal.vendor_products.brand}</p>
                            )}
                          </div>

                          {deal.vendor_profiles && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">{deal.vendor_profiles.business_name}</span>
                            </div>
                          )}

                          <div>
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs mb-2">
                              {deal.deal_name}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-400">
                                  ${effectivePrice.toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-500 line-through">
                                  ${deal.vendor_products.price.toFixed(2)}
                                </span>
                              </div>
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
              )
            )}

            {activeTab === 'vendors' && (
              vendorDeals.length === 0 ? (
                <Card className="bg-gray-900/50 border-green-900/20 p-12 text-center">
                  <Tag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No vendor promotions available</h2>
                  <p className="text-gray-400 mb-6">Check back soon for new promotions</p>
                  <Link href="/directory">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Browse Services
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendorDeals.map((deal) => {
                    const daysRemaining = getDaysRemaining(deal.valid_until);
                    return (
                      <Card
                        key={deal.id}
                        className="bg-gradient-to-br from-gray-900/50 to-black border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden"
                      >
                        <div className="relative">
                          <div className="absolute top-4 right-4 z-10">
                            <Badge className="bg-red-600 text-white text-lg px-4 py-2">
                              {formatVendorDiscount(deal.discount_type, deal.discount_value)}
                            </Badge>
                          </div>

                          <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 text-center">
                            <TrendingUp className="h-12 w-12 text-white mx-auto mb-2" />
                            <h3 className="text-2xl font-bold text-white">{deal.title}</h3>
                          </div>
                        </div>

                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-600/30 flex-shrink-0">
                              {deal.delivery_services.logo_url ? (
                                <img
                                  src={deal.delivery_services.logo_url}
                                  alt={deal.delivery_services.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-lg font-bold text-green-500">
                                  {deal.delivery_services.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{deal.delivery_services.name}</p>
                              {daysRemaining && (
                                <p className="text-gray-400 text-sm flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {daysRemaining} days left
                                </p>
                              )}
                            </div>
                          </div>

                          {deal.description && (
                            <p className="text-gray-300 text-sm">{deal.description}</p>
                          )}

                          {deal.code && (
                            <div className="bg-black/50 rounded-lg p-3 border border-green-600/30">
                              <p className="text-gray-400 text-xs mb-1">Use code:</p>
                              <p className="text-green-400 font-mono font-bold text-lg">{deal.code}</p>
                            </div>
                          )}

                          <Link href={`/service/${deal.delivery_services.slug}`}>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                              View Menu
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
