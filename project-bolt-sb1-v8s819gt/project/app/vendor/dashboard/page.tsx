"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Phone, MapPin, Globe, Heart, TrendingUp, DollarSign, Users, Clock, Star, Plus, CreditCard as Edit, ChartBar as BarChart3, Megaphone } from 'lucide-react';
import Link from 'next/link';
import VendorNav from '@/components/vendor/VendorNav';
import { AssistantPanel } from '@/components/ai/AssistantPanel';
import { DemoBanner } from '@/components/demo/DemoBanner';

export default function VendorDashboardPage() {
  const businessInfo = {
    name: 'GreenLeaf Dispensary',
    logo: null,
    plan: 'Premium',
    city: 'Los Angeles',
    verified: true
  };

  const businessMetrics = {
    profileViews: 12847,
    profileViewsChange: 23,
    listingViews: 8653,
    listingViewsChange: 15,
    websiteClicks: 1247,
    websiteClicksChange: 18,
    phoneClicks: 892,
    phoneClicksChange: 12,
    directionsClicks: 2341,
    directionsClicksChange: 28,
    favorites: 437,
    favoritesChange: 34,
    dealClicks: 3456,
    dealClicksChange: 45,
    averageRating: 4.7,
    totalReviews: 234,
    newReviews: 12
  };

  const activePlacementCampaigns = [
    {
      id: '1',
      type: 'Homepage Featured',
      status: 'Active',
      impressions: 45678,
      clicks: 3421,
      ctr: 7.5,
      budget: 500,
      spent: 342,
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    },
    {
      id: '2',
      type: 'City Featured - Los Angeles',
      status: 'Active',
      impressions: 23456,
      clicks: 1876,
      ctr: 8.0,
      budget: 300,
      spent: 198,
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    }
  ];

  const recentDeals = [
    {
      id: '1',
      title: '20% Off All Edibles',
      status: 'Active',
      views: 2341,
      clicks: 456,
      ctr: 19.5,
      expiresAt: '2026-03-15'
    },
    {
      id: '2',
      title: 'BOGO on House Flower',
      status: 'Active',
      views: 1876,
      clicks: 387,
      ctr: 20.6,
      expiresAt: '2026-03-20'
    },
    {
      id: '3',
      title: 'Happy Hour 4-6pm',
      status: 'Active',
      views: 1523,
      clicks: 298,
      ctr: 19.6,
      expiresAt: '2026-03-31'
    }
  ];

  const recentReviews = [
    {
      id: '1',
      author: 'Michael R.',
      rating: 5,
      comment: 'Best dispensary in LA! Great selection and knowledgeable staff.',
      date: '2026-03-06',
      needsReply: false
    },
    {
      id: '2',
      author: 'Sarah K.',
      rating: 4,
      comment: 'Good quality products but can get busy on weekends.',
      date: '2026-03-05',
      needsReply: true
    },
    {
      id: '3',
      author: 'James T.',
      rating: 5,
      comment: 'Amazing deals and friendly service. Highly recommend!',
      date: '2026-03-04',
      needsReply: false
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <DemoBanner />
          <div className="flex items-center gap-4 mb-4">
            {/* Business Logo */}
            <div className="w-16 h-16 bg-green-900/30 rounded-lg flex items-center justify-center border-2 border-green-600/30 flex-shrink-0">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} alt={businessInfo.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-2xl font-bold text-green-500">
                  {businessInfo.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">{businessInfo.name}</h1>
                {businessInfo.verified && (
                  <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                    Verified
                  </Badge>
                )}
                <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                  {businessInfo.plan}
                </Badge>
              </div>
              <p className="text-gray-400">{businessInfo.city} • Dashboard Overview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-3">
              <Link href="/vendor/profile">
                <Button className="bg-gray-800 hover:bg-gray-700 text-white border border-green-900/20">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Link href="/vendor/deals">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              </Link>
            </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900 border border-green-900/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals Manager</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="placements">Placements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Profile Views</p>
                    <p className="text-3xl font-bold text-white">{businessMetrics.profileViews.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 text-sm">+{businessMetrics.profileViewsChange}% this week</span>
                    </div>
                  </div>
                  <div className="bg-blue-600/20 p-3 rounded-lg">
                    <Eye className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Website Clicks</p>
                    <p className="text-3xl font-bold text-white">{businessMetrics.websiteClicks.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 text-sm">+{businessMetrics.websiteClicksChange}% this week</span>
                    </div>
                  </div>
                  <div className="bg-green-600/20 p-3 rounded-lg">
                    <Globe className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Direction Clicks</p>
                    <p className="text-3xl font-bold text-white">{businessMetrics.directionsClicks.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 text-sm">+{businessMetrics.directionsClicksChange}% this week</span>
                    </div>
                  </div>
                  <div className="bg-purple-600/20 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Favorites</p>
                    <p className="text-3xl font-bold text-white">{businessMetrics.favorites.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 text-sm">+{businessMetrics.favoritesChange}% this week</span>
                    </div>
                  </div>
                  <div className="bg-pink-600/20 p-3 rounded-lg">
                    <Heart className="h-6 w-6 text-pink-500" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Performance Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-green-900/20">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">Phone Clicks</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{businessMetrics.phoneClicks}</p>
                      <p className="text-green-500 text-sm">+{businessMetrics.phoneClicksChange}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-green-900/20">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">Deal Clicks</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{businessMetrics.dealClicks}</p>
                      <p className="text-green-500 text-sm">+{businessMetrics.dealClicksChange}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">Average Rating</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{businessMetrics.averageRating}/5.0</p>
                      <p className="text-gray-400 text-sm">{businessMetrics.totalReviews} reviews</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-green-500" />
                  Active Placements
                </h3>
                <div className="space-y-4">
                  {activePlacementCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 bg-gray-800/50 border border-green-900/20 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-semibold">{campaign.type}</p>
                          <Badge className="bg-green-600/20 text-green-500 border-green-600/30 mt-1">
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">${campaign.spent} / ${campaign.budget}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-400">Impressions</p>
                          <p className="text-white font-semibold">{campaign.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Clicks</p>
                          <p className="text-white font-semibold">{campaign.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">CTR</p>
                          <p className="text-green-500 font-semibold">{campaign.ctr}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Active Deals</h3>
                  <Link href="/vendor/deals/new">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Deal
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentDeals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-800/50 border border-green-900/20 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-white font-semibold">{deal.title}</h4>
                          <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                            {deal.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-gray-400">Views: </span>
                            <span className="text-white font-medium">{deal.views.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Clicks: </span>
                            <span className="text-white font-medium">{deal.clicks}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">CTR: </span>
                            <span className="text-green-500 font-medium">{deal.ctr}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Expires: </span>
                            <span className="text-white font-medium">{deal.expiresAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-green-900/20 text-white hover:bg-green-500/10">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="border-green-900/20 text-gray-400">
                          End
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Recent Reviews</h3>
                    <p className="text-gray-400 mt-1">{businessMetrics.newReviews} new reviews this week</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold text-white">{businessMetrics.averageRating}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{businessMetrics.totalReviews} total reviews</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-gray-800/50 border border-green-900/20 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-semibold">{review.author}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">{review.date}</span>
                      </div>
                      <p className="text-gray-300 mb-3">{review.comment}</p>
                      {review.needsReply ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                          Reply
                        </Button>
                      ) : (
                        <Badge className="bg-gray-800 text-gray-400 border-gray-700">
                          Replied
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="placements" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <h3 className="text-xl font-bold text-white">Placement Options</h3>
                <p className="text-gray-400 mt-1">Boost your visibility with featured placements</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-gray-800/50 border-2 border-green-600/30 rounded-lg">
                    <h4 className="text-white font-bold text-lg mb-2">Homepage Featured</h4>
                    <p className="text-4xl font-bold text-green-500 mb-2">$500</p>
                    <p className="text-gray-400 text-sm mb-4">per month</p>
                    <ul className="space-y-2 mb-6">
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Featured on homepage</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>50k+ monthly views</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Priority listing</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Get Started
                    </Button>
                  </div>

                  <div className="p-6 bg-gray-800/50 border border-green-900/20 rounded-lg">
                    <h4 className="text-white font-bold text-lg mb-2">City Featured</h4>
                    <p className="text-4xl font-bold text-green-500 mb-2">$300</p>
                    <p className="text-gray-400 text-sm mb-4">per month</p>
                    <ul className="space-y-2 mb-6">
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Featured in city search</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>20k+ monthly views</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Local targeting</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                      Get Started
                    </Button>
                  </div>

                  <div className="p-6 bg-gray-800/50 border border-green-900/20 rounded-lg">
                    <h4 className="text-white font-bold text-lg mb-2">Category Featured</h4>
                    <p className="text-4xl font-bold text-green-500 mb-2">$200</p>
                    <p className="text-gray-400 text-sm mb-4">per month</p>
                    <ul className="space-y-2 mb-6">
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Featured in category</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>10k+ monthly views</span>
                      </li>
                      <li className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Niche targeting</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>

      <AssistantPanel assistantType="vendor" triggerVariant="fab" />
    </div>
  );
}
