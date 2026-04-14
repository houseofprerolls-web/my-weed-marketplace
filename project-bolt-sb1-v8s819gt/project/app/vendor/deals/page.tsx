"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { Tag, Plus, CreditCard as Edit, Trash2, Eye, MousePointerClick, TrendingUp, Calendar } from 'lucide-react';

export default function VendorDealsPage() {
  const deals = [
    {
      id: '1',
      title: '20% Off All Edibles',
      description: 'Get 20% off our entire selection of premium edibles',
      category: 'Edibles',
      status: 'Active',
      views: 2341,
      clicks: 456,
      ctr: 19.5,
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      isSponsored: true
    },
    {
      id: '2',
      title: 'BOGO House Flower',
      description: 'Buy one get one free on all house flower strains',
      category: 'Flower',
      status: 'Active',
      views: 1876,
      clicks: 387,
      ctr: 20.6,
      startDate: '2026-03-05',
      endDate: '2026-03-20',
      isSponsored: false
    },
    {
      id: '3',
      title: 'Happy Hour Special',
      description: '15% off everything during happy hour 4-6pm',
      category: 'All Products',
      status: 'Scheduled',
      views: 0,
      clicks: 0,
      ctr: 0,
      startDate: '2026-03-15',
      endDate: '2026-03-31',
      isSponsored: false
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Deals & Offers</h1>
              <p className="text-gray-400">Create and manage your promotional deals</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-5 w-5 mr-2" />
              Create New Deal
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Views</p>
                  <Eye className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-white mb-1">4,217</p>
                <p className="text-green-500 text-sm">+23% this month</p>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Clicks</p>
                  <MousePointerClick className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-white mb-1">843</p>
                <p className="text-green-500 text-sm">+18% this month</p>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Avg CTR</p>
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-white mb-1">20.0%</p>
                <p className="text-green-500 text-sm">+2.4% this month</p>
              </Card>
            </div>

            {/* Active Deals */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Tag className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Your Deals</h2>
                  <p className="text-gray-400 text-sm">{deals.length} total deals</p>
                </div>
              </div>

              <div className="space-y-4">
                {deals.map((deal) => (
                  <Card key={deal.id} className="bg-gray-800/50 border-green-900/20 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-white">{deal.title}</h3>
                          <Badge className={
                            deal.status === 'Active'
                              ? 'bg-green-600/20 text-green-500 border-green-600/30'
                              : 'bg-yellow-600/20 text-yellow-500 border-yellow-600/30'
                          }>
                            {deal.status}
                          </Badge>
                          {deal.isSponsored && (
                            <Badge className="bg-purple-600/20 text-purple-500 border-purple-600/30">
                              Sponsored
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{deal.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{deal.startDate} - {deal.endDate}</span>
                          </div>
                          <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/30">
                            {deal.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white">
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {deal.status === 'Active' && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-900/20">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Views</p>
                          <p className="text-white font-semibold">{deal.views.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Clicks</p>
                          <p className="text-white font-semibold">{deal.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">CTR</p>
                          <p className="text-green-500 font-semibold">{deal.ctr}%</p>
                        </div>
                      </div>
                    )}

                    {deal.status === 'Active' && !deal.isSponsored && (
                      <div className="mt-4 p-4 bg-purple-600/10 border border-purple-600/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold mb-1">Boost this deal</p>
                            <p className="text-gray-400 text-sm">Get 10x more visibility with sponsored placement</p>
                          </div>
                          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                            Upgrade to Sponsored
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>

            {/* Tips */}
            <Card className="bg-gradient-to-br from-green-950/30 to-black border-green-900/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Tips for Better Deals</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Use clear, specific titles that highlight the discount value</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Set appropriate start and end dates to create urgency</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Upload high-quality images that showcase your products</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Sponsor high-performing deals to maximize reach</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
