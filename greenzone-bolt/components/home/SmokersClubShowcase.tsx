'use client';

import Link from 'next/link';
import { ChevronRight, Flame, Sparkles, Store, Truck } from 'lucide-react';
import { SiteBannerCarousel } from '@/components/home/SiteBannerCarousel';
import { SocialEquityBadge } from '@/components/vendor/SocialEquityBadge';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';
import { listingHrefForVendor } from '@/lib/listingPath';

type Lane = 'delivery' | 'storefront' | 'treehouse';

/**
 * Tree card art: dedicated Smokers Club backdrop if set, otherwise the same listing banner
 * shoppers see on `/listing/[slug]` (Business Profile cover).
 */
function treeCardBackdropUrl(vendor: PublicVendorCard | null | undefined): string {
  const club = vendor?.smokers_club_tab_background_url?.trim() ?? '';
  if (club) return club;
  return vendor?.banner_url?.trim() ?? '';
}

function trackSlotClick(
  vendor: PublicVendorCard,
  visualSlotIndex: number,
  displayTrophyTier: number | null,
  lane: Lane
) {
  void trackEvent({
    eventType: 'smokers_club_tree_click',
    vendorId: vendor.id,
    metadata: {
      trophy_tier: displayTrophyTier,
      visual_slot: visualSlotIndex,
      lane,
      source: 'smokers_club_tree',
    },
  });
}

/** Run after navigation starts so Supabase/auth work never competes with Link handling. */
function scheduleTrackSlotClick(
  vendor: PublicVendorCard,
  visualSlotIndex: number,
  displayTrophyTier: number | null,
  lane: Lane
) {
  setTimeout(() => trackSlotClick(vendor, visualSlotIndex, displayTrophyTier, lane), 0);
}

function ServiceDots({ vendor }: { vendor: PublicVendorCard }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {vendor.offers_delivery ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/35 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
          <Truck className="h-3 w-3 text-brand-lime/90" aria-hidden />
          Delivery
        </span>
      ) : null}
      {vendor.offers_storefront ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/35 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
          <Store className="h-3 w-3 text-amber-200/80" aria-hidden />
          Pickup
        </span>
      ) : null}
    </div>
  );
}

function PodiumCard({
  visualSlotIndex,
  vendor,
  lane,
  trophyVisualTopSlots,
  podiumOrderClass,
  elevated,
}: {
  visualSlotIndex: number;
  vendor: PublicVendorCard | null;
  lane: Lane;
  trophyVisualTopSlots: number;
  podiumOrderClass: string;
  elevated: boolean;
}) {
  const displayTrophy = null;
  const tabBg = treeCardBackdropUrl(vendor);

  const shell = cn(
    'relative isolate flex min-h-[132px] flex-col justify-end overflow-hidden rounded-2xl border p-4 transition sm:min-h-[150px]',
    vendor
      ? tabBg
        ? 'border-white/[0.08] bg-zinc-950/40 hover:border-amber-400/35 hover:bg-zinc-950/55'
        : 'border-white/[0.08] bg-zinc-900/50 hover:border-amber-400/35 hover:bg-zinc-900/70'
      : 'border-dashed border-white/[0.1] bg-zinc-950/40',
    elevated &&
      vendor &&
      'md:scale-[1.04] md:shadow-[0_28px_64px_-24px_rgba(245,158,11,0.35)]',
    displayTrophy === 1 &&
      vendor &&
      'border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.12)]',
    displayTrophy === 2 && vendor && 'border-slate-400/30',
    displayTrophy === 3 && vendor && 'border-amber-800/35',
    podiumOrderClass
  );

  const trophyBadge = null;

  if (vendor) {
    return (
      <Link
        href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })}
        className={cn(
          'group block outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          shell
        )}
        onClick={() => trackSlotClick(vendor, visualSlotIndex, displayTrophy, lane)}
      >
        {tabBg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote vendor art */}
            <img
              src={tabBg}
              alt=""
              loading="eager"
              decoding="async"
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover [transform:translateZ(0)]"
              key={tabBg}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40 max-sm:from-zinc-950/88 max-sm:via-zinc-950/50 max-sm:to-zinc-950/10"
              aria-hidden
            />
          </>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-amber-950/15 via-transparent to-zinc-950"
            aria-hidden
          />
        )}
        {trophyBadge}
        <div className="relative z-[3] mt-auto">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:h-14 sm:w-14">
              {vendor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote vendor logos
                <img
                  src={vendor.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  key={vendor.logo_url}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-brand-lime">
                  {vendor.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-white sm:text-base">{vendor.name}</p>
                {vendor.social_equity_badge_visible ? (
                  <SocialEquityBadge className="shrink-0 px-1.5 py-0 text-[8px] leading-tight sm:text-[9px]" />
                ) : null}
              </div>
              <ServiceDots vendor={vendor} />
            </div>
            <ChevronRight
              className="mt-1 h-5 w-5 shrink-0 text-zinc-500 transition group-hover:text-brand-lime"
              aria-hidden
            />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={shell}>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.07),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <Sparkles className="h-6 w-6 text-zinc-600" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">Spot open</p>
        <p className="max-w-[12rem] text-[11px] text-zinc-600">Next shop up rotates in with the daily shuffle.</p>
      </div>
    </div>
  );
}

