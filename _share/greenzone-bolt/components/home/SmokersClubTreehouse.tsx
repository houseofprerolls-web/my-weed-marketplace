'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Store, Truck } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { trackEvent } from '@/lib/analytics';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';

/** Rank 1 = crown (most visible); 10 = lower rungs. Percents are card centers; spaced to reduce overlap on md+. */
const TREE_PLACEMENTS: { top: string; left: string; cordH: string }[] = [
  { top: '5%', left: '50%', cordH: '2.5rem' },
  { top: '19%', left: '13%', cordH: '2rem' },
  { top: '19%', left: '87%', cordH: '2rem' },
  { top: '34%', left: '7%', cordH: '1.85rem' },
  { top: '39%', left: '36%', cordH: '1.85rem' },
  { top: '39%', left: '64%', cordH: '1.85rem' },
  { top: '34%', left: '93%', cordH: '1.85rem' },
  { top: '58%', left: '22%', cordH: '1.5rem' },
  { top: '64%', left: '50%', cordH: '1.5rem' },
  { top: '58%', left: '78%', cordH: '1.5rem' },
];

type Lane = 'delivery' | 'storefront' | 'treehouse';

type Props = {
  lane: Lane;
  /** When true, title row is omitted (parent supplies branding). */
  hideHeader?: boolean;
  title?: string;
  blurb?: string;
  slots: (PublicVendorCard | null)[];
};

function SlotCard({
  rank,
  vendor,
  lane,
  prominent,
}: {
  rank: number;
  vendor: PublicVendorCard | null;
  lane: Lane;
  prominent?: boolean;
}) {
  const rope =
    lane === 'treehouse'
      ? 'from-brand-lime/65 via-amber-400/35 to-transparent'
      : lane === 'delivery'
        ? 'from-brand-lime/70 via-brand-lime/25 to-transparent'
        : 'from-amber-400/70 via-amber-400/20 to-transparent';

  if (!vendor) {
    return (
      <div className={`flex flex-col items-center ${prominent ? 'scale-100' : 'scale-[0.97]'}`}>
        <div
          className={`mx-auto w-px shrink-0 bg-gradient-to-b ${rope}`}
          style={{ height: TREE_PLACEMENTS[rank - 1]?.cordH ?? '1.25rem' }}
          aria-hidden
        />
        <Card
          className={`w-full max-w-[10.75rem] border-dashed border-gray-600/80 bg-gray-950/40 p-3 text-center text-xs text-gray-500 ${
            prominent ? 'min-h-[108px]' : 'min-h-[96px]'
          }`}
        >
          <span className="font-medium text-gray-400">#{rank}</span>
          <p className="mt-1">Open</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${prominent ? 'scale-105' : 'scale-100'}`}>
      <div
        className={`mx-auto w-px shrink-0 bg-gradient-to-b ${rope}`}
        style={{ height: TREE_PLACEMENTS[rank - 1]?.cordH ?? '1.25rem' }}
        aria-hidden
      />
      <Link
        href={`/listing/${vendor.id}`}
        className="group w-full max-w-[10.75rem]"
        onClick={() => {
          void trackEvent({
            eventType: 'smokers_club_tree_click',
            vendorId: vendor.id,
            metadata: { slot_rank: rank, lane, source: 'smokers_club_tree' },
          });
        }}
      >
        <Card
          className={`overflow-hidden border-gray-700/90 bg-gray-950/80 p-3 transition hover:border-brand-red/45 hover:shadow-[0_0_24px_rgba(229,9,20,0.12)] ${
            prominent ? 'ring-2 ring-brand-lime/35' : ''
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <Badge
              className={
                prominent
                  ? 'bg-gradient-to-r from-brand-red to-red-700 text-white'
                  : 'bg-gray-800 text-gray-200'
              }
            >
              #{rank}
            </Badge>
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {rank === 1 ? 'Prime' : rank <= 3 ? 'Elite' : rank <= 6 ? 'Featured' : 'Club'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
              {vendor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote vendor logos
                <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-brand-lime">{vendor.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white group-hover:text-brand-lime">{vendor.name}</p>
              <p className="truncate text-[11px] text-gray-500">{vendor.order_count} orders</p>
            </div>
          </div>
          <Button size="sm" className="mt-2 h-8 w-full bg-brand-red text-xs hover:bg-brand-red-deep">
            View
          </Button>
        </Card>
      </Link>
    </div>
  );
}

export function SmokersClubTreehouse({ lane, title, blurb, slots, hideHeader }: Props) {
  const Icon = lane === 'treehouse' ? Award : lane === 'delivery' ? Truck : Store;
  const iconWrap =
    lane === 'treehouse'
      ? 'border-brand-lime/30 border-amber-400/25 bg-gradient-to-br from-brand-lime/10 to-amber-500/10 text-brand-lime-soft'
      : lane === 'delivery'
        ? 'border-brand-lime/35 bg-brand-lime/10 text-brand-lime'
        : 'border-amber-400/35 bg-amber-500/10 text-amber-200';

  const showHeader = !hideHeader && title != null && blurb != null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950/90 to-black/80 p-4 shadow-inner shadow-black/40 md:p-6">
      {showHeader ? (
        <div className="mb-6 flex flex-col items-center gap-2 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${iconWrap}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white md:text-2xl">{title}</h3>
              <p className="text-sm text-gray-400">{blurb}</p>
            </div>
          </div>
          <p className="max-w-sm text-xs text-gray-500">
            #1 hangs highest on the tree — most visible. #10 is still Smokers Club, just a lighter placement.
          </p>
        </div>
      ) : null}

      {/* Mobile: ordered stack */}
      <div className="space-y-5 md:hidden">
        {slots.map((v, i) => {
          const rank = i + 1;
          return <SlotCard key={`m-${lane}-${rank}`} rank={rank} vendor={v} lane={lane} prominent={rank === 1} />;
        })}
      </div>

      {/* Desktop: tree stage */}
      <div className="relative mx-auto hidden min-h-[min(720px,82vh)] w-full max-w-6xl md:block">
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.12]"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 50% 55%, rgba(34,197,94,0.35), transparent 70%), radial-gradient(ellipse 40% 35% at 50% 20%, rgba(229,9,20,0.2), transparent 65%)',
          }}
          aria-hidden
        />

        <div
          className={`absolute left-1/2 top-[22%] z-0 w-40 -translate-x-1/2 sm:w-48 md:top-[24%] md:w-52 ${
            hideHeader && lane === 'treehouse' ? 'opacity-[0.55]' : 'opacity-[0.22]'
          }`}
        >
          <Image
            src="/brand/datreehouse-logo.png"
            alt=""
            width={240}
            height={120}
            className="h-auto w-full object-contain"
            aria-hidden
          />
        </div>
        <p
          className={`pointer-events-none absolute bottom-2 left-1/2 z-0 -translate-x-1/2 text-center uppercase tracking-[0.2em] text-gray-500 ${
            hideHeader && lane === 'treehouse' ? 'text-xs font-semibold sm:text-sm' : 'text-[10px]'
          }`}
        >
          {hideHeader && lane === 'treehouse' ? 'Smokers Club' : `${SITE_NAME} treehouse`}
        </p>

        {TREE_PLACEMENTS.map((pos, i) => {
          const rank = i + 1;
          const v = slots[i] ?? null;
          return (
            <div
              key={`${lane}-${rank}`}
              className="absolute z-10 w-[min(10.75rem,24vw)] -translate-x-1/2"
              style={{ top: pos.top, left: pos.left }}
            >
              <SlotCard rank={rank} vendor={v} lane={lane} prominent={rank === 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
