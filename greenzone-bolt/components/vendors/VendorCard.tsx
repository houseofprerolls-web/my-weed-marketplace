"use client";

import Link from "next/link";
import { MapPin, Star, Clock, ShoppingBag, Tag, Truck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OptimizedImg } from "@/components/media/OptimizedImg";
import { cn } from "@/lib/utils";
import { VendorSkuCardFrame } from "@/components/vendor/VendorSkuCardFrame";
import {
  resolveStoreListingCardTheme,
  type ResolvedSkuCardTheme,
} from "@/lib/vendorSkuCardTheme";
import { listingHrefForVendor } from "@/lib/listingPath";

interface VendorCardProps {
  vendor: {
    id: string;
    slug?: string | null;
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
  /** On-ladder or eligible Smokers Club for shopper’s market */
  smokersClub?: boolean;
  /** Dark card chrome (e.g. strain encyclopedia on black page). */
  tone?: "light" | "dark";
  /** When dark: optional branded shell (Discover / listing design). */
  listingCardTheme?: ResolvedSkuCardTheme | null;
}

export function VendorCard({
  vendor,
  distance,
  isOpen = true,
  smokersClub,
  tone = "light",
  listingCardTheme,
}: VendorCardProps) {
  const isFeatured = vendor.featured_until && new Date(vendor.featured_until) > new Date();
  const isPromoted = vendor.promoted_until && new Date(vendor.promoted_until) > new Date();
  const dark = tone === "dark";
  const shellTheme = dark ? (listingCardTheme ?? resolveStoreListingCardTheme(null)) : null;

  const hoverRing = (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-lg border-2 border-transparent transition-all",
        dark ? "group-hover:border-green-500/50" : "group-hover:border-emerald-400"
      )}
    />
  );

  const main = (
    <>
      {isFeatured && (
        <div className="absolute left-0 right-0 top-0 z-[2] h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                dark ? "bg-green-950/45" : "bg-gradient-to-br from-emerald-50 to-emerald-100"
              )}
            >
              {vendor.logo_url ? (
                <OptimizedImg
                  src={vendor.logo_url}
                  alt={vendor.business_name}
                  className="h-full w-full object-contain object-center"
                  preset="logo"
                />
              ) : (
                <ShoppingBag className={cn("h-5 w-5", dark ? "text-green-400" : "text-emerald-600")} />
              )}
            </div>

            {isOpen ? (
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-emerald-500",
                  dark ? "border-gray-900" : "border-white"
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
              </div>
            ) : (
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 bg-slate-400",
                  dark ? "border-gray-900" : "border-white"
                )}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "line-clamp-1 text-lg font-semibold transition-colors",
                  dark ? "text-white group-hover:text-green-400" : "text-slate-900 group-hover:text-emerald-600"
                )}
              >
                {vendor.business_name}
              </h3>

              {isFeatured && (
                <Badge className="shrink-0 border-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-white">
                  Featured
                </Badge>
              )}
              {!isFeatured && isPromoted && (
                <Badge className="shrink-0 border-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  Promoted
                </Badge>
              )}
              {smokersClub && (
                <Badge className="shrink-0 border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100">
                  Smokers Club
                </Badge>
              )}
            </div>

            <div className="mb-3 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className={cn("font-semibold", dark ? "text-white" : "text-slate-900")}>
                  {vendor.average_rating.toFixed(1)}
                </span>
                <span className={cn("text-sm", dark ? "text-gray-400" : "text-slate-600")}>
                  ({vendor.total_reviews})
                </span>
              </div>

              {distance !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    dark ? "text-gray-400" : "text-slate-600"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  <span>{distance.toFixed(1)} mi</span>
                </div>
              )}

              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isOpen
                    ? dark
                      ? "text-green-400"
                      : "text-emerald-600"
                    : dark
                      ? "text-gray-500"
                      : "text-slate-500"
                )}
              >
                <Clock className="h-4 w-4" />
                <span>{isOpen ? "Open Now" : "Closed"}</span>
              </div>
            </div>

            <div
              className={cn("mb-3 flex items-center gap-1 text-sm", dark ? "text-gray-400" : "text-slate-600")}
            >
              <MapPin className="h-4 w-4" />
              <span>
                {vendor.city}, {vendor.state}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className={cn("h-4 w-4", dark ? "text-gray-500" : "text-slate-400")} />
                <span className={dark ? "text-gray-300" : "text-slate-700"}>
                  {vendor.average_delivery_time} min
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Package className={cn("h-4 w-4", dark ? "text-gray-500" : "text-slate-400")} />
                <span className={dark ? "text-gray-300" : "text-slate-700"}>{vendor.total_products} items</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Truck className={cn("h-4 w-4", dark ? "text-gray-500" : "text-slate-400")} />
                <span className={dark ? "text-gray-300" : "text-slate-700"}>
                  {vendor.delivery_fee === 0 ? "Free delivery" : `$${vendor.delivery_fee.toFixed(2)} fee`}
                </span>
              </div>

              {vendor.minimum_order > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <ShoppingBag className={cn("h-4 w-4", dark ? "text-gray-500" : "text-slate-400")} />
                  <span className={dark ? "text-gray-300" : "text-slate-700"}>${vendor.minimum_order} min</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {vendor.active_deals_count > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    dark
                      ? "border-rose-500/40 bg-rose-950/40 text-rose-200"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {vendor.active_deals_count} Active {vendor.active_deals_count === 1 ? "Deal" : "Deals"}
                </Badge>
              )}

              {vendor.offers_delivery && (
                <Badge
                  variant="outline"
                  className={cn(
                    dark
                      ? "border-green-600/40 bg-green-950/40 text-green-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  <Truck className="mr-1 h-3 w-3" />
                  Delivery
                </Badge>
              )}

              {vendor.offers_pickup && (
                <Badge
                  variant="outline"
                  className={cn(
                    dark
                      ? "border-blue-500/40 bg-blue-950/40 text-blue-200"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                  )}
                >
                  <ShoppingBag className="mr-1 h-3 w-3" />
                  Pickup
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (dark && shellTheme) {
    return (
      <VendorSkuCardFrame
        theme={shellTheme}
        className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <Link href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })} className="relative z-[1] block text-inherit no-underline">
          {main}
        </Link>
        {hoverRing}
      </VendorSkuCardFrame>
    );
  }

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-lg"
      )}
    >
      <Link href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })} className="relative z-[1] block text-inherit no-underline">
        {main}
      </Link>
      {hoverRing}
    </Card>
  );
}
