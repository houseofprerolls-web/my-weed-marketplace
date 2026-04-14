'use client';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Small mark for SKUs sourced from the Treehouse brand catalog (master `catalog_products`). */
export function TreehouseCatalogVerifiedBadge({ className, size = 'sm' }: Props) {
  const dim = size === 'md' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div
      className={cn(
        'pointer-events-none rounded-md bg-black/55 p-0.5 shadow-md ring-1 ring-white/15 backdrop-blur-[2px]',
        className
      )}
      title="Treehouse verified — brand catalog"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/datreehouse-logo.png"
        alt=""
        className={cn(dim, 'object-contain')}
        width={size === 'md' ? 32 : 24}
        height={size === 'md' ? 32 : 24}
      />
    </div>
  );
}
