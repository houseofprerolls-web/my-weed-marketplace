"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, TrendingUp, Target, Zap, Award,
  Eye, MousePointerClick, Tag, Package, Star
} from 'lucide-react';

export default function AdminSalesDashboardPage() {
  // Mock data - high-potential vendors for campaign sales
  const highTrafficVendors = [
    {
      id: '1',
      businessName: 'Premium Cannabis Co.',
      city: 'Los Angeles',
      listingViews: 8240,
      weeklyGrowth: 28,
      engagementScore: 87,
      hasActiveCampaign: false,
      productCount: 45,
      dealCount: 8,
      rating: 4.8,
    },
    {
      id: '2',
      businessName: 'Urban Green Collective',
      city: 'San Diego',
      listingViews: 6120,
      weeklyGrowth: 22,
      engagementScore: 82,
      hasActiveCampaign: false,
      productCount: 38,
      dealCount: 6,
      rating: 4.7,
    },
    {
      id: '3',
      businessName: 'Coastal Cannabis Delivery',
      city: 'San Francisco',
      listingViews: 5890,
      weeklyGrowth: 19,
      engagementScore: 79,
      hasActiveCampaign: false,
      productCount: 52,
      dealCount: 10,
      rating: 4.9,
    },
  ];

  const growingVendors = [
    {
      id: '4',
      businessName: 'Valley Wellness Center',
      city: 'Sacramento',
      listingViews: 3200,
      weeklyGrowth: 45,
      engagementScore: 75,
      hasActiveCampaign: false,
      productCount: 28,
      dealCount: 5,
      rating: 4.6,
    },
    {
      id: '5',
      businessName: 'Emerald Triangle Farms',
      city: 'Oakland',
      listingViews: 2840,
      weeklyGrowth: 38,
      engagementScore: 71,
      hasActiveCampaign: false,
      productCount: 32,
      dealCount: 4,
      rating: 4.5,
    },
  ];

  const dealPerformers = [
    {
      id: '6',
      businessName: 'Happy Hour Dispensary',
      city: 'Long Beach',
      listingViews: 4560,
      dealClicks: 820,
      dealConversionRate: 18.0,
      engagementScore: 84,
      hasActiveCampaign: false,
      productCount: 41,
      dealCount: 12,
      rating: 4.7,
    },
    {
      id: '7',
      businessName: 'Deal Masters Cannabis',
      city: 'San Jose',
      listingViews: 3890,
      dealClicks: 680,
      dealConversionRate: 17.5,
      engagementScore: 80,
      hasActiveCampaign: false,
      productCount: 35,
      dealCount: 9,
      rating: 4.6,
    },
  ];

  const noCampaignVendors = [
    {
      id: '8',
      businessName: 'Sunset Beach Wellness',
      city: 'Venice',
      listingViews: 5120,
      weeklyGrowth: 15,
      engagementScore: 73,
      hasActiveCampaign: false,
      productCount: 44,
      dealCount: 7,
      rating: 4.8,
      monthsSinceJoined: 8,
    },
    {
      id: '9',
      businessName: 'Golden State Cannabis',
      city: 'Berkeley',
      listingViews: 4780,
      weeklyGrowth: 12,
      engagementScore: 70,
      hasActiveCampaign: false,
      productCount: 39,
      dealCount: 6,
      rating: 4.7,
      monthsSinceJoined: 12,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/placements">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Placements
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sales Dashboard</h1>
              <p className="text-gray-400">High-potential vendors for advertising campaigns</p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200 mb-1">High Traffic</p>
                <p className="text-2xl font-bold">{highTrafficVendors.length}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200 mb-1">Fast Growing</p>
                <p className="text-2xl font-bold">{growingVendors.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-200 mb-1">Deal Stars</p>
                <p className="text-2xl font-bold">{dealPerformers.length}</p>
              </div>
              <Tag className="h-8 w-8 text-orange-400" />
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200 mb-1">No Campaign</p>
                <p className="text-2xl font-bold">{noCampaignVendors.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="traffic" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-green-900/20">
            <TabsTrigger value="traffic">High Traffic</TabsTrigger>
            <TabsTrigger value="growing">Fast Growing</TabsTrigger>
            <TabsTrigger value="deals">Deal Performers</TabsTrigger>
            <TabsTrigger value="nocampaign">No Active Campaign</TabsTrigger>
          </TabsList>

          {/* High Traffic Vendors */}
          <TabsContent value="traffic" className="space-y-4">
            <Card className="bg-blue-600/10 border-blue-600/30 p-4 mb-6">
              <div className="flex gap-3">
                <Eye className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-200 font-medium mb-1">High Traffic Vendors</p>
                  <p className="text-sm text-gray-300">
                    Vendors receiving the most listing views. Ideal candidates for homepage or city featured placements.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {highTrafficVendors.map((vendor, index) => (
                <Card key={vendor.id} className="bg-gray-900/50 border-green-900/20 hover:border-green-600/30 transition">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-lg flex items-center justify-center text-2xl font-bold text-blue-400">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{vendor.businessName}</h3>
                          <p className="text-sm text-gray-400 mb-3">{vendor.city}, CA</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                              {vendor.engagementScore} Score
                            </Badge>
                            <Badge variant="outline" className="border-gray-600">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />
                              {vendor.rating}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600">
                              <Package className="h-3 w-3 mr-1" />
                              {vendor.productCount} products
                            </Badge>
                            <Badge variant="outline" className="border-gray-600">
                              <Tag className="h-3 w-3 mr-1" />
                              {vendor.dealCount} deals
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Link href="/admin/placements">
                        <Button className="bg-green-600 hover:bg-green-700">
                          Create Campaign
                        </Button>
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Listing Views</p>
                        <p className="text-xl font-bold">{vendor.listingViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Weekly Growth</p>
                        <p className="text-xl font-bold text-green-400">+{vendor.weeklyGrowth}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Engagement</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-green-600 h-full"
                              style={{ width: `${vendor.engagementScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{vendor.engagementScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Growing Vendors */}
          <TabsContent value="growing" className="space-y-4">
            <Card className="bg-green-600/10 border-green-600/30 p-4 mb-6">
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-200 font-medium mb-1">Fast Growing Vendors</p>
                  <p className="text-sm text-gray-300">
                    Vendors with high week-over-week engagement growth. Ideal for early campaign adoption.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {growingVendors.map((vendor) => (
                <Card key={vendor.id} className="bg-gray-900/50 border-green-900/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{vendor.businessName}</h3>
                        <p className="text-sm text-gray-400">{vendor.city}, CA</p>
                      </div>
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-lg px-3 py-1">
                        +{vendor.weeklyGrowth}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Views</p>
                        <p className="text-lg font-bold">{vendor.listingViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Products</p>
                        <p className="text-lg font-bold">{vendor.productCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Deals</p>
                        <p className="text-lg font-bold">{vendor.dealCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Score</p>
                        <p className="text-lg font-bold">{vendor.engagementScore}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Deal Performers */}
          <TabsContent value="deals" className="space-y-4">
            <Card className="bg-orange-600/10 border-orange-600/30 p-4 mb-6">
              <div className="flex gap-3">
                <Tag className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-200 font-medium mb-1">Top Deal Performers</p>
                  <p className="text-sm text-gray-300">
                    Vendors with high deal engagement. Perfect for sponsored deal placements.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {dealPerformers.map((vendor) => (
                <Card key={vendor.id} className="bg-gray-900/50 border-green-900/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{vendor.businessName}</h3>
                        <p className="text-sm text-gray-400">{vendor.city}, CA</p>
                      </div>
                      <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                        {vendor.dealConversionRate}% conversion
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Deal Clicks</p>
                        <p className="text-lg font-bold">{vendor.dealClicks.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Active Deals</p>
                        <p className="text-lg font-bold">{vendor.dealCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Views</p>
                        <p className="text-lg font-bold">{vendor.listingViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Score</p>
                        <p className="text-lg font-bold">{vendor.engagementScore}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* No Campaign */}
          <TabsContent value="nocampaign" className="space-y-4">
            <Card className="bg-purple-600/10 border-purple-600/30 p-4 mb-6">
              <div className="flex gap-3">
                <Target className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-purple-200 font-medium mb-1">No Active Campaigns</p>
                  <p className="text-sm text-gray-300">
                    Established vendors without current advertising. Prime candidates for upselling.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {noCampaignVendors.map((vendor) => (
                <Card key={vendor.id} className="bg-gray-900/50 border-green-900/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{vendor.businessName}</h3>
                        <p className="text-sm text-gray-400">{vendor.city}, CA • {vendor.monthsSinceJoined} months on platform</p>
                      </div>
                      <Link href="/admin/placements">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          Pitch Campaign
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Views</p>
                        <p className="text-lg font-bold">{vendor.listingViews.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Growth</p>
                        <p className="text-lg font-bold text-green-400">+{vendor.weeklyGrowth}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Products</p>
                        <p className="text-lg font-bold">{vendor.productCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Deals</p>
                        <p className="text-lg font-bold">{vendor.dealCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Score</p>
                        <p className="text-lg font-bold">{vendor.engagementScore}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
