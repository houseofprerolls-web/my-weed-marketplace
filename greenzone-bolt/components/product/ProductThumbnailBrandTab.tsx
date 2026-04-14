'use client';

import Link from 'next/link';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  /** When the card has a bottom sale strip, lift this tab so both show. */
  liftForBottomOverlay?: boolean;
  className?: string;
};

/** Small “brand” strip on product thumbnails (public menu, vendor grid, cart). */
export function ProductThumbnailBrandTab({ label, liftForBottomOverlay, className }: Props) {
  const text = label.trim() || 'Shop';
  return (
    <div
      className={cn(
        'pointer-events-none absolute left-0 right-0 z-[2] flex justify-center px-1',
        liftForBottomOverlay ? 'bottom-9' : 'bottom-0',
        className
      )}
    >
      <div className="flex max-w-full items-center gap-1 truncate rounded-t-md bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100/95 ring-1 ring-amber-500/25 backdrop-blur-sm">
        <Tag className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
        <span className="truncate">{text}</span>
      </div>
    </div>
  );
}

type ChipProps = {
  label: string;
  className?: string;
  /** When set, chip links to the public brand showcase (e.g. verified catalog brand). */
  href?: string;
  /** e.g. `_top` when the menu is iframed on a third-party storefront */
  linkTarget?: React.HTMLAttributeAnchorTarget;
};

/** Brand label on the card body (not over the photo). */
export function ProductBrandCardChip({ label, className, href, linkTarget }: ChipProps) {
  const text = label.trim() || 'Shop';
  const cls = cn(
    'inline-flex max-w-full items-center gap-1 truncate rounded-md bg-amber-950/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-100/95 ring-1 ring-amber-500/35',
    href && 'transition hover:bg-amber-900/55 hover:ring-amber-400/50',
    className
  );
  const inner = (
    <>
      <Tag className="h-2.5 w-2.5 shrink-0 text-amber-400/90" aria-hidden />
      <span className="truncate">{text}</span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        target={linkTarget}
        rel={linkTarget === '_top' ? 'noopener noreferrer' : undefined}
        className={cls}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
