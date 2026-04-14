'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/useRole';
import { ShoppingBag, LayoutGrid, Sparkles, Percent, AlertCircle } from 'lucide-react';

const links = [
  {
    href: '/admin/marketplace-deals',
    title: 'Marketplace deals',
    description: 'Featured slots and visibility on the public deals page.',
    icon: Percent,
  },
  {
    href: '/admin/placements',
    title: 'Placements',
    description: 'Premium placements and ordering tools.',
    icon: LayoutGrid,
  },
  {
    href: '/admin/smokers-club',
    title: 'Smokers Club',
    description: 'Tree ladder, Discover strips, and club placements.',
    icon: Sparkles,
  },
];

export default function AdminMarketplaceHubPage() {
  const { isAdmin, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-6">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-lg font-semibold text-white">Access denied</h1>
          <p className="mt-2 text-sm text-zinc-400">Admin only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-sm text-zinc-400">Deals, placements, and Smokers Club merchandising.</p>
        </div>
      </div>
      <ul className="space-y-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                      <h2 className="font-semibold text-white">{item.title}</h2>
                      <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-600">
                    <Link href={item.href}>Open</Link>
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
