'use client';

import { cn } from '@/lib/utils';

type Props = {
  label: string;
  className?: string;
};

/** Bottom “tab” strip on product thumbnails: Brand · {name or store}. */
export function ProductThumbnailBrandTab({ label, className }: Props) {
  const t = String(label || '').trim() || 'Shop';
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-0 left-0 right-0 z-[1] border-t border-white/15 bg-black/80 px-1.5 py-1 backdrop-blur-[2px]',
        className
      )}
    >
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-white/75">
        Brand · <span className="font-medium normal-case tracking-normal text-green-300/95">{t}</span>
      </p>
    </div>
  );
}
