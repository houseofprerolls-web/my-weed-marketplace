"use client";

import Link from "next/link";
import { MapPin, Star, Clock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveryVendor } from "@/lib/publicVendors";

type Props = {
  vendor: DiscoveryVendor;
  distanceMi?: number;
  isOpen?: boolean;
  /** Larger padding / image for featured strip */
  featured?: boolean;
  className?: string;
};

function oneLiner(v: DiscoveryVendor): string {
  const parts: string[] = [];
  if (v.offers_delivery && v.offers_pickup) parts.push("Delivery & pickup");
  else if (v.offers_delivery) parts.push("Delivery");
  else if (v.offers_pickup) parts.push("Pickup");
  if (v.city) parts.push(`${v.city}, ${v.state}`);
  return parts.length ? parts.join(" · ") : "Cannabis retailer";
}

export function DiscoverStoreCard({
  vendor,
  distanceMi,
  isOpen = true,
  featured = false,
  className,
}: Props) {
  const rating = vendor.average_rating > 0 ? vendor.average_rating : null;
  const reviews = vendor.total_reviews > 0 ? vendor.total_reviews : null;

  return (
    <Link
      href={`/listing/${vendor.id}`}
      className={cn(
        "group block min-w-0 rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 shadow-sm transition-all duration-200",
        "hover:border-green-600/45 hover:bg-gray-900/70 hover:shadow-md",
        featured &&
          "w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none sm:max-w-[280px]",
        className
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl bg-gray-950 ring-1 ring-green-900/30",
            featured ? "h-16 w-16 min-h-16 min-w-16" : "h-14 w-14"
          )}
        >
          {vendor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.logo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
              {vendor.business_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug text-white group-hover:text-green-200">
            {vendor.business_name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
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
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                  ${vendor.minimum_order} min
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
          <p className="mt-2 line-clamp-1 text-sm text-gray-400">{oneLiner(vendor)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {isOpen ? (
              <span className="text-emerald-400">Open now</span>
            ) : (
              <span className="text-gray-500">Closed</span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
