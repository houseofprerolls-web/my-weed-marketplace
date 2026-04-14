"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchDiscoveryVendorsPayload } from '@/lib/publicVendors';
import { OptimizedImg } from '@/components/media/OptimizedImg';

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
  const [loading, setLoading] = useState(true);
  /** From `/api/discovery/vendors` — not `NEXT_PUBLIC_USE_VENDORS_TABLE` (often missing on deploy). */
  const [vendorsSchemaActive, setVendorsSchemaActive] = useState<boolean | null>(null);

  const loadFeaturedServices = useCallback(async () => {
    setLoading(true);
    try {
      const { vendors_schema } = await fetchDiscoveryVendorsPayload();
      setVendorsSchemaActive(vendors_schema);

      if (vendors_schema) {
        setServices([]);
      } else {
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
      }
    } catch (error) {
      console.error('Error loading featured section:', error);
      setServices([]);
      setVendorsSchemaActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeaturedServices();
  }, [loadFeaturedServices]);

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-md flex-col items-center gap-6">
            {vendorsSchemaActive === false ? (
              <>
                <h2 className="text-center text-3xl font-bold text-white md:text-4xl">Featured Delivery Services</h2>
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-80 animate-pulse border-green-900/20 bg-gray-900" />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-12 w-48 animate-pulse rounded-lg bg-zinc-800/80" aria-hidden />
            )}
          </div>
        </div>
      </section>
    );
  }

  if (vendorsSchemaActive) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
        <div className="container mx-auto px-4 text-center">
          <Link href="/discover">
            <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
              Browse full directory
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="bg-gradient-to-b from-black to-green-950/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Featured delivery services</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/discover">
              <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
                Browse directory
              </Button>
            </Link>
            <Link href="/vendor/onboarding">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link key={service.id} href={`/service/${service.slug}`}>
              <Card className="group bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all duration-300 overflow-hidden h-full">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-950/35">
                        {service.logo_url ? (
                          <OptimizedImg
                            src={service.logo_url}
                            alt={service.name}
                            className="h-full w-full object-contain object-center"
                            preset="logo"
                          />
                        ) : (
                          <span className="text-sm font-bold text-green-500">
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
                          <span className="text-sm text-zinc-300">({service.total_reviews})</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                      Featured
                    </Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-zinc-300">
                    {service.description || 'Premium cannabis delivery service'}
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">{service.average_delivery_time} min</div>
                      <div className="text-xs text-zinc-400">Delivery</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">${service.min_order}</div>
                      <div className="text-xs text-zinc-400">Minimum</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="text-white text-sm font-medium">${service.delivery_fee}</div>
                      <div className="text-xs text-zinc-400">Fee</div>
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
