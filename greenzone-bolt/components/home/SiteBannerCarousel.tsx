'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  bannerKind,
  type SiteBannerRow,
  siteBannerListingHref,
} from '@/lib/siteBanners';
import { placementDefaultCreativeFormat, type PlatformPlacementKey } from '@/lib/platformAdPlacements';
import {
  type MarketingBannerCreativeFormat,
  marketingBannerHeroLoadingSkeletonClassName,
  marketingBannerHeroViewportClassName,
  marketingBannerLoadingSkeletonClassName,
  marketingBannerStripSkeletonSlotClassName,
  marketingBannerStripSlotClassName,
  marketingBannerViewportClassName,
  normalizeMarketingBannerCreativeFormat,
} from '@/lib/marketingBanners/creativeFormats';
import { FEATURE_BANNER_CARD_CLASSNAME, FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME } from '@/lib/homepageFeatureBannerLayout';
import {
  TREEHOUSE_CAROUSEL_HREF,
  TREEHOUSE_CAROUSEL_LOGO_URL,
  isTreehouseCarouselLogoUrl,
} from '@/lib/treehouseCarouselAsset';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { buildMarketingAdPreviewSlides, marketingAdDemoEnabled } from '@/lib/marketingBanners/adPreviewDemos';
import { rewriteVercelAppBannerClickUrl } from '@/lib/marketingBanners/rewriteVercelBannerLink';

const MARKETING_BANNERS_API = '/api/public/marketing-banners';
const DEFAULT_DWELL_MS = 4500;

type Slide = SiteBannerRow;

function effectiveCreativeFormat(s: Slide | null, placementKey: string): MarketingBannerCreativeFormat {
  const raw = s?.creative_format;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return normalizeMarketingBannerCreativeFormat(raw);
  }
  return placementDefaultCreativeFormat(placementKey);
}

/** Subtle regulatory-style line; low contrast so creative stays primary. */
function AdLicenseCaption({ license }: { license: string | null | undefined }) {
  const t = typeof license === 'string' ? license.trim() : '';
  if (!t) return null;
  return (
    <span
      className="pointer-events-none absolute bottom-1 right-1 z-20 max-w-[min(92%,11rem)] truncate text-right text-[6px] font-normal leading-none tracking-wide text-white/30 [text-shadow:0_1px_2px_rgba(0,0,0,0.92)] sm:bottom-1.5 sm:right-1.5 sm:max-w-[13rem] sm:text-[7px] sm:text-white/26"
      aria-hidden
    >
      LIC {t}
    </span>
  );
}

/** Bottom segment slider inside the ad frame (same width as creative; no extra shrink). */
function MarketingBannerProgressRail({
  count,
  activeIndex,
  onPick,
  getAriaLabel,
}: {
  count: number;
  activeIndex: number;
  onPick: (i: number) => void;
  getAriaLabel: (i: number) => string;
}) {
  if (count <= 1) return null;
  const safe = ((activeIndex % count) + count) % count;
  return (
    <div className="border-t border-zinc-600/45 bg-zinc-900/75 px-2 py-2.5 sm:px-3 sm:py-3">
      <div
        className="mx-auto flex h-2 w-full gap-px rounded-full border border-zinc-700/90 bg-zinc-950/90 p-px shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
        role="tablist"
        aria-label="Ad slides"
      >
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === safe}
            className={cn(
              'min-h-[6px] min-w-0 flex-1 rounded-sm transition-all duration-300',
              i === safe
                ? 'bg-brand-lime shadow-[0_0_12px_rgba(163,230,53,0.35)]'
                : 'bg-zinc-700/95 hover:bg-zinc-600'
            )}
            onClick={() => onPick(i)}
            aria-label={getAriaLabel(i)}
          />
        ))}
      </div>
    </div>
  );
}

