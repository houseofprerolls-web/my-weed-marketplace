'use client';

import { ProductCard, Product } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
  favoriteIds?: string[];
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  onAddToCart,
  onToggleFavorite,
  favoriteIds = [],
  emptyMessage = 'No products found'
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onToggleFavorite={onToggleFavorite}
          isFavorite={favoriteIds.includes(product.id)}
        />
      ))}
    </div>
  );
}