function GridCard({
  visualSlotIndex,
  vendor,
  lane,
  trophyVisualTopSlots,
}: {
  visualSlotIndex: number;
  vendor: PublicVendorCard | null;
  lane: Lane;
  trophyVisualTopSlots: number;
}) {
  const displayTrophy = null;
  const tabBg = treeCardBackdropUrl(vendor);

  const rowShell = cn(
    'relative flex min-h-0 items-center overflow-hidden rounded-2xl border px-3 py-3 transition sm:px-4 sm:py-3.5',
    vendor
      ? tabBg
        ? 'isolate min-h-[4rem] border-white/[0.06] bg-zinc-950/35 hover:border-white/[0.12] hover:bg-zinc-950/55'
        : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.12] hover:bg-zinc-900/60'
      : 'border-dashed border-white/[0.08] bg-zinc-950/25',
    tabBg && vendor && 'overflow-hidden',
    displayTrophy === 1 &&
      vendor &&
      'border-amber-400/45 shadow-[0_0_28px_rgba(251,191,36,0.12)]',
    displayTrophy === 2 && vendor && 'border-slate-400/35',
    displayTrophy === 3 && vendor && 'border-amber-800/40'
  );

  const trophyColumn = null;

  const inner = (
    <>
      {tabBg && vendor ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tabBg}
            alt=""
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover [transform:translateZ(0)]"
            key={tabBg}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/85 via-black/65 to-black/45 max-sm:from-black/70 max-sm:via-black/40 max-sm:to-black/20"
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative z-[3] flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        {trophyColumn}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:h-11 sm:w-11">
          {vendor?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.logo_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              key={vendor.logo_url}
            />
          ) : vendor ? (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-brand-lime">
              {vendor.name.charAt(0)}
            </span>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-zinc-600">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          {vendor ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 truncate text-xs font-semibold text-white sm:text-sm">{vendor.name}</p>
              {vendor.social_equity_badge_visible ? (
                <SocialEquityBadge className="shrink-0 px-1.5 py-0 text-[8px] leading-tight sm:text-[9px]" />
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Open spot</p>
          )}
          {vendor ? <ServiceDots vendor={vendor} /> : null}
        </div>
        {vendor ? (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-brand-lime sm:h-5 sm:w-5"
            aria-hidden
          />
        ) : null}
      </div>
    </>
  );

  if (vendor) {
    return (
      <Link
        href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })}
        className={cn(
          'group block w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-lime/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          rowShell
        )}
        onClick={() => scheduleTrackSlotClick(vendor, visualSlotIndex, displayTrophy, lane)}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cn('w-full', rowShell)}>{inner}</div>;
}

type Props = {
  lane?: Lane;
  slots: (PublicVendorCard | null)[];
  trophyVisualTopSlots?: number;
  /** Shoppers’ ZIP used for this tree (5 digits). */
  zipCode?: string | null;
};

export function SmokersClubShowcase({
  lane = 'treehouse',
  slots,
  trophyVisualTopSlots = 3,
  zipCode,
}: Props) {
  const top = slots.slice(0, 3);
  const rest = slots.slice(3);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -left-20 top-1/4 h-48 w-48 rounded-full bg-amber-500/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-orange-600/[0.05] blur-3xl"
        aria-hidden
      />

      <div className="relative z-[1] mb-4 flex flex-col gap-2 sm:mb-6 sm:gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/10 pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-zinc-900 ring-1 ring-amber-500/30">
              <Flame className="h-4 w-4 text-amber-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Smokers Club</p>
              <p className="text-xs text-zinc-500">Top picks get the amber glow—everyone else still rolls with the club.</p>
            </div>
          </div>
          {zipCode && zipCode.length === 5 ? (
            <p className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-amber-500/80">ZIP {zipCode}</p>
          ) : null}
        </div>

        <div className="w-full">
          <SiteBannerCarousel
            variant="treeTop"
            placementKey="smokers_club_strip"
            showStripHeading={false}
            constrainStripWidth={false}
          />
        </div>
      </div>

      {/* Mobile: order 2→1→3. Desktop: podium 2—1—3 with center raised */}
      <div className="relative z-[1] flex flex-col gap-3 md:grid md:grid-cols-3 md:items-end md:gap-4">
        <PodiumCard
          visualSlotIndex={2}
          vendor={top[1] ?? null}
          lane={lane}
          trophyVisualTopSlots={trophyVisualTopSlots}
          podiumOrderClass="order-2 md:order-1 md:pb-3"
          elevated={false}
        />
        <PodiumCard
          visualSlotIndex={1}
          vendor={top[0] ?? null}
          lane={lane}
          trophyVisualTopSlots={trophyVisualTopSlots}
          podiumOrderClass="order-1 md:order-2"
          elevated
        />
        <PodiumCard
          visualSlotIndex={3}
          vendor={top[2] ?? null}
          lane={lane}
          trophyVisualTopSlots={trophyVisualTopSlots}
          podiumOrderClass="order-3 md:order-3 md:pb-3"
          elevated={false}
        />
      </div>

      <div className="relative z-[1] mt-8 sm:mt-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600/75">The lineup</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rest.map((vendor, i) => (
            <GridCard
              key={vendor?.id ?? `club-open-${i + 4}`}
              visualSlotIndex={i + 4}
              vendor={vendor}
              lane={lane}
              trophyVisualTopSlots={trophyVisualTopSlots}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
