'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Heart } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  weight: string | null;
  images: string[];
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_featured: boolean;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false
}: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const isOutOfStock = product.stock_status === 'out_of_stock';
  const productImage = product.images?.[0] || '/placeholder-product.jpg';

  const handleAddToCart = async () => {
    if (onAddToCart && !isOutOfStock) {
      setLoading(true);
      try {
        await onAddToCart(product);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        <Image
          src={productImage}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500">
            Featured
          </Badge>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            Sale
          </Badge>
        )}
        {product.stock_status === 'low_stock' && (
          <Badge className="absolute bottom-2 left-2 bg-orange-500">
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge className="absolute bottom-2 left-2 bg-gray-500">
            Out of Stock
          </Badge>
        )}
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={() => onToggleFavorite(product.id)}
          >
            <Heart
              className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
            />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {product.brand && (
          <p className="text-sm text-gray-600">{product.brand}</p>
        )}
        <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>

        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center gap-2 text-sm">
          {product.thc_percentage && (
            <Badge variant="outline">THC {product.thc_percentage}%</Badge>
          )}
          {product.cbd_percentage && (
            <Badge variant="outline">CBD {product.cbd_percentage}%</Badge>
          )}
          {product.weight && (
            <Badge variant="outline">{product.weight}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">
              ${displayPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {onAddToCart && (
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock || loading}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
