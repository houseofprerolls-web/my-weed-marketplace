'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { skuCardPresetShellClass, type ResolvedSkuCardTheme } from '@/lib/vendorSkuCardTheme';

type Props = {
  theme: ResolvedSkuCardTheme;
  className?: string;
  children: ReactNode;
};

/** Full-bleed optional background for vendor SKU cards (menu + listing). */
export function VendorSkuCardFrame({ theme, className, children }: Props) {
  const { preset, backgroundUrl, overlayOpacity } = theme;
  const shell = skuCardPresetShellClass(preset);
  const bg = backgroundUrl?.trim() ?? '';

  return (
    <div
      className={cn(
        'relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-sm transition-colors',
        shell,
        className
      )}
    >
      {bg ? (
        <>
          {/* img + object-cover paints reliably on mobile Safari vs. CSS background-image on empty divs */}
          {/* eslint-disable-next-line @next/next/no-img-element -- remote vendor art */}
          <img
            src={bg}
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover [transform:translateZ(0)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-background"
            style={{ opacity: overlayOpacity / 100 }}
            aria-hidden
          />
        </>
      ) : null}
      <div className="relative z-[1] flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