function CarouselSlidePicture({ imageUrl, slideId }: { imageUrl: string; slideId: string }) {
  const [src, setSrc] = useState(() => (imageUrl.trim().length > 0 ? imageUrl.trim() : TREEHOUSE_CAROUSEL_LOGO_URL));
  useEffect(() => {
    const t = imageUrl.trim().length > 0 ? imageUrl.trim() : TREEHOUSE_CAROUSEL_LOGO_URL;
    setSrc(t);
  }, [imageUrl, slideId]);

  const treeStyle =
    isTreehouseCarouselLogoUrl(src) ||
    src.startsWith('/brand/') ||
    src.includes('/datreehouse-logo');

  const onImgError = useCallback(() => {
    setSrc(TREEHOUSE_CAROUSEL_LOGO_URL);
  }, []);

  return (
    <div
      className={cn(
        'relative h-full min-h-0 w-full overflow-hidden',
        treeStyle
          ? 'bg-gradient-to-b from-zinc-500/90 via-zinc-700 to-zinc-900'
          : 'bg-zinc-800'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote Storage URLs + /public assets */}
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        onError={onImgError}
        className={cn(
          'h-full w-full object-center [transform:translateZ(0)]',
          treeStyle ? 'object-contain' : 'object-cover',
          treeStyle && 'p-1 sm:p-2'
        )}
      />
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hrefForSlide(s: Slide): string {
  const rewrite = (href: string) => rewriteVercelAppBannerClickUrl(href) ?? href;
  if (bannerKind(s) === 'admin') {
    const u = s.link_url?.trim();
    if (u && u.length > 0) return rewrite(u);
    return '/';
  }
  const u = s.link_url?.trim();
  if (u && u.length > 0) return rewrite(u);
  return siteBannerListingHref(s);
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

function BannerSlideLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

type CarouselVariant = 'default' | 'hero' | 'treeTop';

type CarouselProps = {
  variant?: CarouselVariant;
  placementKey?: PlatformPlacementKey | string;
  stripLabel?: string;
  compactStripChrome?: boolean;
  showStripHeading?: boolean;
  /**
   * When true (default), strip uses a centered max-width rail on wide screens (Discover, Feed, etc.).
   * Set false for Smokers Club so the bar spans the full amber card like the tree row below.
   */
  constrainStripWidth?: boolean;
};

function EmptyFallbackSlot({
  hero,
  capRail,
  placementKey,
  dualStrip,
  stripLabel,
  compactStripChrome,
  showStripHeading,
}: {
  hero?: boolean;
  capRail?: boolean;
  placementKey: string;
  /** Two side-by-side placeholder slots (strip / PlatformAdSlot). */
  dualStrip?: boolean;
  stripLabel?: string;
  compactStripChrome?: boolean;
  showStripHeading?: boolean;
}) {
  const fmtBase = hero ? placementDefaultCreativeFormat(placementKey) : effectiveCreativeFormat(null, placementKey);
  const viewport = hero
    ? marketingBannerHeroViewportClassName(fmtBase)
    : marketingBannerViewportClassName(fmtBase);

  if (dualStrip) {
    const slot = marketingBannerStripSlotClassName(placementDefaultCreativeFormat(placementKey));
    const placeholder = (key: string) => (
      <Link key={key} href={TREEHOUSE_CAROUSEL_HREF} className="block min-w-0">
        <div className={cn(slot, 'rounded-xl')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TREEHOUSE_CAROUSEL_LOGO_URL}
            alt=""
            className="h-full w-full object-contain object-center p-1 sm:p-2"
          />
        </div>
      </Link>
    );
    const showStripEyebrow = showStripHeading && Boolean(stripLabel?.trim());
    return (
      <div className={cn('pointer-events-auto w-full', capRail && FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME)}>
        {showStripEyebrow ? (
          <div
            className={cn(
              'flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center',
              compactStripChrome ? 'mb-0.5' : 'mb-1'
            )}
          >
            <p
              className={cn(
                'font-medium uppercase tracking-[0.14em] text-zinc-500',
                'text-[8px] sm:text-[9px]',
                'leading-none'
              )}
            >
              {stripLabel}
            </p>
          </div>
        ) : null}
        <div className={FEATURE_BANNER_CARD_CLASSNAME}>
          <div className="p-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
              {placeholder('a')}
              {placeholder('b')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pointer-events-auto w-full px-0',
        hero ? 'mx-auto max-w-full' : capRail ? FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME : 'mx-auto'
      )}
    >
      <Link href={TREEHOUSE_CAROUSEL_HREF} className={cn(FEATURE_BANNER_CARD_CLASSNAME, 'block')}>
        <div className={viewport}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TREEHOUSE_CAROUSEL_LOGO_URL}
            alt=""
            className="h-full w-full object-contain object-center p-1 sm:p-2"
          />
        </div>
      </Link>
    </div>
  );
}

function TreeStripAdColumn({
  slides,
  activeIndex,
  placementKey,
}: {
  slides: Slide[];
  activeIndex: number;
  placementKey: string;
}) {
  const fmtDefault = placementDefaultCreativeFormat(placementKey);
  if (slides.length === 0) {
    const slot = marketingBannerStripSlotClassName(fmtDefault);
    return (
      <div className="min-w-0">
        <Link href={TREEHOUSE_CAROUSEL_HREF} className="block min-w-0">
          <div className={cn(slot, 'rounded-xl')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TREEHOUSE_CAROUSEL_LOGO_URL}
              alt=""
              className="h-full w-full object-contain object-center p-1 sm:p-2"
            />
          </div>
        </Link>
      </div>
    );
  }

  const n = slides.length;
  const i0 = ((activeIndex % n) + n) % n;
  const viewport = marketingBannerStripSlotClassName(effectiveCreativeFormat(slides[i0]!, placementKey));

  return (
    <div className="relative min-w-0">
      <div className={cn(viewport, 'rounded-xl')}>
        {slides.map((s, i) => {
          const active = i === i0;
          return (
            <div
              key={`${s.id}-${i}`}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-in-out',
                active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
              )}
              aria-hidden={!active}
            >
              <BannerSlideLink
                href={hrefForSlide(s)}
                className="relative block h-full min-h-0 w-full overflow-hidden rounded-xl"
              >
                <CarouselSlidePicture imageUrl={s.image_url} slideId={`strip-${s.id}-${i}`} />
                <AdLicenseCaption license={s.advertiser_license_number} />
              </BannerSlideLink>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Marketing carousel: single public API, no client Supabase fallback, static PNG on errors / empty.
 */
export function SiteBannerCarousel({
  variant = 'default',
  placementKey = 'homepage_hero',
  stripLabel = 'Sponsored',
  compactStripChrome = false,
  showStripHeading = true,
  constrainStripWidth,
}: CarouselProps) {
  const capRail = variant !== 'hero' && constrainStripWidth !== false;
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  /** Horizontal “two-up” pages for treeTop strip (each page slides in as one bar). */
  const [stripPageIndex, setStripPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zip5, setZip5] = useState<string>(FALLBACK_LA_ZIP);

  const stripPages = useMemo(() => {
    const pairs: [Slide | null, Slide | null][] = [];
    for (let i = 0; i < slides.length; i += 2) {
      pairs.push([slides[i]!, slides[i + 1] ?? null]);
    }
    return pairs;
  }, [slides]);

  useEffect(() => {
    setZip5(readShopperZip5() ?? FALLBACK_LA_ZIP);
    const onZip = () => setZip5(readShopperZip5() ?? FALLBACK_LA_ZIP);
    window.addEventListener('datreehouse:zip', onZip);
    return () => window.removeEventListener('datreehouse:zip', onZip);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (marketingAdDemoEnabled()) {
        setSlides(buildMarketingAdPreviewSlides(placementKey));
        setIndex(0);
        setStripPageIndex(0);
        return;
      }
      const params = new URLSearchParams({ placement: placementKey, zip5 });
      const ac = new AbortController();
      const t = window.setTimeout(() => ac.abort(), 15000);
      const res = await fetch(`${MARKETING_BANNERS_API}?${params.toString()}`, {
        cache: 'no-store',
        signal: ac.signal,
      });
      clearTimeout(t);

      const j = (await res.json().catch(() => ({}))) as { rows?: SiteBannerRow[] };
      const rows = Array.isArray(j.rows) ? j.rows : [];
      const withImage = rows.filter((r) => typeof r.image_url === 'string' && r.image_url.trim().length > 0);
      setSlides(withImage.length ? shuffle(withImage) : []);
      setIndex(0);
      setStripPageIndex(0);
    } catch (e) {
      console.warn('SiteBannerCarousel: load failed', e);
      setSlides([]);
      setIndex(0);
      setStripPageIndex(0);
    } finally {
      setLoading(false);
    }
  }, [placementKey, zip5]);

  useEffect(() => {
    void load();
  }, [load]);

  const n = slides.length;
  const current = n ? slides[index % n] : null;

  useEffect(() => {
    if (variant === 'treeTop') return;
    if (n <= 1) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % n);
    }, DEFAULT_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [n, index, variant]);

  useEffect(() => {
    if (variant !== 'treeTop') return;
    const np = stripPages.length;
    if (np <= 1) return;
    const timer = window.setTimeout(() => {
      setStripPageIndex((i) => (i + 1) % np);
    }, DEFAULT_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [variant, stripPages.length, stripPageIndex]);

  const go = (dir: -1 | 1) => {
    if (!n) return;
    setIndex((i) => (i + dir + n) % n);
  };

  if (loading) {
    const skelFormat = placementDefaultCreativeFormat(placementKey);
    const skel =
      variant === 'hero'
        ? marketingBannerHeroLoadingSkeletonClassName(skelFormat)
        : marketingBannerLoadingSkeletonClassName(skelFormat);
    const stripSkel = marketingBannerStripSkeletonSlotClassName(skelFormat);
    if (variant === 'treeTop') {
      return (
        <div
          className={cn(
            'mx-auto w-full px-0 sm:px-0',
            'mb-0',
            capRail && FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME
          )}
        >
          <div className={cn(FEATURE_BANNER_CARD_CLASSNAME, 'p-0')}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
              <div className={cn('animate-pulse rounded-xl bg-zinc-800/40', stripSkel)} />
              <div className={cn('animate-pulse rounded-xl bg-zinc-800/40', stripSkel)} />
            </div>
            <div className="h-10 border-t border-zinc-600/40 bg-zinc-900/50" aria-hidden />
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          'mx-auto w-full px-0 sm:px-0',
          variant === 'default' ? 'mt-4 sm:mt-6' : 'mb-0',
          capRail && FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME
        )}
      >
        <div className={FEATURE_BANNER_CARD_CLASSNAME}>
          <div className={cn('animate-pulse rounded-t-2xl bg-zinc-800/40', skel)} />
          <div className="h-10 border-t border-zinc-600/40 bg-zinc-900/50" aria-hidden />
        </div>
      </div>
    );
  }

  if (!n || !current) {
    return (
      <EmptyFallbackSlot
        hero={variant === 'hero'}
        capRail={capRail}
        placementKey={placementKey}
        dualStrip={variant === 'treeTop'}
        stripLabel={stripLabel}
        compactStripChrome={compactStripChrome}
        showStripHeading={showStripHeading}
      />
    );
  }

  if (variant === 'treeTop') {
    const showStripEyebrow = showStripHeading && Boolean(stripLabel?.trim());
    const numStripPages = stripPages.length;
    const showStripDots = numStripPages > 1;
    const safePage = numStripPages ? stripPageIndex % numStripPages : 0;

    return (
      <div className={cn('pointer-events-auto w-full', capRail && FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME)}>
        {showStripEyebrow ? (
          <div
            className={cn(
              'flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center',
              compactStripChrome ? 'mb-0.5' : 'mb-1'
            )}
          >
            <p
              className={cn(
                'font-medium uppercase tracking-[0.14em] text-zinc-500',
                'text-[8px] sm:text-[9px]',
                'leading-none'
              )}
            >
              {stripLabel}
            </p>
          </div>
        ) : null}
        <div
          className={FEATURE_BANNER_CARD_CLASSNAME}
          role="region"
          aria-roledescription="carousel"
          aria-label={stripLabel?.trim() || 'Sponsored advertisement'}
        >
          <div className="p-0">
            <div className="relative w-full min-w-0 overflow-hidden">
              <div
                className={cn(
                  'flex',
                  numStripPages > 1 && 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]'
                )}
                style={{ transform: `translateX(-${safePage * 100}%)` }}
              >
                {stripPages.map((pair, pi) => (
                  <div
                    key={pi}
                    className="w-full shrink-0"
                    aria-hidden={pi !== safePage}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                      <TreeStripAdColumn
                        slides={pair[0] ? [pair[0]] : []}
                        activeIndex={0}
                        placementKey={placementKey}
                      />
                      <div className={cn('min-w-0', !pair[1] && 'max-sm:hidden')}>
                        <TreeStripAdColumn
                          slides={pair[1] ? [pair[1]] : []}
                          activeIndex={0}
                          placementKey={placementKey}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {showStripDots ? (
            <MarketingBannerProgressRail
              count={numStripPages}
              activeIndex={safePage}
              onPick={setStripPageIndex}
              getAriaLabel={(pi) => `Sponsored page ${pi + 1} of ${numStripPages}`}
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="pointer-events-auto mx-auto w-full max-w-full px-0 sm:px-0">
        <div
          className={FEATURE_BANNER_CARD_CLASSNAME}
          role="region"
          aria-roledescription="carousel"
          aria-label="Homepage marketing carousel"
        >
          <div
            className={marketingBannerHeroViewportClassName(effectiveCreativeFormat(current, placementKey))}
          >
            {slides.map((s, i) => {
              const active = i === index % n;
              return (
                <div
                  key={`${s.id}-${i}`}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-700 ease-in-out',
                    active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
                  )}
                  aria-hidden={!active}
                >
                  <BannerSlideLink
                    href={hrefForSlide(s)}
                    className="relative block h-full min-h-0 w-full overflow-hidden rounded-t-2xl"
                  >
                    <CarouselSlidePicture imageUrl={s.image_url} slideId={`${s.id}-${i}`} />
                    <AdLicenseCaption license={s.advertiser_license_number} />
                  </BannerSlideLink>
                </div>
              );
            })}
          </div>

          <MarketingBannerProgressRail
            count={n}
            activeIndex={index}
            onPick={setIndex}
            getAriaLabel={(i) => `Slide ${i + 1} of ${n}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pointer-events-auto mx-auto mt-4 w-full px-0 sm:mt-6 sm:px-3',
        capRail && FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME
      )}
    >
      <div className="mb-1 flex flex-col items-center gap-0.5">
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
          <Sparkles className="h-3 w-3 text-gray-500" aria-hidden />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600">
            Spotlight
          </span>
          <span className="hidden text-[10px] text-gray-600 sm:inline">·</span>
          <span className="text-[10px] text-gray-600">Rotation is managed by our team</span>
        </div>
      </div>

      <div className={cn(FEATURE_BANNER_CARD_CLASSNAME, 'px-0 py-1 sm:px-1 sm:py-2')}>
        <div className="relative flex w-full flex-1 items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-0 z-10 hidden h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 sm:flex"
            onClick={() => go(-1)}
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="relative w-full min-w-0 flex-1 overflow-hidden px-0 sm:px-6">
            <div
              className={`flex ${n > 1 ? 'transition-transform duration-500 ease-out' : ''}`}
              style={{ transform: `translateX(-${(index % n) * 100}%)` }}
            >
              {slides.map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="w-full shrink-0 px-0 sm:px-1"
                  aria-hidden={i !== index % n}
                >
                  <BannerSlideLink
                    href={hrefForSlide(s)}
                    className="flex flex-col items-center justify-center transition hover:opacity-95"
                  >
                    <div
                      className={cn(
                        marketingBannerViewportClassName(effectiveCreativeFormat(s, placementKey)),
                        'relative overflow-hidden rounded-2xl'
                      )}
                    >
                      <CarouselSlidePicture imageUrl={s.image_url} slideId={`${s.id}-${i}`} />
                      <AdLicenseCaption license={s.advertiser_license_number} />
                    </div>
                  </BannerSlideLink>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 z-10 hidden h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 sm:flex"
            onClick={() => go(1)}
            aria-label="Next banner"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <p className="mt-1 text-center text-[8px] text-gray-600 sm:text-[9px]">
          ~{DEFAULT_DWELL_MS / 1000}s per slide
        </p>

        <MarketingBannerProgressRail
          count={n}
          activeIndex={index}
          onPick={setIndex}
          getAriaLabel={(i) => `Go to slide ${i + 1}`}
        />
      </div>
    </div>
  );
}
