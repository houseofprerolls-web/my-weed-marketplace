'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useRole } from '@/hooks/useRole';
import { SITE_NAME } from '@/lib/brand';
import { Check, Sparkles, TrendingUp, MapPin, LayoutGrid } from 'lucide-react';

function hasApprovedLicense(
  vendors: { license_status: string }[]
): boolean {
  return vendors.some((v) => String(v.license_status || '').toLowerCase() === 'approved');
}

const TIERS = [
  {
    id: 'premium',
    title: 'Premium visibility',
    icon: Sparkles,
    accent: 'from-amber-500/20 to-transparent border-amber-500/30',
    badge: 'Top tier',
    items: [
      { name: 'Homepage hero banner', price: 350 },
      { name: 'Smokers Club banner', price: 300 },
      { name: 'Deals page — top placement', price: 300 },
    ],
  },
  {
    id: 'mid',
    title: 'High-traffic placements',
    icon: TrendingUp,
    accent: 'from-brand-lime/15 to-transparent border-brand-lime/25',
    badge: 'Mid tier',
    items: [
      { name: 'Map — featured placement', price: 300 },
      { name: 'Feed placement', price: 300 },
      { name: 'Discover page placement', price: 250 },
    ],
  },
  {
    id: 'entry',
    title: 'Supporting placement',
    icon: MapPin,
    accent: 'from-zinc-500/15 to-transparent border-zinc-600/30',
    badge: 'Entry tier',
    items: [{ name: 'Bottom placement — site rotation', price: 150 }],
  },
] as const;

const BUNDLES = [
  {
    name: 'Growth',
    price: 750,
    save: 50,
    includes: ['Discover page placement', 'Feed placement', 'Bottom placement (rotation)'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 1200,
    save: 100,
    includes: ['Homepage hero banner', 'Deals page — top placement', 'Map — featured placement'],
    highlight: true,
  },
  {
    name: 'Dominance',
    price: 1800,
    save: null as number | null,
    includes: [
      'Homepage hero banner',
      'Smokers Club banner',
      'Deals page — top placement',
      'Feed placement',
      'Map — featured placement',
    ],
    highlight: false,
  },
] as const;

export default function VendorAdvertisingPricingPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { ownedVendors, loading: vendorLoading } = useVendorBusiness();
  const loading = roleLoading || vendorLoading;
  const allowed = isAdmin || hasApprovedLicense(ownedVendors);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background px-4 py-20">
        <Card className="mx-auto max-w-lg border-zinc-800 bg-zinc-950/80 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Approved vendors only</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Advertising and placement rates are available once your shop is license-approved on {SITE_NAME}. If you
            believe this is a mistake, contact support.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="border-zinc-600 text-white hover:bg-zinc-900">
              <Link href="/vendor/onboarding">Apply or complete onboarding</Link>
            </Button>
            <Button asChild className="bg-brand-lime text-black hover:bg-brand-lime-soft">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-brand-red/20 bg-gradient-to-b from-green-950/40 to-black">
        <div className="container mx-auto max-w-4xl px-4 py-14 text-center">
          <Badge className="mb-4 border-brand-lime/40 bg-brand-lime/10 text-brand-lime-soft">For approved partners</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Advertising &amp; placement packages
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-14">
        <div className="mb-4 flex items-center gap-2 text-zinc-400">
          <LayoutGrid className="h-5 w-5 text-brand-lime" aria-hidden />
          <h2 className="text-lg font-semibold text-white">À la carte placements</h2>
        </div>
        <div className="grid gap-8">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.id}
                className={`overflow-hidden border bg-gradient-to-br from-zinc-950 to-black p-0 ${tier.accent}`}
              >
                <div className="border-b border-white/5 bg-black/40 px-5 py-4 md:flex md:items-center md:justify-between md:px-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <Icon className="h-5 w-5 text-brand-lime" aria-hidden />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{tier.title}</h3>
                        <Badge variant="outline" className="border-zinc-600 text-[10px] uppercase tracking-wide text-zinc-400">
                          {tier.badge}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="divide-y divide-white/5">
                  {tier.items.map((item) => (
                    <li key={item.name} className="flex flex-col gap-1 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{item.name}</p>
                      </div>
                      <p className="shrink-0 text-xl font-bold text-brand-lime-soft md:text-right">${item.price}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mt-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">Bundle options</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {BUNDLES.map((b) => (
              <Card
                key={b.name}
                className={`flex flex-col border bg-gradient-to-b from-zinc-900/90 to-black p-6 ${
                  b.highlight ? 'border-brand-lime/50 ring-1 ring-brand-lime/20' : 'border-zinc-800'
                }`}
              >
                {b.highlight ? (
                  <Badge className="mb-3 w-fit bg-brand-lime text-black hover:bg-brand-lime-soft">Popular</Badge>
                ) : null}
                <h3 className="text-xl font-bold text-white">{b.name}</h3>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-brand-lime-soft">${b.price}</span>
                  <span className="text-sm text-zinc-500">/ month</span>
                </p>
                {b.save != null ? (
                  <p className="mt-2 text-xs font-medium text-emerald-400/90">Save ${b.save} vs à la carte</p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-amber-400/90">Full-funnel package</p>
                )}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-300">
                  {b.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full bg-brand-lime text-black hover:bg-brand-lime-soft">
                  <Link href="/vendor/advertising">Book or manage placements</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
