"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Store, DollarSign, TrendingUp, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, Eye, Search, MapPin, Star, Flag, FileCheck, Circle as XCircle, ChartBar as BarChart3 } from 'lucide-react';
import { AssistantPanel } from '@/components/ai/AssistantPanel';

export default function AdminDashboardPage() {
  const platformMetrics = {
    totalUsers: 45238,
    totalVendors: 1247,
    activeListings: 892,
    pendingApprovals: 23,
    totalDeals: 456,
    dailyVisitors: 23847,
    monthlyRevenue: 45600,
    revenueGrowth: 23
  };

  const pendingVendors = [
    {
      id: '1',
      businessName: 'Golden State Wellness',
      businessType: 'Dispensary',
      location: 'San Francisco, CA',
      submittedAt: '2026-03-06',
      licenseStatus: 'Pending Verification'
    },
    {
      id: '2',
      businessName: 'Pacific Green Delivery',
      businessType: 'Delivery',
      location: 'Los Angeles, CA',
      submittedAt: '2026-03-06',
      licenseStatus: 'Documents Uploaded'
    },
    {
      id: '3',
      businessName: 'Mountain View Cultivators',
      businessType: 'Cultivator',
      location: 'Denver, CO',
      submittedAt: '2026-03-05',
      licenseStatus: 'Pending Verification'
    }
  ];

  const topSearchedCities = [
    { city: 'Los Angeles, CA', searches: 12847, change: 15 },
    { city: 'San Francisco, CA', searches: 9234, change: 23 },
    { city: 'Denver, CO', searches: 7865, change: 18 },
    { city: 'Seattle, WA', searches: 6543, change: 12 },
    { city: 'Portland, OR', searches: 5432, change: 28 }
  ];

  const topPerformingVendors = [
    {
      id: '1',
      name: 'Green Valley Dispensary',
      views: 12847,
      clicks: 3421,
      revenue: 1500,
      plan: 'Premium'
    },
    {
      id: '2',
      name: 'City Lights Cannabis',
      views: 10234,
      clicks: 2876,
      revenue: 1200,
      plan: 'Featured'
    },
    {
      id: '3',
      name: 'Sunset Delivery',
      views: 8976,
      clicks: 2341,
      revenue: 800,
      plan: 'Featured'
    }
  ];

  const flaggedContent = [
    {
      id: '1',
      type: 'Review',
      subject: 'Review by John D.',
      business: 'Green Valley Dispensary',
      reason: 'Inappropriate content',
      reportedAt: '2026-03-07',
      status: 'Pending'
    },
    {
      id: '2',
      type: 'Listing',
      subject: 'Unlicensed operation claim',
      business: 'Quick Green Delivery',
      reason: 'License verification issue',
      reportedAt: '2026-03-06',
      status: 'Under Review'
    },
    {
      id: '3',
      type: 'Deal',
      subject: 'Misleading promotion',
      business: 'Budget Buds',
      reason: 'False advertising',
      reportedAt: '2026-03-06',
      status: 'Pending'
    }
  ];

  const placementPerformance = [
    {
      vendorName: 'Green Valley Dispensary',
      placementType: 'Homepage Featured',
      impressions: 45678,
      clicks: 3421,
      ctr: 7.5,
      revenue: 500,
      status: 'Active'
    },
    {
      vendorName: 'City Lights Cannabis',
      placementType: 'City Featured - LA',
      impressions: 23456,
      clicks: 2187,
      ctr: 9.3,
      revenue: 300,
      status: 'Active'
    },
    {
      vendorName: 'Sunset Delivery',
      placementType: 'Category Featured',
      impressions: 15432,
      clicks: 1234,
      ctr: 8.0,
      revenue: 200,
      status: 'Active'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-400">
                Platform Management & Analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                {platformMetrics.pendingApprovals} Pending Approvals
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900 border border-green-900/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="placements">Placements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-white">{platformMetrics.totalUsers.toLocaleString()}</p>
                    <p className="text-gray-500 text-sm mt-2">Active customers</p>
                  </div>
                  <div className="bg-blue-600/20 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Active Listings</p>
                    <p className="text-3xl font-bold text-white">{platformMetrics.activeListings}</p>
                    <p className="text-gray-500 text-sm mt-2">of {platformMetrics.totalVendors} vendors</p>
                  </div>
                  <div className="bg-green-600/20 p-3 rounded-lg">
                    <Store className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Daily Visitors</p>
                    <p className="text-3xl font-bold text-white">{platformMetrics.dailyVisitors.toLocaleString()}</p>
                    <p className="text-gray-500 text-sm mt-2">Last 24 hours</p>
                  </div>
                  <div className="bg-purple-600/20 p-3 rounded-lg">
                    <Eye className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-white">${platformMetrics.monthlyRevenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 text-sm">+{platformMetrics.revenueGrowth}%</span>
                    </div>
                  </div>
                  <div className="bg-yellow-600/20 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
                <div className="p-6 border-b border-green-900/20">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-green-500" />
                    Top Searched Cities
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {topSearchedCities.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 border border-green-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600/20 p-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-white font-semibold">{item.city}</p>
                            <p className="text-gray-400 text-sm">{item.searches.toLocaleString()} searches</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-500 text-sm">+{item.change}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
                <div className="p-6 border-b border-green-900/20">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-500" />
                    Top Performing Vendors
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {topPerformingVendors.map((vendor, index) => (
                      <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-800/50 border border-green-900/20 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold">{vendor.name}</p>
                            <Badge className="bg-green-600/20 text-green-500 border-green-600/30 text-xs">
                              {vendor.plan}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {vendor.views.toLocaleString()} views · {vendor.clicks.toLocaleString()} clicks
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-500 font-bold">${vendor.revenue}</p>
                          <p className="text-gray-400 text-xs">revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Pending Vendor Approvals</h3>
                    <p className="text-gray-400 mt-1">{pendingVendors.length} vendors awaiting review</p>
                  </div>
                  <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                    {pendingVendors.length} Pending
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {pendingVendors.map((vendor) => (
                    <div key={vendor.id} className="p-4 bg-gray-800/50 border border-green-900/20 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-bold text-lg">{vendor.businessName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                              {vendor.businessType}
                            </Badge>
                            <span className="text-gray-400 text-sm">{vendor.location}</span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">{vendor.submittedAt}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-green-900/20">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-yellow-500" />
                          <span className="text-gray-300 text-sm">{vendor.licenseStatus}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                            View Details
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-900/20 text-red-500 hover:bg-red-500/10">
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Flag className="h-5 w-5 text-red-500" />
                      Flagged Content
                    </h3>
                    <p className="text-gray-400 mt-1">{flaggedContent.length} items require review</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {flaggedContent.map((item) => (
                    <div key={item.id} className="p-4 bg-gray-800/50 border border-red-900/20 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-red-600/20 text-red-500 border-red-600/30">
                              {item.type}
                            </Badge>
                            <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">
                              {item.status}
                            </Badge>
                          </div>
                          <h4 className="text-white font-semibold">{item.subject}</h4>
                          <p className="text-gray-400 text-sm mt-1">Business: {item.business}</p>
                          <p className="text-gray-400 text-sm">Reason: {item.reason}</p>
                        </div>
                        <span className="text-gray-400 text-sm">{item.reportedAt}</span>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-green-900/20">
                        <Button size="sm" variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                          Review
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-900/20 text-red-500 hover:bg-red-500/10">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="placements" className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20">
              <div className="p-6 border-b border-green-900/20">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Active Placement Campaigns
                </h3>
                <p className="text-gray-400 mt-1">Monitor revenue and performance</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {placementPerformance.map((placement, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 border border-green-900/20 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-bold">{placement.vendorName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                              {placement.placementType}
                            </Badge>
                            <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">
                              {placement.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-500 font-bold text-xl">${placement.revenue}</p>
                          <p className="text-gray-400 text-sm">Revenue</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-green-900/20">
                        <div>
                          <p className="text-gray-400 text-sm">Impressions</p>
                          <p className="text-white font-bold">{placement.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Clicks</p>
                          <p className="text-white font-bold">{placement.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">CTR</p>
                          <p className="text-green-500 font-bold">{placement.ctr}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h4 className="text-white font-semibold mb-4">Search Conversion Rate</h4>
                <p className="text-4xl font-bold text-green-500 mb-2">68.4%</p>
                <p className="text-gray-400 text-sm">Searches leading to clicks</p>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h4 className="text-white font-semibold mb-4">Avg. Session Duration</h4>
                <p className="text-4xl font-bold text-green-500 mb-2">4:32</p>
                <p className="text-gray-400 text-sm">Minutes per session</p>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <h4 className="text-white font-semibold mb-4">Mobile Traffic</h4>
                <p className="text-4xl font-bold text-green-500 mb-2">73%</p>
                <p className="text-gray-400 text-sm">Of total visitors</p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AssistantPanel assistantType="admin" triggerVariant="fab" />
    </div>
  );
}
