"use client";

import Link from "next/link";
import { Percent, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { discoverFeaturedStripCardClass } from "@/components/discover/discoverFeaturedStrip";
import { listingHrefForVendor } from "@/lib/listingPath";

type Props = {
  title: string;
  discountPercent: number;
  imageUrl?: string | null;
  vendorDisplayName: string;
  vendorId?: string | null;
  vendorSlug?: string | null;
  socialEquityBadge?: boolean;
  /** Horizontal discover strip layout + width */
  featured?: boolean;
  className?: string;
};

export function DiscoverDealCard({
  title,
  discountPercent,
  imageUrl,
  vendorDisplayName,
  vendorId,
  vendorSlug,
  socialEquityBadge = false,
  featured = false,
  className,
}: Props) {
  const img = (imageUrl || '').trim();
  return (
    <Card
      className={cn(
        "border-green-900/25 bg-gray-900/50 shadow-sm transition hover:border-green-600/40",
        featured ? "p-2.5 sm:p-4" : "p-3 sm:p-4",
        featured && discoverFeaturedStripCardClass,
        className
      )}
    >
      <div className="flex gap-2 sm:gap-3">
        {img ? (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-950">
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-red-300">
            <Percent className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "break-words font-semibold leading-snug text-white",
              featured
                ? "max-sm:line-clamp-none max-sm:text-sm sm:line-clamp-2 sm:text-base"
                : "line-clamp-2"
            )}
          >
            {title}
          </p>
          <Badge className="mt-2 bg-brand-lime/15 text-brand-lime-soft border-brand-lime/30">
            {discountPercent}% off
          </Badge>
          <div
            className={cn(
              "mt-2 flex flex-wrap items-start gap-x-2 gap-y-1 text-zinc-300",
              featured ? "max-sm:text-[0.6875rem] sm:text-xs" : "text-xs"
            )}
          >
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span
              className={cn(
                "min-w-0 flex-1 break-words leading-snug",
                featured ? "max-sm:line-clamp-none sm:line-clamp-2" : "truncate"
              )}
            >
              {vendorDisplayName}
            </span>
            {socialEquityBadge ? (
              <span className="shrink-0">
                <Badge variant="outline" className="border-amber-600/40 text-[10px] text-amber-100">
                  Social equity
                </Badge>
              </span>
            ) : null}
          </div>
          {vendorId ? (
            <Button
              asChild
              size="sm"
              className="mt-3 w-full bg-green-700 text-white hover:bg-green-600 sm:w-auto"
            >
              <Link href={listingHrefForVendor({ id: vendorId, slug: vendorSlug })}>View shop</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function DiscoverDealCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <Card
      className={cn(
        "animate-pulse border-green-900/25 bg-gray-900/50 shadow-sm",
        featured ? "p-2.5 sm:p-4" : "p-3 sm:p-4",
        featured && discoverFeaturedStripCardClass
      )}
    >
      <div className="flex gap-2 sm:gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-full rounded bg-gray-700" />
          <div className="h-5 w-16 rounded bg-gray-800" />
          <div className="h-3 w-3/4 rounded bg-gray-800" />
          <div className="h-8 w-full rounded bg-gray-800 sm:h-9 sm:w-24" />
        </div>
      </div>
    </Card>
  );
}
