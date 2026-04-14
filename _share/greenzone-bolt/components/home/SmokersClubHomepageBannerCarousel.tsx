'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  bannerKind,
  fetchApprovedHomepageBanners,
  fetchBestTreehouseSlotByVendor,
  homepageBannerDwellMsForSlot,
  homepageBannerPresetClass,
  slotRankForHomepageBanner,
  type HomepageBannerRow,
} from '@/lib/smokersClubHomepageBanners';
import { SMOKERS_CLUB_SLOT_RANK_MAX } from '@/lib/smokersClub';

type Slide = HomepageBannerRow & { slotRank: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hrefForSlide(s: Slide): string {
  if (bannerKind(s) === 'admin') {
    const u = s.link_url?.trim();
    return u && u.length > 0 ? u : '/';
  }
  const u = s.link_url?.trim();
  if (u && u.length > 0) return u;
  return s.vendor_id ? `/listing/${s.vendor_id}` : '/';
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

export function SmokersClubHomepageBannerCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchApprovedHomepageBanners();
    const vendorIds = Array.from(
      new Set(rows.map((r) => r.vendor_id).filter((id): id is string => id != null))
    );
    const rankMap = await fetchBestTreehouseSlotByVendor(vendorIds);
    const withRank: Slide[] = rows.map((r) => ({
      ...r,
      slotRank: slotRankForHomepageBanner(r, rankMap),
    }));
    setSlides(shuffle(withRank));
    setIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const n = slides.length;
  const current = n ? slides[index % n] : null;
  const dwell = current ? homepageBannerDwellMsForSlot(current.slotRank) : 4000;

  useEffect(() => {
    if (n <= 1) return;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % n);
    }, dwell);
    return () => window.clearTimeout(t);
  }, [n, index, dwell]);

  const go = (dir: -1 | 1) => {
    if (!n) return;
    setIndex((i) => (i + dir + n) % n);
  };

  if (loading) {
    return (
      <div className="mx-auto mt-6 max-w-3xl px-2">
        <div className="h-16 animate-pulse rounded-lg border border-white/10 bg-gray-900/30 sm:h-20" />
      </div>
    );
  }

  if (!n || !current) {
    return null;
  }

  return (
    <div className="pointer-events-auto mx-auto mt-8 max-w-3xl px-2 sm:mt-10 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5 text-center">
        <Sparkles className="h-3 w-3 text-gray-500" aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600">
          Spotlight
        </span>
        <span className="hidden text-[10px] text-gray-600 sm:inline">·</span>
        <span className="text-[10px] text-gray-600">
          Tree slots get longer rotation
        </span>
      </div>

      <div className="relative flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-black/25 px-2 py-3 backdrop-blur-sm sm:px-3 sm:py-4">
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

          <div className="relative w-full min-w-0 flex-1 overflow-hidden px-0 sm:px-10">
            <div
              className={`flex ${n > 1 ? 'transition-transform duration-500 ease-out' : ''}`}
              style={{ transform: `translateX(-${(index % n) * 100}%)` }}
            >
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="w-full shrink-0 px-1"
                  aria-hidden={s.id !== current.id}
                >
                  <BannerSlideLink
                    href={hrefForSlide(s)}
                    className="flex flex-col items-center justify-center transition hover:opacity-95"
                  >
                    <div
                      className={`relative mx-auto overflow-hidden rounded-lg border border-white/[0.07] bg-gray-950/80 ${homepageBannerPresetClass(s.slot_preset)}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote vendor URLs */}
                      <img
                        src={s.image_url}
                        alt=""
                        className="h-full w-full object-contain object-center"
                      />
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

        <p className="mt-1.5 text-center text-[9px] text-gray-600 sm:text-[10px]">
          ~{Math.round(dwell / 100) / 10}s · stronger tree slots stay up longer
        </p>

        {n > 1 && (
          <div className="mt-2 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`h-1.5 rounded-full transition-all ${
                  i === index % n ? 'w-6 bg-brand-lime' : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                }`}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
