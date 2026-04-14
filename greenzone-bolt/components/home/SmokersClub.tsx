'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SMOKERS_CLUB_SLOTS } from '@/lib/smokersClub';
import { SmokersClubShowcase } from '@/components/home/SmokersClubShowcase';
import { FALLBACK_LA_ZIP } from '@/lib/geoZip';
import type { PublicVendorCard } from '@/lib/vendorDeliveryList';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { readShopperGeo, SHOPPER_ZIP_STORAGE_KEY } from '@/lib/shopperLocation';

function ClubStageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl ring-1 ring-amber-500/25 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_24px_80px_-24px_rgba(245,158,11,0.12)]',
        className
      )}
    >
      {/* Warm premium band — slow gradient drift */}
      <div
        className="pointer-events-none absolute inset-0 z-0 animate-club-band"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(180,83,9,0.22) 0%, rgba(9,9,11,0.97) 36%, rgba(245,158,11,0.08) 52%, rgba(9,9,11,0.98) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-0 z-0 h-[120%] w-[min(55%,380px)] opacity-[0.09]"
        aria-hidden
      >
        <svg viewBox="0 0 200 260" className="h-full w-full text-amber-300" fill="currentColor">
          <title> </title>
          <path d="M100 4 L172 96 H142 L188 154 H154 L196 220 H4 L46 154 H28 L58 96 H28 Z" />
          <rect x="82" y="218" width="36" height="38" rx="3" />
        </svg>
      </div>

      <div className="relative z-[1] px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5 md:px-8 md:pb-8 md:pt-6">
        {children}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-amber-500/10 pt-4 sm:mt-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 rounded-full border border-amber-500/25 bg-black/30 text-amber-100/90 hover:bg-amber-950/40 hover:text-white"
          >
            <Link href="/discover" className="inline-flex items-center gap-1">
              Full discover
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-9 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 px-4 font-semibold text-black shadow-md shadow-amber-900/30 hover:from-amber-500 hover:to-amber-400"
          >
            <Link href="/dispensaries?sort=nearest">All dispensaries</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const emptyRow = () => Array.from({ length: SMOKERS_CLUB_SLOTS }, () => null);

function normalizeTreeSlots(raw: unknown): (PublicVendorCard | null)[] {
  if (!Array.isArray(raw) || raw.length !== SMOKERS_CLUB_SLOTS) return emptyRow();
  return raw as (PublicVendorCard | null)[];
}

