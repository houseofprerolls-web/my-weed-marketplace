"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, DollarSign, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    loadFeaturedServices();
  }, []);

  const loadFeaturedServices = async () => {
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
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-green-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Featured Delivery Services
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

  if (services.length === 0) {
    return null;
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
          <Link href="/directory">
            <Button size="lg" variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
              Browse All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
