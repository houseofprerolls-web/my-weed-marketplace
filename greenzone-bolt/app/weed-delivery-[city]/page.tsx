"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

export default function CityPage() {
  const params = useParams();
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [loading, setLoading] = useState(true);

  const citySlug = (params?.city as string) || '';
  const cityName = citySlug ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Your City';

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
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 text-green-500 mb-4">
            <MapPin className="h-6 w-6" />
            <span className="text-lg">{cityName}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Weed Delivery in {cityName}
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Browse the best cannabis delivery services in {cityName}. Fast, reliable, and licensed dispensaries delivering premium products to your door.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge className="bg-green-600/20 text-green-500 border-green-600/30 px-4 py-2 text-base">
              Licensed Services
            </Badge>
            <Badge className="bg-green-600/20 text-green-500 border-green-600/30 px-4 py-2 text-base">
              30-60 Min Delivery
            </Badge>
            <Badge className="bg-green-600/20 text-green-500 border-green-600/30 px-4 py-2 text-base">
              Premium Products
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">
          Top Delivery Services in {cityName}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg">No delivery services found in {cityName}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                      {service.is_featured && (
                        <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                          Featured
                        </Badge>
                      )}
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
        )}

        <Card className="bg-gray-900 border-green-900/20 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">
            About Weed Delivery in {cityName}
          </h2>
          <div className="prose prose-invert max-w-none text-gray-300 space-y-4">
            <p>
              Looking for cannabis delivery in {cityName}? {SITE_NAME} connects you with the best licensed dispensaries offering fast, reliable weed delivery to your door. Browse from a wide selection of products including flower, edibles, vapes, pre-rolls, concentrates, and CBD products.
            </p>
            <p>
              All delivery services on {SITE_NAME} are licensed and verified, ensuring you receive safe, high-quality cannabis products. Most services offer delivery within 30-60 minutes, making it easy and convenient to get what you need.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Why Choose Cannabis Delivery in {cityName}?
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Fast delivery within 30-60 minutes</li>
              <li>Licensed and verified dispensaries</li>
              <li>Wide selection of premium products</li>
              <li>Competitive pricing and deals</li>
              <li>Discreet and professional service</li>
              <li>Safe and secure ordering</li>
            </ul>
          </div>
        </Card>

        <Card className="bg-gray-900 border-green-900/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                How long does delivery take in {cityName}?
              </h3>
              <p className="text-gray-300">
                Most delivery services in {cityName} offer delivery within 30-60 minutes. Delivery times may vary based on your location and order volume.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Do I need a medical card for weed delivery in {cityName}?
              </h3>
              <p className="text-gray-300">
                Requirements vary by location. In California, you need to be 21+ with a valid ID for recreational cannabis. Some services may also offer medical cannabis with a valid recommendation.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Is weed delivery legal in {cityName}?
              </h3>
              <p className="text-gray-300">
                All delivery services listed on {SITE_NAME} are licensed and operate legally within {cityName}. Always verify the service is licensed before placing an order.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods are accepted?
              </h3>
              <p className="text-gray-300">
                Payment methods vary by service but typically include cash, debit cards, and sometimes credit cards. Check with the specific delivery service for their accepted payment methods.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
