'use client';

import Link from 'next/link';
import { Package, Sparkles, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { cn } from '@/lib/utils';
import { sanitizeDisplayImageUrl } from '@/lib/optimizedImageUrl';
import type { SupplyDealPin } from '@/lib/supplyBuyerListingSort';

type Props = {
  title: string;
  category: string;
  imageUrl: string | null;
  listPriceLabel: string;
  moq: number | null;
  caseSize: string | null;
  deal: SupplyDealPin | null;
  showcaseRank: number | null;
  inDraft: boolean;
  listingHref: string;
  rfqHref: string;
  onAddToRfq: () => void;
};

export function SupplyBuyerListingCard({
  title,
  category,
  imageUrl,
  listPriceLabel,
  moq,
  caseSize,
  deal,
  showcaseRank,
  inDraft,
  listingHref,
  rfqHref,
  onAddToRfq,
}: Props) {
  const safeImg = imageUrl ? sanitizeDisplayImageUrl(imageUrl) : '';

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-zinc-800/80 bg-zinc-950/60 shadow-lg shadow-black/20 transition hover:border-emerald-700/40 hover:bg-zinc-900/70">
      <Link href={listingHref} className="relative block aspect-[4/3] overflow-hidden bg-zinc-900">
        {safeImg ? (
          <OptimizedImg
            src={safeImg}
            alt=""
            preset="card"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <Package className="h-14 w-14 text-zinc-600" aria-hidden />
          </div>
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {deal ? (
            <Badge className="max-w-[85%] border-amber-600/40 bg-amber-950/95 text-[10px] font-medium text-amber-100">
              <Tag className="mr-1 inline h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{deal.headline}</span>
              {deal.discountPercent != null ? (
                <span className="ml-1 shrink-0 text-amber-200/90">· {deal.discountPercent}%</span>
              ) : null}
            </Badge>
          ) : null}
          {showcaseRank != null && showcaseRank >= 1 ? (
            <Badge variant="outline" className="border-emerald-700/50 bg-emerald-950/90 text-[10px] text-emerald-200">
              <Sparkles className="mr-1 inline h-3 w-3" aria-hidden />
              Featured
            </Badge>
          ) : null}
        </div>
        {inDraft ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-sky-600/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            In RFQ
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={listingHref} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-emerald-300 sm:text-base">
            {title}
          </h3>
        </Link>
        <p className="mt-1 text-[11px] capitalize text-zinc-500 sm:text-xs">{category}</p>
        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 sm:text-xs">
          <span>{listPriceLabel}</span>
          {moq != null ? <span>MOQ {moq}</span> : null}
          {caseSize ? <span className="truncate">{caseSize}</span> : null}
        </dl>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <Button
            type="button"
            size="sm"
            className="w-full bg-sky-600 hover:bg-sky-500"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToRfq();
            }}
          >
            {inDraft ? 'Update in RFQ' : 'Add to RFQ'}
          </Button>
          <Link
            href={listingHref}
            className={cn(
              'text-center text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline',
              'sm:text-xs'
            )}
          >
            Details
          </Link>
          <Link href={rfqHref} className="text-center text-[10px] text-zinc-600 hover:text-sky-400 sm:text-[11px]">
            Open RFQ draft →
          </Link>
        </div>
      </div>
    </Card>
  );
}
