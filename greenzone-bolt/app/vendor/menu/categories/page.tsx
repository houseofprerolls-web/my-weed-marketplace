"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, ArrowLeft, GripVertical, Eye, EyeOff, CreditCard as Edit, Trash2, Package } from 'lucide-react';

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const vendorQ = searchParams.get('vendor')?.trim();
  const menuBack = vendorQ
    ? `/vendor/menu?${new URLSearchParams({ vendor: vendorQ }).toString()}`
    : '/vendor/menu';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Mock data
  const categories = [
    { id: '1', name: 'Flower', description: 'Premium cannabis flower', productCount: 24, isVisible: true, sortOrder: 1, emoji: '🌿' },
    { id: '2', name: 'Pre-Rolls', description: 'Ready-to-smoke pre-rolled joints', productCount: 12, isVisible: true, sortOrder: 2, emoji: '🚬' },
    { id: '3', name: 'Vapes', description: 'Vape cartridges and disposables', productCount: 18, isVisible: true, sortOrder: 3, emoji: '💨' },
    { id: '4', name: 'Edibles', description: 'Cannabis-infused food and beverages', productCount: 31, isVisible: true, sortOrder: 4, emoji: '🍪' },
    { id: '5', name: 'Concentrates', description: 'Wax, shatter, and live resin', productCount: 15, isVisible: true, sortOrder: 5, emoji: '💎' },
    { id: '6', name: 'Topicals', description: 'Lotions, balms, and transdermal patches', productCount: 8, isVisible: false, sortOrder: 6, emoji: '🧴' },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />

      <div className="ml-0 min-w-0 flex-1">
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href={menuBack}>
              <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white -ml-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Menu
              </Button>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Product Categories</h1>
                <p className="text-gray-400">Organize your menu with custom categories</p>
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-blue-600/10 border-blue-600/30 p-4 mb-6">
            <div className="flex gap-3">
              <Package className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-200">
                  <strong>Tip:</strong> Drag categories to reorder them. Hidden categories won't appear on your public menu.
                </p>
              </div>
            </div>
          </Card>

          {/* Categories List */}
          <div className="space-y-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="bg-gray-900/50 border-green-900/20 hover:border-green-600/30 transition"
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Drag Handle */}
                  <button className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </button>

                  {/* Emoji */}
                  <div className="text-2xl">{category.emoji}</div>

                  {/* Category Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      {!category.isVisible && (
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{category.description}</p>
                  </div>

                  {/* Product Count */}
                  <div className="text-center hidden sm:block">
                    <div className="text-2xl font-bold text-green-400">{category.productCount}</div>
                    <div className="text-xs text-gray-400">products</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingCategory(category)}
                      className="hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-600/10 text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Add/Edit Dialog */}
          <Dialog open={isAddDialogOpen || !!editingCategory} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingCategory(null);
            }
          }}>
            <DialogContent className="bg-gray-900 border-green-900/20">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name" className="text-gray-300">Category Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Flower, Edibles"
                    defaultValue={editingCategory?.name}
                    className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this category"
                    defaultValue={editingCategory?.description}
                    className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="emoji" className="text-gray-300">Emoji Icon (optional)</Label>
                  <Input
                    id="emoji"
                    placeholder="🌿"
                    defaultValue={editingCategory?.emoji}
                    className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                    maxLength={2}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                  <div>
                    <Label htmlFor="visible" className="text-gray-300 font-medium">Visible on Menu</Label>
                    <p className="text-sm text-gray-400">Show this category to customers</p>
                  </div>
                  <Switch
                    id="visible"
                    defaultChecked={editingCategory?.isVisible ?? true}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingCategory(null);
                  }}
                  className="border-green-900/20"
                >
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  {editingCategory ? 'Save Changes' : 'Add Category'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
