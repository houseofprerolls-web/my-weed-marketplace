"use client";

import { cn } from "@/lib/utils";
import { discoverFeaturedStripCardClass } from "@/components/discover/discoverFeaturedStrip";

export function DiscoverStoreCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-green-900/25 bg-gray-900/50 shadow-sm",
        featured ? "p-2.5 sm:p-4" : "p-3 sm:p-4",
        featured && discoverFeaturedStripCardClass
      )}
    >
      <div className="flex gap-2 sm:gap-3">
        <div
          className={cn(
            "shrink-0 rounded-lg bg-gray-800",
            featured ? "h-10 w-10 sm:h-11 sm:w-11" : "h-10 w-10"
          )}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-800" />
          <div className="h-3 w-full rounded bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export function DiscoverPageSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <DiscoverStoreCardSkeleton key={i} />
      ))}
    </div>
  );
}
