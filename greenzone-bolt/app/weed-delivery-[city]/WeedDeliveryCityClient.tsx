'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, DollarSign, MapPin } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';

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

export function WeedDeliveryCityClient({ citySlug }: { citySlug: string }) {
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [loading, setLoading] = useState(true);

  const cityName = citySlug
    ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Your City';

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_services')
        .select('*')
        .eq('is_active', true)
        .not('approved_at', 'is', null)
        .order('rating', { ascending: false })
        .limit(12);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-green-500">
            <MapPin className="h-6 w-6" />
            <span className="text-lg">{cityName}</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl">Weed Delivery in {cityName}</h1>
          <p className="mb-8 text-xl text-gray-300">
            Browse the best cannabis delivery services in {cityName}. Fast, reliable, and licensed dispensaries
            delivering premium products to your door.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge className="border-green-600/30 bg-green-600/20 px-4 py-2 text-base text-green-500">
              Licensed Services
            </Badge>
            <Badge className="border-green-600/30 bg-green-600/20 px-4 py-2 text-base text-green-500">
              30-60 Min Delivery
            </Badge>
            <Badge className="border-green-600/30 bg-green-600/20 px-4 py-2 text-base text-green-500">
              Premium Products
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="mb-8 text-3xl font-bold text-white">Top Delivery Services in {cityName}</h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-80 animate-pulse border-green-900/20 bg-gray-900" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="border-green-900/20 bg-gray-900 p-12 text-center">
            <p className="text-lg text-gray-400">No delivery services found in {cityName}</p>
          </Card>
        ) : (
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.id} href={`/service/${service.slug}`}>
                <Card className="group h-full overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black transition-all duration-300 hover:border-green-600/50">
                  <div className="space-y-4 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-green-600/30 bg-green-900/30">
                          {service.logo_url ? (
                            <img
                              src={service.logo_url}
                              alt={service.name}
                              className="h-full w-full rounded-xl object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-green-500">{service.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white transition group-hover:text-green-500">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium text-white">{service.rating.toFixed(1)}</span>
                            <span className="text-sm text-gray-400">({service.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                      {service.is_featured && (
                        <Badge className="border-green-600/30 bg-green-600/20 text-green-500">Featured</Badge>
                      )}
                    </div>

                    <p className="line-clamp-2 text-sm text-gray-400">
                      {service.description || 'Premium cannabis delivery service'}
                    </p>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center">
                        <div className="mb-1 flex items-center justify-center text-green-500">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-medium text-white">{service.average_delivery_time} min</div>
                        <div className="text-xs text-gray-500">Delivery</div>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 flex items-center justify-center text-green-500">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-medium text-white">${service.min_order}</div>
                        <div className="text-xs text-gray-500">Minimum</div>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 flex items-center justify-center text-green-500">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-medium text-white">${service.delivery_fee}</div>
                        <div className="text-xs text-gray-500">Fee</div>
                      </div>
                    </div>

                    <Button className="w-full bg-green-600 text-white hover:bg-green-700">View Menu</Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Card className="mb-12 border-green-900/20 bg-gray-900 p-8">
          <h2 className="mb-4 text-2xl font-bold text-white">About Weed Delivery in {cityName}</h2>
          <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
            <p>
              Looking for cannabis delivery in {cityName}? {SITE_NAME} connects you with the best licensed dispensaries
              offering fast, reliable weed delivery to your door. Browse from a wide selection of products including
              flower, edibles, vapes, pre-rolls, concentrates, and CBD products.
            </p>
            <p>
              All delivery services on {SITE_NAME} are licensed and verified, ensuring you receive safe, high-quality
              cannabis products. Most services offer delivery within 30-60 minutes, making it easy and convenient to get
              what you need.
            </p>
            <h3 className="mb-3 mt-6 text-xl font-semibold text-white">Why Choose Cannabis Delivery in {cityName}?</h3>
            <ul className="list-inside list-disc space-y-2">
              <li>Fast delivery within 30-60 minutes</li>
              <li>Licensed and verified dispensaries</li>
              <li>Wide selection of premium products</li>
              <li>Competitive pricing and deals</li>
              <li>Discreet and professional service</li>
              <li>Safe and secure ordering</li>
            </ul>
          </div>
        </Card>

        <Card className="border-green-900/20 bg-gray-900 p-8">
          <h2 className="mb-6 text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">How long does delivery take in {cityName}?</h3>
              <p className="text-gray-300">
                Most delivery services in {cityName} offer delivery within 30-60 minutes. Delivery times may vary based
                on your location and order volume.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Do I need a medical card for weed delivery in {cityName}?
              </h3>
              <p className="text-gray-300">
                Requirements vary by location. In California, you need to be 21+ with a valid ID for recreational
                cannabis. Some services may also offer medical cannabis with a valid recommendation.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">Is weed delivery legal in {cityName}?</h3>
              <p className="text-gray-300">
                All delivery services listed on {SITE_NAME} are licensed and operate legally within {cityName}. Always
                verify the service is licensed before placing an order.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">What payment methods are accepted?</h3>
              <p className="text-gray-300">
                Payment methods vary by service but typically include cash, debit cards, and sometimes credit cards.
                Check with the specific delivery service for their accepted payment methods.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
