import Image from 'next/image';
import { cn } from '@/lib/utils';
import { TREEHOUSE_CAROUSEL_LOGO_URL } from '@/lib/treehouseCarouselAsset';

const CLUB_BAND =
  'linear-gradient(135deg, rgba(180,83,9,0.26) 0%, rgba(9,9,11,0.94) 38%, rgba(245,158,11,0.1) 52%, rgba(9,9,11,0.96) 100%)';

type Props = {
  className?: string;
  /** Tighter motif for small hero chips vs larger tiles. */
  variant?: 'chip' | 'tile';
};

/**
 * Smokers Club / Da Treehouse stage treatment: warm band + brand glow + watermark logo.
 */
export function DaTreehouseCategoryCardBackdrop({ className, variant = 'chip' }: Props) {
  const logoWrap =
    variant === 'chip'
      ? 'right-0 top-1/2 h-11 w-11 -translate-y-1/2 sm:h-[3.35rem] sm:w-[3.35rem]'
      : '-right-6 top-1/2 h-40 w-40 -translate-y-1/2 sm:-right-4 sm:h-48 sm:w-48';

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]', className)}
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-club-band opacity-[0.92]"
        style={{ backgroundImage: CLUB_BAND }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_85%_at_50%_-25%,rgba(229,9,20,0.16),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_100%_45%,rgba(184,242,58,0.07),transparent_52%)]" />
      <div
        className={cn(
          'pointer-events-none absolute',
          variant === 'chip' ? 'opacity-[0.14] sm:opacity-[0.16]' : 'opacity-[0.11] sm:opacity-[0.13]',
          logoWrap
        )}
      >
        <Image
          src={TREEHOUSE_CAROUSEL_LOGO_URL}
          alt=""
          fill
          className="object-contain object-right drop-shadow-[0_0_14px_rgba(245,158,11,0.12)]"
          sizes={variant === 'chip' ? '54px' : '200px'}
        />
      </div>
      <div
        className={cn(
          'absolute inset-0 rounded-[inherit]',
          variant === 'chip'
            ? 'bg-gradient-to-r from-black/70 via-black/35 to-black/55'
            : 'bg-gradient-to-t from-black/80 via-black/30 to-black/45'
        )}
      />
    </div>
  );
}
