"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, MapPin, Star, Clock, DollarSign, Phone, Navigation, Heart, Award, CircleCheck as CheckCircle, Loader as Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VendorProfile } from '@/lib/types/database';

export default function DispensariesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [businesses, setBusinesses] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    openNow: false,
    hasDeals: false,
    delivery: false,
    minRating: 0,
    maxDistance: 25
  });

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('vendor_profiles')
          .select('*')
          .eq('is_approved', true)
          .order('average_rating', { ascending: false });

        if (fetchError) throw fetchError;

        setBusinesses(data || []);
      } catch (err) {
        console.error('Error loading businesses:', err);
        setError('Failed to load dispensaries. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, []);

  const filteredBusinesses = businesses
    .filter(b => {
      if (filters.hasDeals && (!b.active_deals_count || b.active_deals_count === 0)) return false;
      if (filters.minRating && b.average_rating && b.average_rating < filters.minRating) return false;
      if (filters.delivery && !b.offers_delivery) return false;
      if (searchTerm && !b.business_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a.average_rating || 0;
        const ratingB = b.average_rating || 0;
        return ratingB - ratingA;
      }
      if (sortBy === 'reviews') {
        const reviewsA = a.total_reviews || 0;
        const reviewsB = b.total_reviews || 0;
        return reviewsB - reviewsA;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-12 border-b border-green-900/20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Dispensaries & Delivery Services
          </h1>
          <p className="text-gray-400 text-lg">
            {loading ? 'Loading...' : `${filteredBusinesses.length} licensed ${filteredBusinesses.length === 1 ? 'business' : 'businesses'} available`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-green-500" />
                  Filters
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({
                    openNow: false,
                    hasDeals: false,
                    delivery: false,
                    minRating: 0,
                    maxDistance: 25
                  })}
                  className="text-green-500 hover:text-green-400"
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDeals"
                    checked={filters.hasDeals}
                    onCheckedChange={(checked) => setFilters({...filters, hasDeals: !!checked})}
                    className="border-green-900/20"
                  />
                  <label htmlFor="hasDeals" className="text-gray-300 text-sm cursor-pointer">
                    Has Deals
                  </label>
                  <Badge className="ml-auto bg-green-600/20 text-green-500 border-green-600/30">
                    {businesses.filter(b => b.active_deals_count && b.active_deals_count > 0).length}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delivery"
                    checked={filters.delivery}
                    onCheckedChange={(checked) => setFilters({...filters, delivery: !!checked})}
                    className="border-green-900/20"
                  />
                  <label htmlFor="delivery" className="text-gray-300 text-sm cursor-pointer">
                    Delivery Available
                  </label>
                  <Badge className="ml-auto bg-green-600/20 text-green-500 border-green-600/30">
                    {businesses.filter(b => b.offers_delivery).length}
                  </Badge>
                </div>

                <div className="pt-4 border-t border-green-900/20">
                  <label className="text-gray-300 text-sm mb-2 block">Minimum Rating</label>
                  <Select
                    value={filters.minRating.toString()}
                    onValueChange={(value) => setFilters({...filters, minRating: Number(value)})}
                  >
                    <SelectTrigger className="bg-gray-800 border-green-900/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-green-900/20">
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search dispensaries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 bg-gray-900 border-green-900/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-green-900/20">
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Loading dispensaries...</p>
              </Card>
            ) : error ? (
              <Card className="bg-gray-900 border-red-900/20 p-12 text-center">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Retry
                </Button>
              </Card>
            ) : filteredBusinesses.length === 0 ? (
              <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
                <p className="text-gray-400 text-lg mb-4">No dispensaries match your filters</p>
                <Button
                  onClick={() => setFilters({
                    openNow: false,
                    hasDeals: false,
                    delivery: false,
                    minRating: 0,
                    maxDistance: 25
                  })}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBusinesses.map((business) => (
                  <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all">
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-600/30 flex-shrink-0">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-3xl font-bold text-green-500">
                              {business.business_name.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <Link href={`/vendor/${business.id}`}>
                                <h3 className="text-xl font-bold text-white hover:text-green-500 transition">
                                  {business.business_name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {business.is_verified && (
                                  <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                                {business.featured_until && new Date(business.featured_until) > new Date() && (
                                  <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                                    <Award className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                                <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30 capitalize">
                                  {business.plan_type || 'Basic'}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-pink-500">
                              <Heart className="h-5 w-5" />
                            </Button>
                          </div>

                          {business.description && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{business.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 flex-wrap">
                            {business.average_rating && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-white font-semibold">{business.average_rating.toFixed(1)}</span>
                                  <span>({business.total_reviews || 0} reviews)</span>
                                </div>
                                <span>•</span>
                              </>
                            )}
                            {business.city && (
                              <>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{business.city}, {business.state}</span>
                                </div>
                              </>
                            )}
                            {business.average_delivery_time && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{business.average_delivery_time} min avg</span>
                                </div>
                              </>
                            )}
                          </div>

                          {business.active_deals_count && business.active_deals_count > 0 && (
                            <div className="mb-3 p-2 bg-green-600/10 border border-green-600/20 rounded-lg">
                              <div className="flex items-center gap-2 text-green-400 text-sm">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-semibold">{business.active_deals_count} Active Deals</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              asChild
                            >
                              <Link href={`/vendor/${business.id}`}>
                                View {business.business_type === 'delivery' ? 'Products' : 'Menu'}
                              </Link>
                            </Button>
                            {business.phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-900/20 text-white hover:bg-green-500/10"
                                asChild
                              >
                                <a href={`tel:${business.phone}`}>
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </a>
                              </Button>
                            )}
                            {business.address && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-900/20 text-white hover:bg-green-500/10"
                                asChild
                              >
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(`${business.address}, ${business.city}, ${business.state}`)}`} target="_blank" rel="noopener noreferrer">
                                  <Navigation className="h-4 w-4 mr-1" />
                                  Directions
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
