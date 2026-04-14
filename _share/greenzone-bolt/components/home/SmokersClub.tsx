'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Award, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/brand';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { fetchLiveVendorsForSmokersClub } from '@/lib/vendorDeliveryList';
import { buildSmokersClubTreehouseRow, SMOKERS_CLUB_SLOTS } from '@/lib/smokersClub';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { SmokersClubTreehouse } from '@/components/home/SmokersClubTreehouse';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import { applySmokersClubTestPins } from '@/lib/smokersTestPins';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { SHOPPER_ZIP_STORAGE_KEY } from '@/lib/shopperLocation';

/** Hanging ribbon + double-frame panel around Smokers Club content. */
function SmokersClubBanner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative py-3 sm:py-6', className)}>
      <div className="mx-auto max-w-6xl px-3 sm:px-5">
        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-[2rem] bg-gradient-to-r from-brand-red/[0.14] via-transparent to-brand-lime/[0.11] blur-2xl sm:-inset-x-10"
            aria-hidden
          />
          <div className="relative z-20 flex justify-center">
            <div
              className="flex items-center gap-2.5 border border-b-0 border-brand-red/55 bg-gradient-to-b from-brand-red/45 via-red-950/95 to-zinc-950 px-9 py-2.5 text-brand-lime-soft shadow-[0_12px_40px_rgba(229,9,20,0.45)] sm:gap-3 sm:px-16 sm:py-3.5 [clip-path:polygon(5%_0,95%_0,100%_50%,95%_100%,5%_100%,0_50%)]"
              role="banner"
            >
              <Award className="h-4 w-4 shrink-0 text-brand-lime sm:h-5 sm:w-5" aria-hidden />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.42em] text-white/95 sm:text-[11px] sm:tracking-[0.5em]">
                Smokers Club
              </span>
            </div>
          </div>
          <div className="relative z-10 -mt-px sm:-mt-0.5">
            <div className="rounded-3xl border-2 border-brand-red/50 bg-gradient-to-b from-red-950/35 via-zinc-950/85 to-black p-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07),0_28px_72px_rgba(0,0,0,0.5),0_0_56px_rgba(229,9,20,0.16)]">
              <div className="rounded-[1.35rem] border border-white/[0.09] bg-gradient-to-b from-zinc-950/95 via-black/96 to-black px-3 py-8 sm:px-6 sm:py-11 md:px-8 md:py-14">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const emptyRow = () => Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);

