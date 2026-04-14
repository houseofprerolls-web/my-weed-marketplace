"use client";

import Link from "next/link";
import { MapPin, Star, Clock, ShoppingBag, Tag, Truck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface VendorCardProps {
  vendor: {
    id: string;
    business_name: string;
    city: string;
    state: string;
    logo_url?: string;
    average_rating: number;
    total_reviews: number;
    total_products: number;
    active_deals_count: number;
    minimum_order: number;
    delivery_fee: number;
    average_delivery_time: number;
    offers_delivery: boolean;
    offers_pickup: boolean;
    featured_until?: string;
    promoted_until?: string;
  };
  distance?: number;
  isOpen?: boolean;
}

export function VendorCard({ vendor, distance, isOpen = true }: VendorCardProps) {
  const isFeatured = vendor.featured_until && new Date(vendor.featured_until) > new Date();
  const isPromoted = vendor.promoted_until && new Date(vendor.promoted_until) > new Date();

  return (
    <Link href={`/listing/${vendor.id}`}>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
        {isFeatured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400"></div>
        )}

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
                {vendor.logo_url ? (
                  <img
                    src={vendor.logo_url}
                    alt={vendor.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-10 h-10 text-emerald-600" />
                )}
              </div>

              {isOpen ? (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-400 rounded-full border-2 border-white"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                  {vendor.business_name}
                </h3>

                {isFeatured && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 shrink-0">
                    Featured
                  </Badge>
                )}
                {!isFeatured && isPromoted && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shrink-0">
                    Promoted
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-900">{vendor.average_rating.toFixed(1)}</span>
                  <span className="text-sm text-slate-600">({vendor.total_reviews})</span>
                </div>

                {distance !== undefined && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{distance.toFixed(1)} mi</span>
                  </div>
                )}

                <div className={`flex items-center gap-1 text-sm font-medium ${isOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{isOpen ? 'Open Now' : 'Closed'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm text-slate-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{vendor.city}, {vendor.state}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{vendor.average_delivery_time} min</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{vendor.total_products} items</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">
                    {vendor.delivery_fee === 0 ? 'Free delivery' : `$${vendor.delivery_fee.toFixed(2)} fee`}
                  </span>
                </div>

                {vendor.minimum_order > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">${vendor.minimum_order} min</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {vendor.active_deals_count > 0 && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                    <Tag className="w-3 h-3 mr-1" />
                    {vendor.active_deals_count} Active {vendor.active_deals_count === 1 ? 'Deal' : 'Deals'}
                  </Badge>
                )}

                {vendor.offers_delivery && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Truck className="w-3 h-3 mr-1" />
                    Delivery
                  </Badge>
                )}

                {vendor.offers_pickup && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Pickup
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-400 rounded-lg transition-all pointer-events-none"></div>
      </Card>
    </Link>
  );
}
