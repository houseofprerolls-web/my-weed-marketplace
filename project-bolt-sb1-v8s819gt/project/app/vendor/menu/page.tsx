"use client";

import { useState } from 'react';
import Link from 'next/link';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Grid2x2 as Grid, List, Package, Tag, TrendingUp, Eye, MousePointerClick, DollarSign } from 'lucide-react';

export default function MenuManagerPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - will be replaced with real Supabase data
  const categories = [
    { id: '1', name: 'Flower', productCount: 24, icon: '🌿' },
    { id: '2', name: 'Pre-Rolls', productCount: 12, icon: '🚬' },
    { id: '3', name: 'Vapes', productCount: 18, icon: '💨' },
    { id: '4', name: 'Edibles', productCount: 31, icon: '🍪' },
    { id: '5', name: 'Concentrates', productCount: 15, icon: '💎' },
    { id: '6', name: 'Topicals', productCount: 8, icon: '🧴' },
  ];

  const products = [
    {
      id: '1',
      name: 'Blue Dream',
      brand: 'House Flower',
      category: 'Flower',
      price: 45,
      salePrice: 35,
      thc: 24.5,
      cbd: 0.8,
      stock: 'in_stock',
      stockQty: 45,
      views: 234,
      clicks: 67,
      hasDeal: true,
      images: ['https://images.pexels.com/photos/7262757/pexels-photo-7262757.jpeg?w=400'],
    },
    {
      id: '2',
      name: 'Sour Diesel Pre-Roll Pack',
      brand: 'Premium Rolls',
      category: 'Pre-Rolls',
      price: 28,
      thc: 22.3,
      cbd: 0.5,
      stock: 'in_stock',
      stockQty: 78,
      views: 189,
      clicks: 52,
      hasDeal: false,
      images: ['https://images.pexels.com/photos/7262775/pexels-photo-7262775.jpeg?w=400'],
    },
    {
      id: '3',
      name: 'Gelato Live Resin Cart',
      brand: 'Elite Extracts',
      category: 'Vapes',
      price: 55,
      salePrice: 45,
      thc: 89.2,
      cbd: 0.3,
      stock: 'low_stock',
      stockQty: 8,
      views: 312,
      clicks: 89,
      hasDeal: true,
      images: ['https://images.pexels.com/photos/7262768/pexels-photo-7262768.jpeg?w=400'],
    },
  ];

  const stats = [
    { label: 'Total Products', value: '108', icon: Package, color: 'text-blue-400' },
    { label: 'Active Deals', value: '12', icon: Tag, color: 'text-green-400' },
    { label: 'Menu Views', value: '4,320', icon: Eye, color: 'text-purple-400', change: '+12%' },
    { label: 'Product Clicks', value: '1,270', icon: MousePointerClick, color: 'text-orange-400', change: '+8%' },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white">
      <VendorNav />

      <div className="flex-1 ml-0 md:ml-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Menu Manager</h1>
                <p className="text-gray-400">Manage your product catalog, pricing, and inventory</p>
              </div>
              <div className="flex gap-3">
                <Link href="/vendor/menu/categories">
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    <Grid className="h-4 w-4 mr-2" />
                    Manage Categories
                  </Button>
                </Link>
                <Link href="/vendor/menu/products/new">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat) => (
                <Card key={stat.label} className="bg-gray-900/50 border-green-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        {stat.change && (
                          <span className="text-xs text-green-400">{stat.change}</span>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 bg-gray-800/50 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="bg-gray-900/50 border border-green-900/20">
              <TabsTrigger value="products">All Products</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="deals">Active Deals</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              {/* Filters */}
              <Card className="bg-gray-900/50 border-green-900/20 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-green-900/20"
                    />
                  </div>
                  <Button variant="outline" className="border-green-600/30">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Category Quick Filter */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-green-600/30 bg-green-600/10 text-green-400">
                  All Products
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant="outline"
                    className="border-green-900/20 hover:border-green-600/30 hover:bg-green-600/10"
                  >
                    {cat.icon} {cat.name} ({cat.productCount})
                  </Button>
                ))}
              </div>

              {/* Products Grid */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {products.map((product) => (
                  <Link key={product.id} href={`/vendor/menu/products/${product.id}`}>
                    <Card className="bg-gray-900/50 border-green-900/20 hover:border-green-600/30 transition overflow-hidden group cursor-pointer">
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {product.hasDeal && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-green-600 text-white">Deal Active</Badge>
                          </div>
                        )}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                          product.stock === 'in_stock' ? 'bg-green-600/90 text-white' :
                          product.stock === 'low_stock' ? 'bg-orange-600/90 text-white' :
                          'bg-red-600/90 text-white'
                        }`}>
                          {product.stock === 'in_stock' ? 'In Stock' :
                           product.stock === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                        </div>
                      </div>
                      <div className="p-4">
                        <Badge variant="outline" className="border-green-600/30 text-green-400 mb-2">
                          {product.category}
                        </Badge>
                        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-400 mb-3">{product.brand}</p>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {product.salePrice ? (
                              <>
                                <span className="text-xl font-bold text-green-400">${product.salePrice}</span>
                                <span className="text-sm text-gray-400 line-through">${product.price}</span>
                              </>
                            ) : (
                              <span className="text-xl font-bold">${product.price}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="border-purple-600/30 text-purple-400">
                            {product.thc}% THC
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-800">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {product.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            {product.clicks} clicks
                          </span>
                          <span>Qty: {product.stockQty}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <Card className="bg-gray-900/50 border-green-900/20 p-6 text-center">
                <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
                <p className="text-gray-400 mb-4">Track stock levels and manage product availability</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  View Inventory
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="deals">
              <Card className="bg-gray-900/50 border-green-900/20 p-6 text-center">
                <Tag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Active Product Deals</h3>
                <p className="text-gray-400 mb-4">Manage promotional pricing and deal overlays</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="bg-gray-900/50 border-green-900/20 p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Menu Analytics</h3>
                <p className="text-gray-400 mb-4">Track menu performance, product views, and deal clicks</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  View Analytics
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
