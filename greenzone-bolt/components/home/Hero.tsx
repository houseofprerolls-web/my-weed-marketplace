"use client";

import { TrendingUp, Award, Shield } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { SmokersClub } from '@/components/home/SmokersClub';
import { SiteBannerCarousel } from '@/components/home/SiteBannerCarousel';
import { SmokersClubCategoryChipsRow } from '@/components/home/HeroCategories';
import { FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME } from '@/lib/homepageFeatureBannerLayout';

export function Hero() {
  return (
    <div className="relative flex min-h-0 items-center overflow-visible bg-gradient-to-br from-black via-zinc-950 to-red-950/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,_var(--tw-gradient-stops))] from-brand-red/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_60%,_var(--tw-gradient-stops))] from-brand-lime/8 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNlNTA5MTQiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="sr-only">{SITE_NAME}</h1>

          <div className={cn('mx-auto mb-4 w-full sm:mb-5', FEATURE_BANNER_STRIP_MAX_WIDTH_CLASSNAME)}>
            <SiteBannerCarousel variant="hero" placementKey="homepage_hero" />
          </div>

          <div className="mx-auto mb-6 max-w-5xl rounded-xl border border-white/[0.06] bg-zinc-950/35 px-3 py-3 shadow-inner shadow-black/20 sm:mb-8 sm:px-5 sm:py-3.5">
            <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
              Shop by category
            </p>
            <SmokersClubCategoryChipsRow justify="center" />
          </div>

          <SmokersClub />

          <div className="mb-10 mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
            {['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'].map((city) => (
              <span
                key={city}
                className="inline-flex cursor-default select-none items-center rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1.5 text-sm text-brand-lime-soft"
              >
                {city}
              </span>
            ))}
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: Shield, stat: '1,200+', label: 'Verified Businesses' },
              { icon: TrendingUp, stat: '50k+', label: 'Monthly Visitors' },
              { icon: Award, stat: '2M+', label: 'Customer Reviews' },
            ].map(({ icon: Icon, stat, label }) => (
              <div key={label} className="group relative">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-lime opacity-20 blur transition group-hover:opacity-30" />
                <div className="relative rounded-2xl border border-brand-red/25 bg-gray-900/50 p-6 text-center backdrop-blur-sm">
                  <Icon className="mx-auto mb-3 h-8 w-8 text-brand-lime" />
                  <div className="mb-1 text-3xl font-bold text-white">{stat}</div>
                  <div className="text-sm text-zinc-300">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
