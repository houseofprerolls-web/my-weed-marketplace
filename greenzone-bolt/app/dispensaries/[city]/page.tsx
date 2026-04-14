"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { demoBusinesses, demoDeals, demoCities } from '@/lib/demo-data';
import Map from '@/components/Map';
import {
  Search, MapPin, Star, Clock, DollarSign, Phone, Navigation,
  Heart, Award, CircleCheck as CheckCircle, TrendingUp, Map as MapIcon, List
} from 'lucide-react';

export default function CityDispensariesPage() {
  const params = useParams();
  const citySlug = params.city as string;

  const cityData = demoCities.find(c => c.slug === citySlug) || demoCities[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const cityBusinesses = demoBusinesses.filter(b =>
    b.city.toLowerCase() === cityData.name.toLowerCase()
  );

  const cityDeals = demoDeals.filter(deal =>
    cityBusinesses.some(b => b.id === deal.businessId)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-green-950/30 to-black py-12 border-b border-green-900/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-green-500" />
              <span className="text-green-500 font-semibold">
                {cityData.name}, {cityData.state}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Cannabis Dispensaries in {cityData.name}
            </h1>
            <p className="text-xl text-gray-400 mb-6">
              Discover {cityData.businessCount} licensed dispensaries and delivery services near you
            </p>

            <div className="flex flex-wrap gap-4">
              <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                <CheckCircle className="h-4 w-4 mr-1" />
                All Licensed & Verified
              </Badge>
              <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                {cityDeals.length} Active Deals
              </Badge>
              <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                {cityBusinesses.filter(b => b.isOpen).length} Open Now
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search, Sort & View Toggle */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search dispensaries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-green-900/20 text-white"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-green-900/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-green-900/20">
                    <SelectItem value="distance">Nearest First</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="reviews">Most Reviewed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
                  >
                    <List className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('map')}
                    className={viewMode === 'map' ? 'bg-green-600 hover:bg-green-700' : 'border-green-900/20 text-white hover:bg-green-500/10'}
                  >
                    <MapIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Map View */}
            {viewMode === 'map' && (
              <Map
                businesses={cityBusinesses}
                center={cityBusinesses[0]?.coordinates}
                onBusinessClick={(business) => {
                  window.location.href = `/service/${business.id}`;
                }}
              />
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <>
            {/* Featured Dispensaries */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-yellow-500" />
                <h2 className="text-2xl font-bold text-white">Featured Dispensaries</h2>
              </div>

              <div className="space-y-4">
                {cityBusinesses
                  .filter(b => b.isFeatured)
                  .map((business) => (
                    <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-600/50 hover:border-green-600 transition-all">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-600/30 flex-shrink-0">
                            <span className="text-3xl font-bold text-green-500">
                              {business.name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <Link href={`/service/${business.slug}`}>
                                  <h3 className="text-xl font-bold text-white hover:text-green-500 transition">
                                    {business.name}
                                  </h3>
                                </Link>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                                    <Award className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                  {business.isVerified && (
                                    <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                  {business.isOpen ? (
                                    <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Open until {business.closingTime}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {business.closingTime}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-pink-500">
                                <Heart className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-white font-semibold">{business.rating}</span>
                                <span>({business.reviewCount} reviews)</span>
                              </div>
                              <span>•</span>
                              <span>{business.address}</span>
                            </div>

                            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                              {business.description}
                            </p>

                            {business.hasDeals && (
                              <div className="mb-3 p-3 bg-green-600/10 border border-green-600/20 rounded-lg">
                                <div className="flex items-center gap-2 text-green-400">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="font-semibold text-sm">Special Offers Available</span>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
                                <Link href={`/service/${business.slug}`}>View Menu</Link>
                              </Button>
                              <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </Button>
                              <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                                <Navigation className="h-4 w-4 mr-1" />
                                Directions
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>

            {/* All Dispensaries */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">All Dispensaries</h2>
              <div className="space-y-4">
                {cityBusinesses
                  .filter(b => !b.isFeatured)
                  .map((business) => (
                    <Card key={business.id} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-600/30 flex-shrink-0">
                            <span className="text-2xl font-bold text-green-500">
                              {business.name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <Link href={`/service/${business.slug}`}>
                              <h3 className="text-lg font-bold text-white hover:text-green-500 transition mb-1">
                                {business.name}
                              </h3>
                            </Link>

                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-white font-semibold">{business.rating}</span>
                                <span>({business.reviewCount})</span>
                              </div>
                              <span>•</span>
                              <span>{business.address}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
                                <Link href={`/service/${business.slug}`}>View Details</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Deals */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h3 className="text-xl font-bold text-white">Trending Deals</h3>
              </div>
              <div className="space-y-3">
                {cityDeals.slice(0, 3).map((deal) => (
                  <div key={deal.id} className="p-3 bg-gray-800/50 border border-green-900/20 rounded-lg">
                    <h4 className="text-white font-semibold text-sm mb-1">{deal.title}</h4>
                    <p className="text-gray-400 text-xs mb-2">{deal.businessName}</p>
                    <Badge className="bg-green-600/20 text-green-500 border-green-600/30 text-xs">
                      {deal.category}
                    </Badge>
                  </div>
                ))}
              </div>
              <Link href="/deals">
                <Button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white">
                  View All Deals
                </Button>
              </Link>
            </Card>

            {/* Quick Links */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Nearby Cities</h3>
              <div className="space-y-2">
                {demoCities
                  .filter(c => c.name !== cityData.name)
                  .slice(0, 5)
                  .map((city) => (
                    <Link key={city.slug} href={`/dispensaries/${city.slug}`}>
                      <div className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-lg transition cursor-pointer">
                        <span className="text-gray-300">{city.name}, {city.state}</span>
                        <span className="text-gray-500 text-sm">{city.businessCount}</span>
                      </div>
                    </Link>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
