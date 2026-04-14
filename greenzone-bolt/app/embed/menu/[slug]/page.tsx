'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Loader2 } from 'lucide-react';
import { ListingPublicMenu } from '@/components/listing/ListingPublicMenu';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import { listingHrefForVendor, listingPathSegmentForVendor } from '@/lib/listingPath';
import { getSiteUrl } from '@/lib/siteUrl';
import type { VendorSkuCardThemeInput } from '@/lib/vendorSkuCardTheme';

type VendorRow = Record<string, unknown> & {
  id?: string;
  slug?: string | null;
  name?: string | null;
  state?: string | null;
};

/**
 * Public menu iframe: `/embed/menu/{slug}`.
 * CSP `frame-ancestors` is set in root middleware from `vendor_menu_embed_origins`.
 */
export default function EmbedMenuPage() {
  const params = useParams();
  const segment = decodeURIComponent(String(params.slug ?? '')).trim();
  const vendorsSchema = useVendorsSchema();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!segment) {
        setNotFound(true);
        setVendor(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/public/vendor/${encodeURIComponent(segment)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            setVendor(null);
            setNotFound(true);
          }
          return;
        }
        const payload = (await res.json()) as { source?: string; row?: VendorRow };
        const row = payload.row;
        if (!row || (payload.source !== 'vendors' && payload.source !== 'vendor_profiles')) {
          if (!cancelled) {
            setVendor(null);
            setNotFound(true);
          }
          return;
        }
        if (!cancelled) setVendor(row);
      } catch {
        if (!cancelled) {
          setVendor(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [segment]);

  const vendorId = vendor?.id ? String(vendor.id) : '';
  const vendorName = publicEmbedVendorName(vendor);
  const vendorState = vendor?.state != null ? String(vendor.state) : null;
  const menuEnabled = vendor ? vendorRowPublicMenuEnabled(vendor) : false;

  const listingTopUrl = useMemo(() => {
    if (!vendorId) return '';
    const path = listingHrefForVendor({
      id: vendorId,
      slug: typeof vendor?.slug === 'string' ? vendor.slug : undefined,
    });
    return `${getSiteUrl()}${path}`;
  }, [vendor, vendorId]);

  const skuCardTheme: VendorSkuCardThemeInput | null = useMemo(() => {
    if (!vendor) return null;
    return {
      preset: vendor.sku_card_preset as string | null | undefined,
      backgroundUrl: vendor.sku_card_background_url as string | null | undefined,
      overlayOpacity: vendor.sku_card_overlay_opacity as number | null | undefined,
    };
  }, [vendor]);

  if (!vendorsSchema) {
    return (
      <div className="min-h-[50vh] bg-black px-4 py-10 text-center text-gray-400">
        <p>This embed requires the licensed catalog (vendors + products) to be enabled.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-black text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-brand-lime" aria-hidden />
      </div>
    );
  }

  if (notFound || !vendor || !vendorId) {
    return (
      <div className="min-h-[40vh] bg-black px-4 py-12 text-center text-gray-400">
        <p className="text-lg text-white">Store not found</p>
        <p className="mt-2 text-sm">Check the embed URL or ask the shop for an updated link.</p>
      </div>
    );
  }

  if (!menuEnabled) {
    return (
      <div className="min-h-[40vh] bg-black px-4 py-12 text-center text-gray-400">
        <p className="text-lg text-white">Online menu is off</p>
        <p className="mt-2 text-sm">This shop has disabled public menu browsing.</p>
      </div>
    );
  }

  const pathSeg = listingPathSegmentForVendor({
    id: vendorId,
    slug: typeof vendor.slug === 'string' ? vendor.slug : undefined,
  });

  return (
    <div id="embed-menu-root" className="min-h-0 flex-1 bg-black text-gray-100">
      <div className="sticky top-0 z-20 border-b border-emerald-900/30 bg-zinc-950/95 px-3 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-white">{vendorName}</p>
          <Link
            href={listingHrefForVendor({ id: vendorId, slug: typeof vendor.slug === 'string' ? vendor.slug : null })}
            target="_top"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Open full store
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <ListingPublicMenu
          vendorId={vendorId}
          vendorName={vendorName}
          vendorState={vendorState}
          skuCardTheme={skuCardTheme}
          embedListingTopUrl={listingTopUrl}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        Menu embed for {pathSeg}
      </p>
    </div>
  );
}

function publicEmbedVendorName(v: VendorRow | null): string {
  if (!v) return 'Menu';
  const n = typeof v.name === 'string' ? v.name.trim() : '';
  return n || 'Menu';
}
