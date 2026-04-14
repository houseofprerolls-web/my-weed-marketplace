'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';

type Props = {
  adminMenuVendorId?: string | null;
  /** Slightly larger padding when used in supply shell header */
  variant?: 'compact' | 'header';
};

export function VendorMarketplaceToggle({ adminMenuVendorId, variant = 'compact' }: Props) {
  const pathname = usePathname();
  const q = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);
  const inSupply = pathname.startsWith('/vendor/supply');

  const base =
    variant === 'header'
      ? 'inline-flex rounded-lg border border-sky-900/50 bg-sky-950/30 p-1'
      : 'inline-flex rounded-md border border-zinc-700 bg-zinc-900/80 p-0.5';

  return (
    <div className={base} role="group" aria-label="Marketplace">
      <Link
        href={q('/vendor/dashboard')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:text-sm',
          !inSupply ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white',
          variant === 'header' && !inSupply && 'bg-sky-800/80 text-sky-50'
        )}
      >
        Store
      </Link>
      <Link
        href={q('/vendor/supply')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:text-sm',
          inSupply ? 'bg-sky-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white',
          variant === 'header' && inSupply && 'bg-sky-500 text-white'
        )}
      >
        Suppliers
      </Link>
    </div>
  );
}
