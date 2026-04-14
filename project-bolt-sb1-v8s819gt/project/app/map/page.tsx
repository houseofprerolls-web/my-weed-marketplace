"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Map from '@/components/Map';
import { supabase } from '@/lib/supabase';
import { trackEvent, trackSearch } from '@/lib/analytics';
import {
  Search, MapPin, Star, Clock, Navigation, Heart,
  Filter, List, Map as MapIcon, Phone, Globe
} from 'lucide-react';
import Link from 'next/link';

type Business = {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  logo_url: string;
  is_verified: boolean;
  is_approved: boolean;
  plan_type: string;
  profile_views: number;
  coordinates?: { lat: number; lng: number };
};

export default function MapPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    openNow: false,
    hasDeals: false,
    hasDelivery: false,
    topRated: false,
    businessType: 'all' as 'all' | 'dispensary' | 'delivery' | 'brand'
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [businesses, searchQuery, filters]);

  async function loadBusinesses() {
    try {
      setLoading(true);

      let query = supabase
        .from('vendor_profiles')
        .select('*')
        .eq('is_approved', true)
        .eq('approval_status', 'approved')
        .order('plan_type', { ascending: false })
        .order('profile_views', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const businessesWithCoords = (data || []).map((business, index) => ({
        ...business,
        coordinates: {
          lat: 34.0522 + (Math.random() - 0.5) * 0.2,
          lng: -118.2437 + (Math.random() - 0.5) * 0.2
        }
      }));

      setBusinesses(businessesWithCoords);
      setFilteredBusinesses(businessesWithCoords);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...businesses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.business_name.toLowerCase().includes(query) ||
        b.city.toLowerCase().includes(query) ||
        b.zip_code.includes(query)
      );
    }

    if (filters.businessType !== 'all') {
      filtered = filtered.filter(b => b.business_type === filters.businessType);
    }

    if (filters.topRated) {
      filtered = filtered.filter(b => b.is_verified);
    }

    setFilteredBusinesses(filtered);

    if (searchQuery) {
      trackSearch(searchQuery, 'map_search', '', filters, filtered.length);
    }
  }

  async function handleBusinessClick(business: Business) {
    await trackEvent({
      eventType: 'map_pin_click',
      vendorId: business.id,
      metadata: { business_name: business.business_name }
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-4">Map Search</h1>
          <p className="text-gray-400">Discover cannabis businesses near you</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by business, city, or zip code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-green-900/20 text-white"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-green-900/20 text-white hover:bg-green-500/10"
            >
              <Navigation className="h-5 w-5 mr-2" />
              Use My Location
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('map')}
                className={viewMode === 'map' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
              >
                <MapIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-green-900/20">
            <div className="flex items-center gap-2">
              <Switch
                id="openNow"
                checked={filters.openNow}
                onCheckedChange={(checked) => setFilters({ ...filters, openNow: checked })}
              />
              <Label htmlFor="openNow" className="text-white cursor-pointer">
                Open Now
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasDeals"
                checked={filters.hasDeals}
                onCheckedChange={(checked) => setFilters({ ...filters, hasDeals: checked })}
              />
              <Label htmlFor="hasDeals" className="text-white cursor-pointer">
                Has Deals
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="hasDelivery"
                checked={filters.hasDelivery}
                onCheckedChange={(checked) => setFilters({ ...filters, hasDelivery: checked })}
              />
              <Label htmlFor="hasDelivery" className="text-white cursor-pointer">
                Delivery
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="topRated"
                checked={filters.topRated}
                onCheckedChange={(checked) => setFilters({ ...filters, topRated: checked })}
              />
              <Label htmlFor="topRated" className="text-white cursor-pointer">
                Verified Only
              </Label>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
            <p className="text-gray-400">Loading businesses...</p>
          </Card>
        ) : (
          <>
            {viewMode === 'map' ? (
              <Map
                businesses={filteredBusinesses.map(b => ({
                  id: b.id,
                  name: b.business_name,
                  address: b.address,
                  city: b.city,
                  rating: 4.5,
                  coordinates: b.coordinates
                }))}
                onBusinessClick={(business) => {
                  const fullBusiness = filteredBusinesses.find(b => b.id === business.id);
                  if (fullBusiness) {
                    handleBusinessClick(fullBusiness);
                    window.location.href = `/listing/${fullBusiness.id}`;
                  }
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredBusinesses.length === 0 ? (
                  <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-12 text-center">
                    <MapPin className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
                    <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setFilters({
                          openNow: false,
                          hasDeals: false,
                          hasDelivery: false,
                          topRated: false,
                          businessType: 'all'
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Clear Filters
                    </Button>
                  </Card>
                ) : (
                  filteredBusinesses.map((business) => (
                    <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-600/30 flex-shrink-0">
                            <span className="text-2xl font-bold text-green-500">
                              {business.business_name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <Link href={`/listing/${business.id}`}>
                                  <h3 className="text-lg font-bold text-white hover:text-green-500 transition">
                                    {business.business_name}
                                  </h3>
                                </Link>
                                {business.is_verified && (
                                  <Badge className="bg-green-600/20 text-green-500 border-green-600/30 mt-1">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              {business.plan_type !== 'basic' && (
                                <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                                  {business.plan_type}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-white font-semibold">4.5</span>
                                <span>(120)</span>
                              </div>
                              <span>•</span>
                              <span className="capitalize">{business.business_type}</span>
                            </div>

                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {business.description || 'Premium cannabis products and services'}
                            </p>

                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                              <MapPin className="h-4 w-4" />
                              <span>{business.address}, {business.city}, {business.state}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link href={`/listing/${business.id}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  View Details
                                </Button>
                              </Link>
                              {business.phone && (
                                <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </Button>
                              )}
                              {business.website && (
                                <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                  <Globe className="h-4 w-4 mr-1" />
                                  Website
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                <Navigation className="h-4 w-4 mr-1" />
                                Directions
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