export function SmokersClub() {
  const [zip, setZip] = useState<string | null>(null);
  const [marketName, setMarketName] = useState<string | null>(null);
  const [treeSlots, setTreeSlots] =
    useState<Awaited<ReturnType<typeof buildSmokersClubTreehouseRow>>>(emptyRow());
  const [loading, setLoading] = useState(true);
  const loadGenRef = useRef(0);
  /** Dedupe impression burst (e.g. React strict mode) per ZIP + tree layout. */
  const impressionsSentKeyRef = useRef<string | null>(null);

  const readStoredZip = () => {
    if (typeof window === 'undefined') return null;
    const z = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
    return z && z.length === 5 ? z : null;
  };

  /** Read ZIP before paint; default LA so market + tree queries are never stuck on null ZIP. */
  useLayoutEffect(() => {
    const z = readStoredZip();
    setZip(z ?? FALLBACK_LA_ZIP);
  }, []);

  useEffect(() => {
    const onZip = () => setZip(readStoredZip());
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('storage', onZip);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('storage', onZip);
    };
  }, []);

  useEffect(() => {
    if (!isVendorsSchema()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const gen = ++loadGenRef.current;
    setLoading(true);

    const safetyTimer = window.setTimeout(() => {
      if (cancelled || loadGenRef.current !== gen) return;
      console.warn('Smokers Club: load timed out, showing empty tree');
      setTreeSlots(emptyRow());
      setLoading(false);
    }, 30_000);

    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('smokers-club-timeout')), ms)),
      ]);

    (async () => {
      const zip5 = zip && zip.length === 5 ? zip : FALLBACK_LA_ZIP;
      try {
        await withTimeout(
          (async () => {
            const market = await getMarketForSmokersClub(zip5);
            if (cancelled || loadGenRef.current !== gen) return;
            setMarketName(market?.name ?? null);

            const candidates = await fetchLiveVendorsForSmokersClub(zip5);
            if (cancelled || loadGenRef.current !== gen) return;
            let row = await buildSmokersClubTreehouseRow(zip5, candidates);
            if (cancelled || loadGenRef.current !== gen) return;
            row = await applySmokersClubTestPins(row, candidates);
            if (cancelled || loadGenRef.current !== gen) return;
            setTreeSlots(row);
          })(),
          18_000
        );
      } catch (e) {
        console.error(e);
        if (loadGenRef.current === gen) setTreeSlots(emptyRow());
      } finally {
        window.clearTimeout(safetyTimer);
        if (loadGenRef.current === gen) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, [zip]);

  useEffect(() => {
    if (!isVendorsSchema() || loading) return;
    const key = `${zip ?? ''}:${treeSlots.map((v) => v?.id ?? '-').join(',')}`;
    if (treeSlots.every((v) => !v)) return;
    if (impressionsSentKeyRef.current === key) return;
    impressionsSentKeyRef.current = key;
    treeSlots.forEach((vendor, i) => {
      if (!vendor) return;
      const rank = i + 1;
      void trackEvent({
        eventType: 'smokers_club_tree_impression',
        vendorId: vendor.id,
        metadata: { slot_rank: rank, lane: 'treehouse', source: 'smokers_club_tree' },
      });
    });
  }, [zip, treeSlots, loading]);

  if (!isVendorsSchema()) {
    return (
      <SmokersClubBanner>
        <div className="mx-auto max-w-3xl text-center">
          <Award className="mx-auto mb-4 h-12 w-12 text-brand-lime" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Discover licensed shops</h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
            Search the directory and open any shop for menus, reviews, and pickup or delivery options. The full Smokers Club
            treehouse loads here when the app is configured for the licensed-vendor database.
          </p>
          <p className="mt-3 text-xs text-gray-600">
            Developers: set <code className="text-gray-500">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> in{' '}
            <code className="text-gray-500">.env.local</code> if you use <span className="text-gray-500">public.vendors</span>.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-brand-red text-white hover:bg-brand-red-deep">
              <Link href="/discover">Open directory</Link>
            </Button>
            <Button asChild variant="outline" className="border-brand-lime/40 text-brand-lime hover:bg-brand-lime/10">
              <Link href="/dispensaries">Dispensaries</Link>
            </Button>
          </div>
        </div>
      </SmokersClubBanner>
    );
  }

  const filled = treeSlots.filter(Boolean).length;

  if (loading) {
    return (
      <SmokersClubBanner>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="sr-only">Smokers Club</h2>
            <p className="text-lg font-medium text-gray-300 md:text-xl">Hanging the treehouse for your zone…</p>
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-gray-900/50 md:h-80" />
          </div>
        </div>
      </SmokersClubBanner>
    );
  }

  if (filled === 0) {
    return (
      <SmokersClubBanner>
        <div className="mx-auto max-w-6xl text-center">
          <Award className="mx-auto mb-5 h-14 w-14 text-brand-lime md:h-16 md:w-16" />
          <h2 className="sr-only">Smokers Club</h2>
          <p className="text-xl font-semibold tracking-tight text-white md:text-2xl">Your zone is warming up</p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-400 md:text-lg">
            {marketplaceCopy.smokersClubEmptyZipBody}
          </p>
        </div>
      </SmokersClubBanner>
    );
  }

  return (
    <SmokersClubBanner>
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="sr-only">Smokers Club</h2>
          <div className="relative mx-auto flex max-w-3xl justify-center">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-lime/15 blur-[72px] sm:h-64 sm:w-96 md:h-72 md:w-[28rem]"
              aria-hidden
            />
            <Image
              src="/brand/datreehouse-logo.png"
              alt={SITE_NAME}
              width={720}
              height={360}
              priority
              className="relative h-44 w-auto object-contain drop-shadow-[0_0_40px_rgba(229,9,20,0.4)] sm:h-52 md:h-64 lg:h-72 xl:h-80"
            />
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-base font-medium uppercase tracking-[0.35em] text-brand-lime-soft/90 md:mt-10 md:text-lg">
            {marketplaceCopy.siteTaglineLegal}
          </p>
          <p className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm text-gray-500 md:text-base">
            {marketName && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4 text-brand-lime" />
                {marketName}
              </span>
            )}
            {zip && (
              <Badge variant="outline" className="border-brand-red/40 text-gray-300">
                ZIP {zip}
              </Badge>
            )}
          </p>
        </div>

        <SmokersClubTreehouse lane="treehouse" hideHeader slots={treeSlots} />
      </div>
    </SmokersClubBanner>
  );
}
