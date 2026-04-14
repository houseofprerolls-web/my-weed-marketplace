'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number;
  className?: string;
  starClassName?: string;
  /** md: 16px stars, sm: 12px */
  size?: 'sm' | 'md';
  showNumeric?: boolean;
  numericClassName?: string;
  reviewCount?: number | null;
  reviewsClassName?: string;
};

export function StrainStarAverage({
  value,
  className,
  starClassName,
  size = 'md',
  showNumeric = true,
  numericClassName,
  reviewCount,
  reviewsClassName,
}: Props) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  const sz = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const label = `${v.toFixed(1)} out of 5 stars`;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-0.5" role="img" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sz,
              star <= v ? 'fill-amber-400 text-amber-400' : 'text-zinc-600',
              starClassName
            )}
          />
        ))}
      </div>
      {showNumeric ? (
        <span className={cn('font-semibold tabular-nums text-white', numericClassName)}>{v.toFixed(1)}</span>
      ) : null}
      {reviewCount != null ? (
        <span className={cn('text-sm text-gray-400', reviewsClassName)}>
          ({reviewCount.toLocaleString()} reviews)
        </span>
      ) : null}
    </div>
  );
}
