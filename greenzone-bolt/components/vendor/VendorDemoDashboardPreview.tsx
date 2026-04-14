'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ShoppingBag, Sparkles, Store, TrendingUp } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';

/**
 * Shown to vendor-role accounts with no linked `vendors` row so they can explore the UI before onboarding.
 */
export function VendorDemoDashboardPreview() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-gray-950 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge className="mb-2 border-amber-400/40 bg-amber-500/15 text-amber-200">Preview mode</Badge>
            <h2 className="text-xl font-semibold text-white">Explore the vendor dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">
              You signed up as a vendor but no store is linked to your account yet. The numbers below are{' '}
              <span className="text-white">sample data</span> so you can see how {SITE_NAME} organizes orders,
              menu, and analytics before your kickoff call.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-brand-lime text-black hover:bg-brand-lime-soft"
          >
            <Link href="/vendor/onboarding?from=vendor_dashboard_preview">List your business</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          After you submit the application, our team can approve your listing and link it to this login.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '30-day revenue (demo)', value: '$12,480', icon: TrendingUp },
          { label: 'Open orders (demo)', value: '8', icon: ShoppingBag },
          { label: 'Menu SKUs (demo)', value: '142', icon: Store },
          { label: 'Profile views (demo)', value: '3.2k', icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="border-green-900/25 bg-gray-900/60 p-5 opacity-95 ring-1 ring-dashed ring-green-700/20"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
              <Icon className="h-4 w-4 text-green-500/70" aria-hidden />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-green-900/20 bg-gray-900/40 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-green-400" aria-hidden />
            What you&apos;ll get when live
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-400">
            <li>Live menu, deals, and order tools tied to your real store</li>
            <li>Analytics scoped to your locations (or combined if you run several)</li>
            <li>Reviews, hours, and Smokers Club options where enabled</li>
          </ul>
        </Card>
        <Card className="border-green-900/20 bg-gray-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">Next step</h3>
          <p className="mt-2 text-sm text-gray-400">
            Complete the <span className="text-gray-200">List your business</span> form with your license and service
            ZIP. You&apos;ll hear from us shortly, and after approval your real dashboard replaces this preview.
          </p>
          <Button asChild variant="outline" className="mt-4 border-green-700/50 text-green-200 hover:bg-green-950/50">
            <Link href="/vendor/onboarding?from=vendor_demo_next">Go to application</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
