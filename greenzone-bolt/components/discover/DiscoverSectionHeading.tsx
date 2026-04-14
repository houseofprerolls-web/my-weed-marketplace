'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiscoverSectionAccent =
  | 'club'
  | 'forest'
  | 'blaze'
  | 'iris'
  | 'mint'
  | 'ocean'
  | 'slate';

const ACCENT = {
  club: {
    orb: 'bg-amber-500/30',
    pill: 'border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-lime-950/25 text-amber-100/95 shadow-[0_0_24px_-8px_rgba(245,158,11,0.45)]',
    title:
      'bg-gradient-to-r from-amber-100 via-yellow-50 to-lime-300 bg-clip-text text-transparent drop-shadow-[0_1px_12px_rgba(250,204,21,0.15)]',
    bar: 'from-amber-400 via-yellow-300 to-lime-400',
  },
  forest: {
    orb: 'bg-emerald-500/25',
    pill: 'border-emerald-500/25 bg-emerald-950/45 text-emerald-100/95 shadow-[0_0_20px_-6px_rgba(52,211,153,0.35)]',
    title:
      'bg-gradient-to-r from-emerald-200 via-brand-lime-soft to-teal-200 bg-clip-text text-transparent drop-shadow-[0_1px_14px_rgba(52,211,153,0.12)]',
    bar: 'from-emerald-400 via-brand-lime to-teal-500',
  },
  blaze: {
    orb: 'bg-red-500/20',
    pill: 'border-red-500/30 bg-red-950/40 text-red-100/95',
    title:
      'bg-gradient-to-r from-orange-100 via-rose-100 to-red-300 bg-clip-text text-transparent',
    bar: 'from-brand-red via-orange-500 to-amber-500',
  },
  iris: {
    orb: 'bg-violet-500/25',
    pill: 'border-violet-500/30 bg-violet-950/45 text-violet-100/95',
    title:
      'bg-gradient-to-r from-violet-200 via-fuchsia-100 to-purple-300 bg-clip-text text-transparent',
    bar: 'from-violet-500 via-fuchsia-500 to-purple-400',
  },
  mint: {
    orb: 'bg-teal-500/20',
    pill: 'border-teal-500/25 bg-teal-950/40 text-teal-100/95',
    title:
      'bg-gradient-to-r from-teal-200 via-brand-lime-soft to-green-200 bg-clip-text text-transparent',
    bar: 'from-teal-400 to-brand-lime',
  },
  ocean: {
    orb: 'bg-sky-500/20',
    pill: 'border-sky-500/30 bg-sky-950/35 text-sky-100/95',
    title:
      'bg-gradient-to-r from-sky-200 via-cyan-100 to-blue-200 bg-clip-text text-transparent',
    bar: 'from-sky-400 to-cyan-500',
  },
  slate: {
    orb: 'bg-zinc-500/15',
    pill: 'border-zinc-600/40 bg-zinc-900/70 text-zinc-200',
    title: 'bg-gradient-to-r from-zinc-100 via-white to-zinc-300 bg-clip-text text-transparent',
    bar: 'from-zinc-500 to-zinc-600',
  },
} as const;

const SIZE_CLASS = {
  hero: 'text-3xl sm:text-5xl sm:tracking-tight',
  section: 'text-2xl sm:text-3xl',
  compact: 'text-lg sm:text-xl',
} as const;

const BAR_CLASS = {
  hero: 'mt-5 h-1.5 w-16 sm:w-24',
  section: 'mt-4 h-1 w-14 sm:w-20',
  compact: 'mt-2.5 h-0.5 w-11 sm:w-14',
} as const;

type Props = {
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  eyebrow?: string;
  title: string;
  accent: DiscoverSectionAccent;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  /** Soft glow blob behind title */
  withGlow?: boolean;
  /** Gradient accent bar under description */
  showBar?: boolean;
};

