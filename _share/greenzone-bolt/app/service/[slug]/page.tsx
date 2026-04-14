"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Clock, DollarSign, MapPin, Phone, Mail, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReviewSection } from '@/components/reviews/ReviewSection';

type DeliveryService = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  total_reviews: number;
  average_delivery_time: number;
  min_order: number;
  delivery_fee: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  weight: string | null;
  strain_type: string | null;
  in_stock: boolean;
  category_id: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function ServicePage() {
  const params = useParams();
  const { addLegacyItem, replaceCartWith } = useCart();
  const { toast } = useToast();
  const [service, setService] = useState<DeliveryService | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceData();
  }, [params.slug]);

  const loadServiceData = async () => {
    try {
      const { data: serviceData, error: serviceError } = await supabase
        .from('delivery_services')
        .select('*')
        .eq('slug', params.slug)
        .eq('is_active', true)
        .not('approved_at', 'is', null)
        .maybeSingle();

      if (serviceError) throw serviceError;
      if (!serviceData) {
        setLoading(false);
        return;
      }

      setService(serviceData);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('service_id', serviceData.id)
        .eq('in_stock', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!service) return;

    const line = {
      productId: product.id,
      serviceId: service.id,
      serviceName: service.name,
      name: product.name,
      price: product.sale_price || product.price,
      quantity: 1,
      image: product.image_url,
      thc: product.thc_percentage,
      weight: product.weight,
    };

    const r = addLegacyItem(line);
    if (r.ok) {
      toast({
        title: 'Added to cart',
        description: `${product.name} has been added to your cart`,
      });
      return;
    }
    if (r.reason === 'DIFFERENT_SERVICE') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(
          `Your cart is for ${r.currentServiceLabel}. Switch to ${service.name} and add this item?`
        );
      if (ok) {
        replaceCartWith({ kind: 'legacy', ...line, quantity: 1 });
        toast({ title: 'Cart updated', description: product.name });
      }
      return;
    }
    if (r.reason === 'SCHEMA_MIX') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Your cart is from a licensed shop checkout. Replace it with this delivery menu?');
      if (ok) {
        replaceCartWith({ kind: 'legacy', ...line, quantity: 1 });
        toast({ title: 'Cart updated', description: product.name });
      }
    }
  };

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-gray-900 border-green-900/20 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Service Not Found</h2>
          <p className="text-gray-400">The delivery service you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div
        className="h-64 bg-cover bg-center relative"
        style={{
          backgroundImage: service.banner_url
            ? `url(${service.banner_url})`
            : 'linear-gradient(to bottom, #064e3b, #000000)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
      </div>

      <div className="container mx-auto px-4">
        <div className="relative -mt-32 mb-8">
          <Card className="bg-gray-900 border-green-900/20 p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-32 h-32 bg-green-900/30 rounded-2xl flex items-center justify-center border-2 border-green-600/30 flex-shrink-0">
                {service.logo_url ? (
                  <img
                    src={service.logo_url}
                    alt={service.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-4xl font-bold text-green-500">
                    {service.name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {service.name}
                  </h1>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-white font-semibold">{service.rating.toFixed(1)}</span>
                      <span className="text-gray-400">({service.total_reviews} reviews)</span>
                    </div>
                    <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
                      Licensed & Verified
                    </Badge>
                  </div>
                </div>

                <p className="text-gray-300">{service.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-sm text-gray-400">Delivery Time</div>
                      <div className="font-semibold">{service.average_delivery_time} min</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-sm text-gray-400">Min Order</div>
                      <div className="font-semibold">${service.min_order}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-sm text-gray-400">Delivery Fee</div>
                      <div className="font-semibold">${service.delivery_fee}</div>
                    </div>
                  </div>
                  {service.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="text-sm text-gray-400">Phone</div>
                        <div className="font-semibold text-sm">{service.phone}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-gray-900 border border-green-900/20">
              <TabsTrigger value="all" className="data-[state=active]:bg-green-600">
                All Products
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-green-600"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center mb-8">
            <p className="text-gray-400 text-lg">No products available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 overflow-hidden"
              >
                <div className="aspect-square bg-green-900/10 relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl text-green-500/20">🌿</span>
                    </div>
                  )}
                  {product.sale_price && (
                    <Badge className="absolute top-2 right-2 bg-red-600">Sale</Badge>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg line-clamp-1">{product.name}</h3>
                    {product.weight && (
                      <p className="text-gray-400 text-sm">{product.weight}</p>
                    )}
                  </div>

                  {(product.thc_percentage || product.cbd_percentage) && (
                    <div className="flex gap-2">
                      {product.thc_percentage && (
                        <Badge variant="outline" className="border-green-600 text-green-500">
                          THC {product.thc_percentage}%
                        </Badge>
                      )}
                      {product.cbd_percentage && (
                        <Badge variant="outline" className="border-blue-600 text-blue-500">
                          CBD {product.cbd_percentage}%
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      {product.sale_price ? (
                        <>
                          <span className="text-white font-bold text-xl">${product.sale_price}</span>
                          <span className="text-gray-500 line-through ml-2">${product.price}</span>
                        </>
                      ) : (
                        <span className="text-white font-bold text-xl">${product.price}</span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12">
          <ReviewSection
            serviceId={service.id}
            averageRating={service.rating}
            totalReviews={service.total_reviews}
          />
        </div>
      </div>
    </div>
  );
}