export function SmokersClub() {
  /** Start with fallback ZIP so the tree request runs on first paint (no wait for layout). */
  const [zip, setZip] = useState<string>(FALLBACK_LA_ZIP);
  const [treeSlots, setTreeSlots] = useState<(PublicVendorCard | null)[]>(emptyRow());
  const [vendorsSchemaActive, setVendorsSchemaActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const loadGenRef = useRef(0);
  const impressionsSentKeyRef = useRef<string | null>(null);

  const readStoredZip = () => {
    if (typeof window === 'undefined') return null;
    const z = localStorage.getItem(SHOPPER_ZIP_STORAGE_KEY);
    return z && z.length === 5 ? z : null;
  };

  useLayoutEffect(() => {
    const z = readStoredZip();
    if (z) setZip(z);
  }, []);

  const [geoTick, setGeoTick] = useState(0);
  useEffect(() => {
    const onZip = () => setZip(readStoredZip() ?? FALLBACK_LA_ZIP);
    const onGeo = () => setGeoTick((t) => t + 1);
    window.addEventListener('datreehouse:zip', onZip);
    window.addEventListener('datreehouse:geo', onGeo);
    window.addEventListener('storage', onZip);
    return () => {
      window.removeEventListener('datreehouse:zip', onZip);
      window.removeEventListener('datreehouse:geo', onGeo);
      window.removeEventListener('storage', onZip);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const gen = ++loadGenRef.current;
    setLoading(true);

    const safetyTimer = window.setTimeout(() => {
      if (cancelled || loadGenRef.current !== gen) return;
      console.warn('Smokers Club: load timed out, showing empty slots');
      setTreeSlots(emptyRow());
      setVendorsSchemaActive(true);
      setLoading(false);
    }, 14_000);

    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('smokers-club-timeout')), ms)),
      ]);

    const zip5 = zip && zip.length === 5 ? zip : FALLBACK_LA_ZIP;
    const geo = readShopperGeo();
    const treeUrl = new URL('/api/smokers-club/tree', window.location.origin);
    treeUrl.searchParams.set('zip', zip5);
    if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      treeUrl.searchParams.set('lat', String(geo.lat));
      treeUrl.searchParams.set('lng', String(geo.lng));
    }

    (async () => {
      try {
        await withTimeout(
          (async () => {
            const res = await fetch(treeUrl.toString(), {
              cache: 'no-store',
            });
            if (!res.ok) {
              const t = await res.text();
              throw new Error(t || String(res.status));
            }
            const data = (await res.json()) as {
              vendors_schema: boolean;
              market_name: string | null;
              slots: unknown;
            };
            if (cancelled || loadGenRef.current !== gen) return;

            if (!data.vendors_schema) {
              setVendorsSchemaActive(false);
              setTreeSlots(emptyRow());
              return;
            }

            setVendorsSchemaActive(true);
            setTreeSlots(normalizeTreeSlots(data.slots));
          })(),
          10_000
        );
      } catch (e) {
        console.error(e);
        if (loadGenRef.current === gen) {
          setTreeSlots(emptyRow());
          setVendorsSchemaActive(true);
        }
      } finally {
        window.clearTimeout(safetyTimer);
        if (loadGenRef.current === gen) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, [zip, geoTick]);

  useEffect(() => {
    if (vendorsSchemaActive !== true || loading) return;
    const key = `${zip ?? ''}:${treeSlots.map((v) => v?.id ?? '-').join(',')}`;
    if (treeSlots.every((v) => !v)) return;
    if (impressionsSentKeyRef.current === key) return;
    impressionsSentKeyRef.current = key;
    treeSlots.forEach((vendor, i) => {
      if (!vendor) return;
      void trackEvent({
        eventType: 'smokers_club_tree_impression',
        vendorId: vendor.id,
        metadata: {
          trophy_tier: vendor.smokers_club_trophy ?? null,
          visual_slot: i + 1,
          lane: 'treehouse',
          source: 'smokers_club_tree',
        },
      });
    });
  }, [zip, treeSlots, loading, vendorsSchemaActive]);

  if (!loading && vendorsSchemaActive === false) {
    return (
      <ClubStageShell>
        <div className="mx-auto max-w-lg py-6 text-center sm:py-8">
          <p className="text-lg font-medium text-white">Directory mode</p>
          <p className="mt-2 text-sm text-zinc-400">
            Smokers Club needs the vendors schema. Browse all licensed shops in the meantime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full bg-brand-red text-white hover:bg-brand-red-deep">
              <Link href="/discover">Open discover</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-amber-500/35 text-amber-100 hover:bg-amber-950/35"
            >
              <Link href="/dispensaries">Dispensaries</Link>
            </Button>
          </div>
        </div>
      </ClubStageShell>
    );
  }

  if (loading) {
    return (
      <ClubStageShell>
        <div className="mx-auto max-w-6xl">
          <div className="sr-only">Smokers Club loading</div>
          <SmokersClubShowcase lane="treehouse" slots={emptyRow()} trophyVisualTopSlots={3} zipCode={zip} />
          <p className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">Loading lineup…</p>
        </div>
      </ClubStageShell>
    );
  }

  const filled = treeSlots.filter(Boolean).length;

  if (filled === 0) {
    return (
      <ClubStageShell>
        <div className="mx-auto max-w-lg py-8 text-center sm:py-10">
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Your zone is warming up</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            No Smokers Club shops on the tree for this area yet. Try another ZIP in the header or explore the full
            directory.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-8 rounded-full border-amber-500/35 text-amber-100 hover:bg-amber-950/40"
          >
            <Link href="/dispensaries?sort=nearest">Browse all stores</Link>
          </Button>
        </div>
      </ClubStageShell>
    );
  }

  return (
    <ClubStageShell>
      <div className="mx-auto max-w-6xl">
        <SmokersClubShowcase lane="treehouse" slots={treeSlots} trophyVisualTopSlots={3} zipCode={zip} />
      </div>
    </ClubStageShell>
  );
}