export function DiscoverSectionHeading({
  as = 'h2',
  id,
  eyebrow,
  title,
  accent,
  size = 'section',
  className,
  withGlow = true,
  showBar = true,
}: Props) {
  const a = ACCENT[accent];
  const Tag = as;

  return (
    <div className={cn('relative mb-3 min-w-0 sm:mb-5', className)}>
      {withGlow ? (
        <div
          className={cn(
            'pointer-events-none absolute -left-2 -top-4 h-24 w-40 rounded-full blur-3xl',
            a.orb
          )}
          aria-hidden
        />
      ) : null}
      <div className="relative">
        {eyebrow ? (
          <span
            className={cn(
              'mb-3 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]',
              a.pill
            )}
          >
            {eyebrow}
          </span>
        ) : null}
        <Tag
          id={id}
          className={cn(
            'font-extrabold leading-[1.15] tracking-tight',
            SIZE_CLASS[size],
            a.title
          )}
        >
          {title}
        </Tag>
        {showBar ? (
          <div
            className={cn(
              'rounded-full bg-gradient-to-r',
              BAR_CLASS[size],
              a.bar,
              'shadow-[0_0_12px_rgba(255,255,255,0.08)]'
            )}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

/** Full-width horizontal strip: aligns with page padding (no negative margins). Desktop: side arrows to scroll. */
export function DiscoverCarouselRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const syncScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setOverflows(maxScroll > 8);
    setCanLeft(scrollLeft > 6);
    setCanRight(scrollLeft < maxScroll - 6);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncScrollState();
    el.addEventListener('scroll', syncScrollState, { passive: true });
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(syncScrollState);
    });
    ro.observe(el);
    const inner = el.querySelector('[data-discover-carousel-track]');
    if (inner) ro.observe(inner);
    window.addEventListener('resize', syncScrollState);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      ro.disconnect();
    };
  }, [syncScrollState]);

  const scrollStep = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // One full “page” per click: viewport width minus a small overlap so the strip doesn’t feel stuck
    const w = el.clientWidth;
    const overlap = 40;
    const amount = Math.max(360, w - overlap) * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative min-w-0 w-full">
      {overflows ? (
        <>
          <button
            type="button"
            aria-label="Scroll dispensaries left"
            disabled={!canLeft}
            onClick={() => scrollStep(-1)}
            className={cn(
              'absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full md:flex',
              'border border-white/12 bg-zinc-950/95 text-white shadow-lg shadow-black/40 backdrop-blur-sm',
              'transition hover:border-emerald-500/35 hover:bg-zinc-900 hover:text-brand-lime',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime/50',
              'disabled:pointer-events-none disabled:opacity-25'
            )}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Scroll dispensaries right"
            disabled={!canRight}
            onClick={() => scrollStep(1)}
            className={cn(
              'absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full md:flex',
              'border border-white/12 bg-zinc-950/95 text-white shadow-lg shadow-black/40 backdrop-blur-sm',
              'transition hover:border-emerald-500/35 hover:bg-zinc-900 hover:text-brand-lime',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-lime/50',
              'disabled:pointer-events-none disabled:opacity-25'
            )}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}

      <div
        ref={scrollerRef}
        className={cn(
          'min-w-0 w-full overflow-x-auto overflow-y-visible pb-1 pt-0.5',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Proximity snap: mandatory + snap-always on cards was canceling link clicks on desktop when the
          // pointer moved a few px (browser treated it as horizontal scroll, not a click).
          'snap-x snap-proximity scroll-pl-0 scroll-pr-4 md:scroll-pl-2 md:scroll-pr-2',
          '[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]',
          overflows && 'md:px-11',
          className
        )}
      >
        <div
          data-discover-carousel-track
          className="flex w-max min-w-0 flex-nowrap items-stretch gap-2 sm:gap-4"
        >
          {children}
          <div className="w-1 shrink-0 sm:w-2" aria-hidden />
        </div>
      </div>
    </div>
  );
}
