"use client";

import Link from "next/link";
import { MapPin, Star, Clock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveryVendor } from "@/lib/publicVendors";
import { SocialEquityBadge } from "@/components/vendor/SocialEquityBadge";
import { OptimizedImg } from "@/components/media/OptimizedImg";
import { VendorSkuCardFrame } from "@/components/vendor/VendorSkuCardFrame";
import { resolveStoreListingCardTheme } from "@/lib/vendorSkuCardTheme";
import { discoverFeaturedStripCardClass } from "@/components/discover/discoverFeaturedStrip";
import { listingHrefForVendor } from "@/lib/listingPath";

type Props = {
  vendor: DiscoveryVendor;
  distanceMi?: number;
  isOpen?: boolean;
  /** Larger padding / image for featured strip */
  featured?: boolean;
  className?: string;
  /** In-stock SKU count from live menu (Discover strip). */
  liveSkuCount?: number;
  happyHourActive?: boolean;
};

function oneLiner(v: DiscoveryVendor): string {
  const parts: string[] = [];
  if (v.offers_delivery && !v.offers_pickup) parts.push("Delivery");
  else if (v.offers_pickup && !v.offers_delivery) parts.push("Pickup");
  else if (v.offers_delivery || v.offers_pickup) parts.push("Shop");
  if (v.city) parts.push(`${v.city}, ${v.state}`);
  return parts.length ? parts.join(" · ") : "Cannabis retailer";
}

export function DiscoverStoreCard({
  vendor,
  distanceMi,
  isOpen = true,
  featured = false,
  className,
  liveSkuCount,
  happyHourActive = false,
}: Props) {
  const rating = vendor.average_rating > 0 ? vendor.average_rating : null;
  const reviews = vendor.total_reviews > 0 ? vendor.total_reviews : null;
  const theme = resolveStoreListingCardTheme(vendor);

  return (
    <VendorSkuCardFrame
      theme={theme}
      className={cn(
        "group min-w-0 overflow-hidden shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-green-600/45 hover:shadow-lg hover:shadow-black/30",
        featured && discoverFeaturedStripCardClass,
        className
      )}
    >
      <Link
        href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })}
        className={cn(
          "relative z-[1] block text-inherit no-underline",
          featured ? "p-2.5 sm:p-4" : "p-3 sm:p-4"
        )}
      >
        <div className="flex gap-2 sm:gap-3">
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-950",
              featured
                ? "h-10 w-10 min-h-10 min-w-10 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11"
                : "h-10 w-10 min-h-10 min-w-10"
            )}
          >
            {vendor.logo_url ? (
              <OptimizedImg
                src={vendor.logo_url}
                alt=""
                className="h-full w-full object-contain object-center"
                preset="logo"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                {(vendor.business_name.trim().charAt(0) || "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <h3
                className={cn(
                  "min-w-0 flex-1 break-words font-semibold leading-snug text-white group-hover:text-green-200",
                  featured
                    ? "max-sm:line-clamp-none max-sm:text-sm sm:line-clamp-2 sm:text-base"
                    : "line-clamp-3 sm:line-clamp-2"
                )}
              >
                {vendor.business_name}
              </h3>
              {happyHourActive ? (
                <span className="shrink-0 pt-0.5">
                  <span className="rounded-full border border-red-500/30 bg-red-600/15 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                    Happy hour
                  </span>
                </span>
              ) : null}
              {vendor.social_equity_badge_visible ? (
                <span className="shrink-0 pt-0.5">
                  <SocialEquityBadge className="text-[10px]" />
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-400",
                featured ? "max-sm:text-[0.6875rem] sm:text-xs" : "text-xs"
              )}
            >
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {rating != null ? (
                  <>
                    <span className="font-medium text-gray-200">{rating.toFixed(1)}</span>
                    {reviews != null && <span>({reviews})</span>}
                  </>
                ) : (
                  <span className="font-medium text-gray-300">New</span>
                )}
              </span>
              <span className="text-gray-600">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {vendor.average_delivery_time} min
              </span>
              {vendor.minimum_order > 0 && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden />${vendor.minimum_order} min
                  </span>
                </>
              )}
            </div>
            {distanceMi != null && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" aria-hidden />
                {distanceMi.toFixed(1)} mi
              </p>
            )}
            {liveSkuCount != null && liveSkuCount > 0 && (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 font-medium text-emerald-400/95",
                  featured ? "text-[0.6875rem] sm:text-xs" : "text-xs"
                )}
              >
                <ShoppingBag className="h-3 w-3 shrink-0" aria-hidden />
                {liveSkuCount} in stock · live menu
              </p>
            )}
            <p
              className={cn(
                "mt-2 text-gray-400",
                featured
                  ? "line-clamp-2 text-xs max-sm:leading-snug sm:line-clamp-1 sm:text-sm"
                  : "line-clamp-2 text-sm sm:line-clamp-1"
              )}
            >
              {oneLiner(vendor)}
            </p>
            <p
              className={cn(
                "mt-1 text-gray-500",
                featured ? "max-sm:text-[0.625rem] sm:text-xs" : "text-xs"
              )}
            >
              {isOpen ? (
                <span className="text-emerald-400">Open now</span>
              ) : (
                <span className="text-gray-500">Closed</span>
              )}
            </p>
          </div>
        </div>
      </Link>
    </VendorSkuCardFrame>
  );
}
