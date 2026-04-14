"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Clock, DollarSign, Search, SlidersHorizontal } from 'lucide-react';
import { DemoBanner } from '@/components/demo/DemoBanner';

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

export default function DirectoryPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('location') || '');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    loadServices();
  }, [sortBy]);

  const loadServices = async () => {
    try {
      let query = supabase
        .from('delivery_services')
        .select('*')
        .eq('is_active', true)
        .not('approved_at', 'is', null);

      if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else if (sortBy === 'delivery_time') {
        query = query.order('average_delivery_time', { ascending: true });
      } else if (sortBy === 'min_order') {
        query = query.order('min_order', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Delivery Services Directory
          </h1>
          <p className="text-gray-400 text-lg">
            Browse {services.length} licensed cannabis delivery services
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <DemoBanner />

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-green-900/20 text-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-gray-900 border-green-900/20 text-white">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-green-900/20">
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="delivery_time">Fastest Delivery</SelectItem>
                <SelectItem value="min_order">Lowest Minimum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg">No delivery services found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
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
      </div>
    </div>
  );
}
