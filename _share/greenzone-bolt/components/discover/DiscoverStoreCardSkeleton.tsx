"use client";

import { cn } from "@/lib/utils";

export function DiscoverStoreCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-green-900/25 bg-gray-900/50 p-4 shadow-sm",
        featured &&
          "w-[280px] max-w-[calc(100vw-3rem)] shrink-0 snap-start snap-always flex-none sm:max-w-[280px]"
      )}
    >
      <div className="flex gap-3">
        <div className={cn("shrink-0 rounded-xl bg-gray-800", featured ? "h-16 w-16" : "h-14 w-14")} />
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
