"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, DollarSign, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { fetchLiveVendorsForDirectory, type PublicVendorCard } from '@/lib/vendorDeliveryList';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { SHOPPER_ZIP_STORAGE_KEY } from '@/lib/shopperLocation';

type DeliveryService = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  rating: number;
  total_reviews: number;
  average_delivery_time: number;
  min_order: number;
  delivery_fee: number;
  is_featured: boolean;
};

export function FeaturedServices() {
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [vendors, setVendors] = useState<PublicVendorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const vendorsMode = isVendorsSchema();

  const readZip = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
    return raw && raw.length === 5 ? raw : null;
  }, []);

  const loadFeaturedServices = useCallback(async () => {
    if (vendorsMode) {
      try {
        const zip5 = readZip();
        const list = await fetchLiveVendorsForDirectory(zip5);
        setVendors(list.slice(0, 6));
      } catch (error) {
        console.error('Error loading live vendors:', error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('delivery_services')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .not('approved_at', 'is', null)
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorsMode, readZip]);

  useEffect(() => {
    setLoading(true);
    loadFeaturedServices();
  }, [loadFeaturedServices]);

  useEffect(() => {
    if (!vendorsMode || typeof window === 'undefined') return;
    const onZip = () => loadFeaturedServices();
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('storage', onZip);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('storage', onZip);
    };
  }, [vendorsMode, loadFeaturedServices]);

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {vendorsMode ? marketplaceCopy.featuredVendorsTitle : 'Featured Delivery Services'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (vendorsMode) {
    if (vendors.length === 0) {
      return (
        <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{marketplaceCopy.featuredVendorsTitle}</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">{marketplaceCopy.featuredEmptyBody}</p>
            <div className="mt-8">
              <Link href="/discover">
                <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
                  Browse directory
                </Button>
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{marketplaceCopy.featuredVendorsTitle}</h2>
            <p className="text-gray-400 text-lg">{marketplaceCopy.featuredVendorsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((v) => (
              <Link key={v.id} href={`/listing/${v.id}`}>
                <Card className="group bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all duration-300 overflow-hidden h-full">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-600/30">
                          {v.logo_url ? (
                            <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-2xl font-bold text-green-500">{v.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg group-hover:text-green-500 transition">{v.name}</h3>
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <MapPin className="h-4 w-4 text-green-500" />
                            <span>
                              {[v.city, v.state].filter(Boolean).join(', ') || 'California'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-green-600/20 text-green-500 border-green-600/30">Live</Badge>
                        {v.offers_delivery && (
                          <Badge
                            variant="outline"
                            className="border-emerald-600/40 text-emerald-300"
                          >
                            {marketplaceCopy.deliveryService}
                          </Badge>
                        )}
                        {v.offers_storefront && (
                          <Badge
                            variant="outline"
                            className="border-amber-600/40 text-amber-200"
                          >
                            {marketplaceCopy.storefront}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm line-clamp-2">
                      {v.description ||
                        (v.offers_delivery && v.offers_storefront
                          ? 'Browse menu and order for delivery or pickup.'
                          : v.offers_delivery
                            ? 'Browse menu and order for delivery.'
                            : 'Pickup at this storefront.')}
                    </p>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-green-500 mb-1">
                          <Star className="h-4 w-4" />
                        </div>
                        <div className="text-white text-sm font-medium">{v.order_count}</div>
                        <div className="text-gray-500 text-xs">Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-green-500 mb-1">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="text-white text-sm font-medium">—</div>
                        <div className="text-gray-500 text-xs">ETA</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-green-500 mb-1">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="text-white text-sm font-medium">—</div>
                        <div className="text-gray-500 text-xs">Min</div>
                      </div>
                    </div>

                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">View listing</Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/discover">
              <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
                Browse directory
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="bg-gradient-to-b from-black to-green-950/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Featured delivery services</h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-400">
            {marketplaceCopy.featuredEmptyBody}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/discover">
              <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
                Browse directory
              </Button>
            </Link>
            <Link href="/list-your-business">
              <Button size="lg" className="bg-brand-lime text-black hover:bg-brand-lime-soft">
                List your business
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Delivery Services
          </h2>
          <p className="text-gray-400 text-lg">
            Top-rated dispensaries delivering near you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link key={service.id} href={`/service/${service.slug}`}>
              <Card className="group bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all duration-300 overflow-hidden h-full">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-600/30">
                        {service.logo_url ? (
                          <img
                            src={service.logo_url}
                            alt={service.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-green-500">
                            {service.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg group-hover:text-green-500 transition">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-white font-medium">{service.rating.toFixed(1)}</span>
                          <span className="text-gray-400 text-sm">({service.total_reviews})</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                      Featured
                    </Badge>
                  </div>

                  <p className="text-gray-400 text-sm line-clamp-2">
                    {service.description || 'Premium cannabis delivery service'}
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">{service.average_delivery_time} min</div>
                      <div className="text-gray-500 text-xs">Delivery</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">${service.min_order}</div>
                      <div className="text-gray-500 text-xs">Minimum</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">${service.delivery_fee}</div>
                      <div className="text-gray-500 text-xs">Fee</div>
                    </div>
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    View Menu
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/discover">
            <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
              Browse All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
