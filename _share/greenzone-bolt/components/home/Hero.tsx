"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrendingUp, Award, Shield } from 'lucide-react';
import Image from 'next/image';
import { SITE_NAME } from '@/lib/brand';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { HeroTreehouseAnchor } from '@/components/brand/HeroTreehouseAnchor';
import { SmokersClub } from '@/components/home/SmokersClub';
import { SmokersClubHomepageBannerCarousel } from '@/components/home/SmokersClubHomepageBannerCarousel';

export function Hero() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-[90vh] items-center overflow-visible bg-gradient-to-br from-black via-zinc-950 to-red-950/40">
      {/* Giant watermark — same mark, anchors full composition */}
      <div className="pointer-events-none absolute left-1/2 top-[18%] w-[min(100vw,720px)] -translate-x-1/2 select-none opacity-[0.06]">
        <Image
          src="/brand/datreehouse-logo.png"
          alt=""
          width={720}
          height={360}
          className="h-auto w-full object-contain"
          aria-hidden
        />
      </div>

      {/* pointer-events-none so clicks reach the sticky ZIP bar, header, and dialogs — not trapped on the hero canvas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,_var(--tw-gradient-stops))] from-brand-red/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_60%,_var(--tw-gradient-stops))] from-brand-lime/8 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNlNTA5MTQiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="sr-only">{SITE_NAME}</h1>
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-tight">
              {marketplaceCopy.heroHeadline}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-gray-400 sm:text-lg md:text-xl">
              {marketplaceCopy.heroSubline}
            </p>
          </div>
          <SmokersClub />

          <div className="mt-10 sm:mt-14">
            <HeroTreehouseAnchor />
          </div>

          <SmokersClubHomepageBannerCarousel />

          <div className="mb-12 mt-10 flex flex-wrap items-center justify-center gap-4">
            <span className="text-sm text-gray-400">Popular Cities:</span>
            {['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'].map((city) => (
              <Button
                key={city}
                variant="outline"
                size="sm"
                onClick={() => router.push(`/discover?location=${city}`)}
                className="rounded-full border-brand-red/30 bg-brand-red/5 text-brand-lime-soft hover:bg-brand-red/15 hover:text-white"
              >
                {city}
              </Button>
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
                  <div className="text-sm text-gray-400">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
