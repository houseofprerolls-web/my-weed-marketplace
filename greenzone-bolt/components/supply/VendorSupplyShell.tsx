'use client';

import Link from 'next/link';
import { SupplyNav } from '@/components/supply/SupplyNav';
import { VendorMarketplaceToggle } from '@/components/supply/VendorMarketplaceToggle';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';

export function VendorSupplyShell({ children }: { children: React.ReactNode }) {
  const adminMenuVendorId = useAdminMenuVendorOverride();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-sky-950/25 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-sky-900/35 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-sky-200">Supply marketplace</span>
            <VendorMarketplaceToggle adminMenuVendorId={adminMenuVendorId} variant="header" />
          </div>
          <Link
            href={withAdminVendorQuery('/vendor/dashboard', adminMenuVendorId)}
            className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            Store dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-start md:py-8">
        <SupplyNav adminMenuVendorId={adminMenuVendorId} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
