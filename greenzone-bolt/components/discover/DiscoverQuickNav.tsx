'use client';

import Link from 'next/link';
import {
  History,
  LayoutGrid,
  Map,
  MapPin,
  Percent,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#discover-recent-heading', label: 'Recent', icon: History },
  { href: '#discover-delivery-heading', label: 'Delivery', icon: Truck },
  { href: '#discover-storefront-heading', label: 'Walk-in', icon: Store },
  { href: '#discover-deals-heading', label: 'Deals', icon: Percent },
  { href: '#discover-smokers-heading', label: 'Club', icon: Sparkles },
  { href: '#discover-nearest-heading', label: 'Nearby', icon: MapPin },
  { href: '#discover-live-menu-heading', label: 'Live menu', icon: ShoppingBag },
  { href: '#discover-all-stores-heading', label: 'Directory', icon: LayoutGrid },
] as const;

type Props = {
  vendorsMode: boolean;
  loading: boolean;
  className?: string;
};

export function DiscoverQuickNav({ vendorsMode, loading, className }: Props) {
  if (loading || !vendorsMode) return null;

  return (
    <nav
      aria-label="Jump to section"
      className={cn(
        // Below full site header: mobile adds chip row + utility strip (not just h-14).
        'sticky top-[13rem] z-40 border-b border-white/[0.06] bg-black/75 backdrop-blur-md shadow-[0_6px_24px_-10px_rgba(0,0,0,0.85)] sm:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.85)] md:top-32',
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-1 sm:gap-3 sm:py-2.5">
          <p className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:block">
            Jump to
          </p>
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-px pt-px sm:gap-1.5 sm:pb-0.5 sm:pt-0.5',
              '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            )}
          >
            {LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-zinc-900/80 px-2 py-1 text-[10px] font-medium text-zinc-300 transition sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]',
                  'hover:border-emerald-500/35 hover:bg-emerald-950/40 hover:text-white',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime/50'
                )}
              >
                <Icon className="h-3 w-3 text-brand-lime/85 sm:h-3.5 sm:w-3.5" aria-hidden />
                {label}
              </a>
            ))}
            <Link
              href="/map"
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-red/25 bg-brand-red/10 px-2 py-1 text-[10px] font-semibold text-red-100/95 transition sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]',
                'hover:border-brand-red/45 hover:bg-brand-red/20'
              )}
            >
              <Map className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
              Map
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
