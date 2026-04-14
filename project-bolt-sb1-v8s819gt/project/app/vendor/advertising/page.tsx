"use client";

import { useState } from 'react';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star, MapPin, Tag, Eye, MousePointerClick, TrendingUp,
  Calendar, Info, Sparkles
} from 'lucide-react';

export default function VendorAdvertisingPage() {
  const [dateRange, setDateRange] = useState('30days');

  // Mock data - vendor's active campaigns (read-only view)
  const activeCampaigns = [
    {
      id: '1',
      campaignName: 'Q1 Homepage Feature',
      placementType: 'homepage_featured',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      status: 'active',
      impressions: 52000,
      clicks: 2340,
      ctr: 4.5,
      daysRemaining: 24,
    },
  ];

  const pastCampaigns = [
    {
      id: '2',
      campaignName: 'February Map Feature',
      placementType: 'map_featured',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      status: 'completed',
      impressions: 38400,
      clicks: 1920,
      ctr: 5.0,
    },
  ];

  const placementTypes = {
    homepage_featured: { label: 'Homepage Featured', icon: Star, color: 'text-yellow-400' },
    city_featured: { label: 'City Featured', icon: MapPin, color: 'text-blue-400' },
    map_featured: { label: 'Map Featured Pin', icon: MapPin, color: 'text-green-400' },
    sponsored_deal: { label: 'Sponsored Deal', icon: Tag, color: 'text-orange-400' },
  };

  const getPlacementInfo = (type: string) => {
    return placementTypes[type as keyof typeof placementTypes] || placementTypes.homepage_featured;
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <VendorNav />

      <div className="flex-1 ml-0 md:ml-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Advertising Performance</h1>
            <p className="text-gray-400">Track your promotional campaign performance</p>
          </div>

          {/* Info Banner */}
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-600/30 p-6 mb-8">
            <div className="flex gap-4">
              <Sparkles className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Want to boost your visibility?</h3>
                <p className="text-gray-300 mb-3">
                  Advertising placements are managed by the GreenZone team. Contact your account manager to discuss campaign opportunities.
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-gray-300">Homepage Features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-gray-300">City Placements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span className="text-gray-300">Map Features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    <span className="text-gray-300">Sponsored Deals</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-gray-900/50 border border-green-900/20">
              <TabsTrigger value="active">Active Campaigns ({activeCampaigns.length})</TabsTrigger>
              <TabsTrigger value="past">Past Campaigns</TabsTrigger>
            </TabsList>

            {/* Active Campaigns */}
            <TabsContent value="active" className="space-y-6">
              {activeCampaigns.length === 0 ? (
                <Card className="bg-gray-900/50 border-green-900/20 p-12 text-center">
                  <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
                  <p className="text-gray-400 mb-4">
                    You don't have any active advertising campaigns at the moment.
                  </p>
                  <p className="text-sm text-gray-500">
                    Contact your account manager to discuss promotional opportunities.
                  </p>
                </Card>
              ) : (
                activeCampaigns.map((campaign) => {
                  const typeInfo = getPlacementInfo(campaign.placementType);
                  const TypeIcon = typeInfo.icon;

                  return (
                    <Card key={campaign.id} className="bg-gray-900/50 border-green-900/20">
                      <div className="p-6">
                        {/* Campaign Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 bg-gray-800/50 rounded-lg ${typeInfo.color}`}>
                              <TypeIcon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-xl mb-2">{campaign.campaignName}</h3>
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                                  Active
                                </Badge>
                                <Badge variant="outline" className="border-gray-600">
                                  {typeInfo.label}
                                </Badge>
                                <Badge variant="outline" className="border-gray-600">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {campaign.daysRemaining} days remaining
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="h-4 w-4 text-blue-400" />
                              <p className="text-sm text-gray-400">Impressions</p>
                            </div>
                            <p className="text-3xl font-bold">{campaign.impressions.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MousePointerClick className="h-4 w-4 text-purple-400" />
                              <p className="text-sm text-gray-400">Clicks</p>
                            </div>
                            <p className="text-3xl font-bold">{campaign.clicks.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-400" />
                              <p className="text-sm text-gray-400">Click-Through Rate</p>
                            </div>
                            <p className="text-3xl font-bold text-green-400">{campaign.ctr}%</p>
                          </div>
                        </div>

                        {/* Campaign Duration */}
                        <div className="bg-gray-800/20 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-400">Campaign Duration</p>
                            <p className="text-sm font-medium">
                              {campaign.startDate} to {campaign.endDate}
                            </p>
                          </div>
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-green-600 h-full transition-all"
                              style={{ width: '76%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* Past Campaigns */}
            <TabsContent value="past" className="space-y-4">
              {pastCampaigns.map((campaign) => {
                const typeInfo = getPlacementInfo(campaign.placementType);
                const TypeIcon = typeInfo.icon;

                return (
                  <Card key={campaign.id} className="bg-gray-900/50 border-green-900/20">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 bg-gray-800/50 rounded-lg ${typeInfo.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{campaign.campaignName}</h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-gray-600">
                                Completed
                              </Badge>
                              <Badge variant="outline" className="border-gray-600">
                                {typeInfo.label}
                              </Badge>
                              <Badge variant="outline" className="border-gray-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {campaign.startDate} to {campaign.endDate}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Impressions</p>
                          <p className="text-xl font-bold">{campaign.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Clicks</p>
                          <p className="text-xl font-bold">{campaign.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">CTR</p>
                          <p className="text-xl font-bold text-green-400">{campaign.ctr}%</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>

          {/* Info Section */}
          <Card className="bg-blue-600/10 border-blue-600/30 p-6 mt-8">
            <div className="flex gap-4">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">About Campaign Metrics</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Impressions:</strong> Number of times your placement was displayed to users</p>
                  <p><strong>Clicks:</strong> Number of times users clicked on your placement</p>
                  <p><strong>CTR (Click-Through Rate):</strong> Percentage of impressions that resulted in clicks</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
