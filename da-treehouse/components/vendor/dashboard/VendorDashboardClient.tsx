"use client";

import Link from "next/link";
import { useState } from "react";
import { VendorBrandingPanel } from "@/components/vendor/dashboard/VendorBrandingPanel";
import { VendorProductsPanel } from "@/components/vendor/dashboard/VendorProductsPanel";
import { VendorDealsPanel } from "@/components/vendor/dashboard/VendorDealsPanel";
import { VendorOrdersPanel } from "@/components/vendor/dashboard/VendorOrdersPanel";
import { Button } from "@/components/ui/button";

type Section = "products" | "deals" | "orders";

export function VendorDashboardClient({
  vendorId,
  vendorName,
  vendorSlug,
  licenseStatus,
  isLive,
  logoUrl,
  bannerUrl,
  mapMarkerUrl,
}: {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  licenseStatus: string;
  isLive: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  mapMarkerUrl: string | null;
}) {
  const [section, setSection] = useState<Section>("products");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">
            Your treehouse dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>{vendorName}</strong> · slug{" "}
            <code className="text-xs">{vendorSlug}</code>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            License: <span className="uppercase">{licenseStatus}</span>
            {" · "}
            {isLive ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Live on catalog
              </span>
            ) : (
              <span>
                Not live — products won&apos;t appear publicly until an admin
                marks your shop live.
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendor/hub">Vendor Hub</Link>
          </Button>
          {isLive && licenseStatus === "approved" ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/vendors/${vendorSlug}`}>Public storefront</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b pb-3">
        {(
          [
            ["products", "Products"],
            ["deals", "Deals"],
            ["orders", "Orders"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={section === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setSection(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mb-8">
        <VendorBrandingPanel
          vendorId={vendorId}
          initialLogoUrl={logoUrl}
          initialBannerUrl={bannerUrl}
          initialMarkerUrl={mapMarkerUrl}
        />
      </div>

      {section === "products" ? (
        <VendorProductsPanel vendorId={vendorId} />
      ) : null}
      {section === "deals" ? <VendorDealsPanel vendorId={vendorId} /> : null}
      {section === "orders" ? <VendorOrdersPanel vendorId={vendorId} /> : null}
    </div>
  );
}
