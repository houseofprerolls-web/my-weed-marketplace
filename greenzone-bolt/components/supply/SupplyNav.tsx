'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { Home, LayoutGrid, Inbox, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SUPPLY_RESERVED = new Set(['directory', 'rfq', 'rfqs', 'orders', 'listing']);

function isSupplierSlugPath(p: string): boolean {
  const m = p.match(/^\/vendor\/supply\/([^/]+)$/);
  if (!m) return false;
  return !SUPPLY_RESERVED.has(m[1]!);
}

const items: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/vendor/supply', label: 'Home', icon: Home, match: (p) => p === '/vendor/supply' },
  {
    href: '/vendor/supply/directory',
    label: 'Browse suppliers',
    icon: LayoutGrid,
    match: (p) => p.startsWith('/vendor/supply/directory') || p.startsWith('/vendor/supply/listing/') || isSupplierSlugPath(p),
  },
  {
    href: '/vendor/supply/rfqs',
    label: 'My RFQs',
    icon: Inbox,
    match: (p) => p.startsWith('/vendor/supply/rfq'),
  },
  {
    href: '/vendor/supply/orders',
    label: 'Orders',
    icon: ShoppingCart,
    match: (p) => p.startsWith('/vendor/supply/orders'),
  },
];

type Props = { adminMenuVendorId: string | null | undefined };

export function SupplyNav({ adminMenuVendorId }: Props) {
  const pathname = usePathname();
  const pathNoQuery = pathname.split('?')[0] ?? pathname;
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  return (
    <nav className="flex flex-col gap-1 border-b border-sky-900/30 pb-4 md:w-52 md:shrink-0 md:border-b-0 md:border-r md:pr-4 md:pb-0">
      <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-sky-500/90 md:block">
        Supply marketplace
      </p>
      {items.map((item) => {
        const active = item.match(pathNoQuery);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={q(item.href)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'bg-sky-600/25 text-sky-100 ring-1 ring-sky-500/40'
                : 'text-zinc-400 hover:bg-sky-950/40 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
