"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/brand';
import {
  DATREEHOUSE_LOGO_PX_HEIGHT,
  DATREEHOUSE_LOGO_PX_WIDTH,
  TREEHOUSE_CAROUSEL_LOGO_URL,
} from '@/lib/treehouseCarouselAsset';
import { MapPin, ShoppingBag, Truck, PartyPopper } from 'lucide-react';

const steps = [
  {
    icon: MapPin,
    title: 'Land on a shop',
    blurb: 'Discover or map—poke menus until one feels right.',
  },
  {
    icon: ShoppingBag,
    title: 'Fill your bag',
    blurb: 'Flower, edibles, vapes—swap before checkout if stock moves.',
  },
  {
    icon: Truck,
    title: 'They roll out',
    blurb: 'Shop preps and sends a driver; ETA depends on route and rush.',
  },
  {
    icon: PartyPopper,
    title: "You're in",
    blurb: '21+ ID at the door. Tip if it was smooth; rate when you want.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-brand-red/20 bg-zinc-950 py-14 md:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-10 flex flex-col items-center gap-5 text-center md:mb-14">
          <Image
            src={TREEHOUSE_CAROUSEL_LOGO_URL}
            alt={`${SITE_NAME}`}
            width={DATREEHOUSE_LOGO_PX_WIDTH}
            height={DATREEHOUSE_LOGO_PX_HEIGHT}
            className="h-12 w-auto object-contain md:h-14"
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-lime/90">Da Treehouse</p>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
              How ordering here works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
              {`Four beats—same hub as the rest of the site. If you've used a food app, you already get the flow.`}
            </p>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.title}
                className="relative border border-white/10 bg-zinc-900/50 p-6 text-left shadow-none transition hover:border-brand-red/25"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="font-mono text-xl font-bold tabular-nums text-brand-red/90">{i + 1}</span>
                  <span className="rounded-lg bg-brand-lime/10 p-2 text-brand-lime">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
                </div>
                <h3 className="mb-1.5 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-snug text-zinc-400">{step.blurb}</p>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild className="bg-brand-red font-semibold text-white hover:bg-brand-red-deep">
            <Link href="/discover">Open Discover</Link>
          </Button>
          <Button asChild variant="ghost" className="text-zinc-300 hover:bg-white/5 hover:text-white">
            <Link href="/how-it-works">Full walkthrough</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
