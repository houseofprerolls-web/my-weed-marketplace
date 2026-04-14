'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { cn } from '@/lib/utils';
import { BRAND_INDEX_CARD_THEME, resolveBrandPageThemeId } from '@/lib/brandShowcaseThemes';
import { sanitizeDisplayImageUrl } from '@/lib/optimizedImageUrl';
import type { SupplyCoverageKind } from '@/lib/usStateCodes';

export type SupplyDirectoryBrandEmbed = {
  logo_url: string | null;
  hero_image_url: string | null;
  page_theme: string | null;
  slug: string;
  tagline: string | null;
} | null;

export type SupplyDirectoryRow = {
  id: string;
  name: string;
  slug: string;
  account_type: string;
  brand_id: string | null;
  service_listing_market_slugs: string[] | null;
  brands: SupplyDirectoryBrandEmbed;
};

type CoverageBadge = { kind: SupplyCoverageKind; label: string } | null;

type Props = {
  row: SupplyDirectoryRow;
  href: string;
  coverage: CoverageBadge;
  density: 'comfortable' | 'compact';
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SupplyDirectorySupplierCard({ row, href, coverage, density }: Props) {
  const b = row.brands;
  const themeId = resolveBrandPageThemeId(b?.page_theme ?? null);
  const th = BRAND_INDEX_CARD_THEME[themeId];
  const logoOk = Boolean(b?.logo_url && sanitizeDisplayImageUrl(b.logo_url));
  const heroOk = Boolean(b?.hero_image_url && sanitizeDisplayImageUrl(b.hero_image_url));
  const compact = density === 'compact';
  const heroH = compact ? 'h-16' : 'h-24 sm:h-28';

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={cn(
          'relative h-full overflow-hidden border transition',
          'border-white/[0.08] bg-gradient-to-br shadow-lg',
          th.mesh,
          th.glow,
          'hover:border-sky-500/35 hover:shadow-sky-900/20'
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden bg-gradient-to-br',
            heroH,
            th.heroTint,
            heroOk ? '' : 'from-zinc-900/90 to-black'
          )}
        >
          {heroOk ? (
            <OptimizedImg
              src={b!.hero_image_url!}
              alt=""
              role="presentation"
              preset="hero"
              className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-65"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end gap-3">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/15 bg-black/60 shadow-lg backdrop-blur-sm',
                compact ? 'h-12 w-12 text-sm' : 'h-14 w-14 text-base sm:h-16 sm:w-16 sm:text-lg'
              )}
            >
              {logoOk ? (
                <OptimizedImg
                  src={b!.logo_url!}
                  alt={`${row.name} logo`}
                  preset="thumb"
                  className="h-full w-full object-contain p-1"
                />
              ) : row.account_type === 'distributor' ? (
                <Package className={cn('text-sky-300', compact ? 'h-6 w-6' : 'h-7 w-7')} aria-hidden />
              ) : (
                <span className="font-bold tracking-tight text-white">{initialsFromName(row.name)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <h2 className={cn('truncate font-semibold text-white', compact ? 'text-sm' : 'text-base sm:text-lg')}>
                {row.name}
              </h2>
              {b?.tagline ? (
                <p className={cn('truncate text-zinc-300/90', compact ? 'text-[10px]' : 'text-xs')}>{b.tagline}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cn('space-y-2', compact ? 'p-3' : 'p-4')}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="border-zinc-700/80 bg-zinc-900/80 text-[10px] uppercase tracking-wide text-zinc-300">
              {row.account_type}
            </Badge>
            {coverage ? (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  coverage.kind === 'overlap'
                    ? 'border-emerald-700/60 text-emerald-300'
                    : coverage.kind === 'none'
                      ? 'border-amber-800/60 text-amber-200/90'
                      : 'border-zinc-600 text-zinc-400'
                )}
              >
                {coverage.label}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="truncate font-mono">@{row.slug}</span>
          </div>
          <p className={cn('font-medium', th.accent, compact ? 'text-[10px]' : 'text-xs')}>View catalog &amp; RFQ →</p>
        </div>
      </Card>
    </Link>
  );
}
