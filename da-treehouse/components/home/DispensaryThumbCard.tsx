"use client";

import Link from "next/link";
import { useState } from "react";
import type { VendorMarker } from "@/components/catalog/VendorMap";

function distanceLabel(miles: number | null | undefined) {
  if (miles == null || !Number.isFinite(miles)) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4 21V10.5l1.7-5.1A2 2 0 0 1 7.6 4h8.8a2 2 0 0 1 1.9 1.4L20 10.5V21h-6v-6H10v6H4Zm2-2h2v-6h8v6h2v-8.5l-1.3-4H7.3L6 10.5V19Zm2-8h8v-2H8v2Zm0-4h8V7H8v2Z" />
    </svg>
  );
}

function formatLocality(v: VendorMarker) {
  const parts = [v.city, v.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "California";
}

/**
 * Marketplace tile: square art, overlays, tight type — inspired by directory UIs,
 * anchored to DaTreehouse brand (crisp, not oversized).
 */
export function DispensaryThumbCard({
  vendor,
  selected,
  onSelect,
  badge,
  serviceType = "storefront",
}: {
  vendor: VendorMarker;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  /** Storefront vs delivery badge on the tile */
  serviceType?: "storefront" | "delivery";
}) {
  const [favorited, setFavorited] = useState(false);
  const src = vendor.logoUrl || vendor.mapMarkerImageUrl;
  const dist = distanceLabel(vendor.distanceMiles);

  return (
    <article
      className={[
        "group w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all duration-200",
        selected
          ? "border-[var(--brand-red)] ring-2 ring-[var(--brand-red)]/25 shadow-md"
          : "border-neutral-200/90 hover:border-neutral-300 hover:shadow-md",
      ].join(" ")}
    >
      <div className="relative aspect-square w-full bg-neutral-100">
        <button
          type="button"
          onClick={onSelect}
          className="absolute inset-0 z-10 cursor-pointer rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)] focus-visible:ring-offset-2"
          aria-pressed={selected}
          aria-label={`Select ${vendor.name} for menu`}
        />
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <div className="pointer-events-none flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-green)]/15 to-neutral-200">
            <span className="font-display text-3xl font-semibold text-[var(--brand-green)]">
              {vendor.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFavorited((x) => !x);
          }}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-600 shadow-md backdrop-blur-sm transition hover:scale-105 hover:text-[var(--brand-red)]"
          aria-label={favorited ? "Remove from saved" : "Save dispensary"}
        >
          <HeartIcon
            filled={favorited}
            className={favorited ? "h-4 w-4 text-[var(--brand-red)]" : "h-4 w-4"}
          />
        </button>

        <div
          className={[
            "absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md",
            serviceType === "delivery"
              ? "bg-amber-500"
              : "bg-teal-600",
          ].join(" ")}
          title={serviceType === "delivery" ? "Delivery" : "Storefront"}
        >
          {serviceType === "delivery" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M5 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm12 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm.5-3H7.8l-1-5H19V8h-2.2l-2-4H5V4H3v2h1l3 12h12v-2Z" />
            </svg>
          ) : (
            <StorefrontIcon className="h-4 w-4" />
          )}
        </div>

        {badge ? (
          <span className="absolute left-2 top-2 z-20 rounded bg-[var(--brand-red)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="space-y-1 px-2.5 pb-1 pt-2">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-tight tracking-tight text-neutral-900">
          {vendor.name}
        </h3>
        <p className="text-[11px] font-medium text-neutral-500">
          Med + Rec · {formatLocality(vendor)}
        </p>
        <p className="text-[11px] tabular-nums text-neutral-600">
          <span className="text-amber-500">★</span>
          <span className="ml-0.5 font-medium text-neutral-800">New</span>
          {dist ? (
            <span className="text-neutral-400"> · {dist}</span>
          ) : null}
        </p>
      </div>

      <div className="px-2.5 pb-2.5">
        <Link
          href={`/vendors/${vendor.slug}`}
          className="relative z-20 inline-flex text-[11px] font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Shop menu
        </Link>
      </div>
    </article>
  );
}
