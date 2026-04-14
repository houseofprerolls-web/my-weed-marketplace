"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, Filter, Star, MapPin, Tag, LayoutGrid, Play, Pause, CircleCheck as CheckCircle, Calendar, TrendingUp, Eye, MousePointerClick } from 'lucide-react';

export default function AdminPlacementsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');

  // Mock data
  const activeCampaigns = [
    {
      id: '1',
      vendor: 'GreenLeaf Dispensary',
      campaignName: 'Q1 Homepage Feature',
      placementType: 'homepage_featured',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      status: 'active',
      impressions: 52000,
      clicks: 2340,
      ctr: 4.5,
      assignedBy: 'Sarah Johnson',
      targetLocation: null,
    },
    {
      id: '2',
      vendor: 'Sunset Cannabis Delivery',
      campaignName: 'Los Angeles Map Feature',
      placementType: 'map_featured',
      startDate: '2026-03-05',
      endDate: '2026-04-05',
      status: 'active',
      impressions: 18400,
      clicks: 920,
      ctr: 5.0,
      assignedBy: 'Michael Chen',
      targetLocation: 'Los Angeles, CA',
    },
    {
      id: '3',
      vendor: 'Highway 420 Collective',
      campaignName: 'March Sponsored Deal',
      placementType: 'sponsored_deal',
      startDate: '2026-03-10',
      endDate: '2026-03-24',
      status: 'active',
      impressions: 9200,
      clicks: 680,
      ctr: 7.4,
      assignedBy: 'Sarah Johnson',
      targetLocation: null,
    },
  ];

  const scheduledCampaigns = [
    {
      id: '4',
      vendor: 'Green Valley Wellness',
      campaignName: 'April Homepage Feature',
      placementType: 'homepage_featured',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      status: 'scheduled',
      assignedBy: 'Michael Chen',
    },
  ];

  const placementTypes = [
    { value: 'homepage_featured', label: 'Homepage Featured', icon: Star, color: 'text-yellow-400' },
    { value: 'city_featured', label: 'City Featured', icon: MapPin, color: 'text-blue-400' },
    { value: 'map_featured', label: 'Map Featured Pin', icon: MapPin, color: 'text-green-400' },
    { value: 'sponsored_deal', label: 'Sponsored Deal', icon: Tag, color: 'text-orange-400' },
    { value: 'banner_ad', label: 'Banner Advertisement', icon: LayoutGrid, color: 'text-purple-400' },
  ];

  const getPlacementTypeInfo = (type: string) => {
    return placementTypes.find(pt => pt.value === type) || placementTypes[0];
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Placement Manager</h1>
              <p className="text-gray-400">Internal advertising campaign management</p>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-green-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Active Campaigns</p>
                  <p className="text-2xl font-bold">{activeCampaigns.length}</p>
                </div>
                <Play className="h-8 w-8 text-green-400" />
              </div>
            </Card>
            <Card className="bg-gray-900/50 border-green-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Impressions</p>
                  <p className="text-2xl font-bold">79.6K</p>
                </div>
                <Eye className="h-8 w-8 text-blue-400" />
              </div>
            </Card>
            <Card className="bg-gray-900/50 border-green-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Clicks</p>
                  <p className="text-2xl font-bold">3.9K</p>
                </div>
                <MousePointerClick className="h-8 w-8 text-purple-400" />
              </div>
            </Card>
            <Card className="bg-gray-900/50 border-green-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Avg CTR</p>
                  <p className="text-2xl font-bold">5.6%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-green-900/20">
            <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduledCampaigns.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="vendors">Vendor Leads</TabsTrigger>
          </TabsList>

          {/* Active Campaigns */}
          <TabsContent value="active" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-10 bg-gray-900/50 border-green-900/20"
                />
              </div>
              <Button variant="outline" className="border-green-600/30">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            <div className="space-y-3">
              {activeCampaigns.map((campaign) => {
                const typeInfo = getPlacementTypeInfo(campaign.placementType);
                const TypeIcon = typeInfo.icon;

                return (
                  <Card key={campaign.id} className="bg-gray-900/50 border-green-900/20 hover:border-green-600/30 transition">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 bg-gray-800/50 rounded-lg ${typeInfo.color}`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{campaign.campaignName}</h3>
                              <p className="text-sm text-gray-400">{campaign.vendor}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="border-green-600/30 text-green-400">
                              <Play className="h-3 w-3 mr-1" />
                              {campaign.status}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600">
                              {typeInfo.label}
                            </Badge>
                            {campaign.targetLocation && (
                              <Badge variant="outline" className="border-blue-600/30 text-blue-400">
                                <MapPin className="h-3 w-3 mr-1" />
                                {campaign.targetLocation}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-gray-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              {campaign.startDate} to {campaign.endDate}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>

                      {/* Performance Metrics */}
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

                      <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400">
                        Assigned by {campaign.assignedBy}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Scheduled Campaigns */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="space-y-3">
              {scheduledCampaigns.map((campaign) => {
                const typeInfo = getPlacementTypeInfo(campaign.placementType);
                const TypeIcon = typeInfo.icon;

                return (
                  <Card key={campaign.id} className="bg-gray-900/50 border-green-900/20">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-gray-800/50 rounded-lg ${typeInfo.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{campaign.campaignName}</h3>
                            <p className="text-sm text-gray-400">{campaign.vendor}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-blue-600/30 text-blue-400">
                            Scheduled
                          </Badge>
                          <Badge variant="outline" className="border-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            Starts {campaign.startDate}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Completed */}
          <TabsContent value="completed">
            <Card className="bg-gray-900/50 border-green-900/20 p-8 text-center">
              <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No completed campaigns</p>
            </Card>
          </TabsContent>

          {/* Vendor Leads */}
          <TabsContent value="vendors">
            <Link href="/admin/sales-dashboard">
              <Card className="bg-gradient-to-br from-green-600/20 to-blue-600/20 border-green-600/30 p-8 text-center cursor-pointer hover:border-green-600/50 transition">
                <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">View Sales Dashboard</h3>
                <p className="text-gray-300">Identify high-potential vendors for campaigns</p>
              </Card>
            </Link>
          </TabsContent>
        </Tabs>

        {/* Create Campaign Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-gray-900 border-green-900/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Create Placement Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor" className="text-gray-300">Vendor Business</Label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="bg-gray-800/50 border-green-900/20 text-white mt-1">
                      <SelectValue placeholder="Select vendor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-green-900/20">
                      <SelectItem value="greenleaf">GreenLeaf Dispensary</SelectItem>
                      <SelectItem value="sunset">Sunset Cannabis Delivery</SelectItem>
                      <SelectItem value="highway420">Highway 420 Collective</SelectItem>
                      <SelectItem value="greenvalley">Green Valley Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type" className="text-gray-300">Placement Type</Label>
                  <Select>
                    <SelectTrigger className="bg-gray-800/50 border-green-900/20 text-white mt-1">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-green-900/20">
                      {placementTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="name" className="text-gray-300">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q2 Homepage Feature"
                  className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start" className="text-gray-300">Start Date</Label>
                  <Input
                    id="start"
                    type="date"
                    className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end" className="text-gray-300">End Date</Label>
                  <Input
                    id="end"
                    type="date"
                    className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location" className="text-gray-300">Target Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Los Angeles, CA"
                  className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-gray-300">Campaign Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this campaign..."
                  className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-green-900/20"
              >
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
