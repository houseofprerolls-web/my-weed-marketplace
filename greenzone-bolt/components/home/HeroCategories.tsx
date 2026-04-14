'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SmokersClubCategorySlug } from '@/lib/smokersClubCategory';
import {
  SMOKERS_CLUB_CATEGORY_IMAGE_OBJECT_POSITION,
  SMOKERS_CLUB_CATEGORY_IMAGE_PATHS,
} from '@/lib/smokersClubCategory';
import { DaTreehouseCategoryCardBackdrop } from '@/components/datreehouse/DaTreehouseCategoryCardBackdrop';

const items: { name: string; slug: SmokersClubCategorySlug }[] = [
  { name: 'Flower', slug: 'flower' },
  { name: 'Edibles', slug: 'edibles' },
  { name: 'Pre-Rolls', slug: 'pre-rolls' },
  { name: 'Vapes', slug: 'vapes' },
  { name: 'Concentrates', slug: 'concentrates' },
  { name: 'CBD', slug: 'cbd' },
];

function CategoryThumb({
  slug,
  sizePx,
  className,
}: {
  slug: SmokersClubCategorySlug;
  sizePx: number;
  className?: string;
}) {
  const src = SMOKERS_CLUB_CATEGORY_IMAGE_PATHS[slug];
  const objectPosition = SMOKERS_CLUB_CATEGORY_IMAGE_OBJECT_POSITION[slug] ?? '50% 50%';
  return (
    <span
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10 shadow-md',
        className
      )}
      style={{ width: sizePx, height: sizePx }}
    >
      <Image
        src={src}
        alt=""
        width={sizePx * 2}
        height={sizePx * 2}
        className="h-full w-full object-cover"
        style={{ objectPosition }}
        sizes={`${sizePx}px`}
      />
    </span>
  );
}

function CategoryChipLink({
  c,
  compact,
  fillRow,
}: {
  c: (typeof items)[number];
  compact?: boolean;
  /** When set, chips share row width evenly on `sm+` (typical hero strip). */
  fillRow?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={`/smokers-club/category/${c.slug}`}
        title={c.name}
        className={cn(
          'group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border border-amber-500/25 py-1.5 pl-1.5 pr-2.5 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ring-1 ring-amber-500/20 transition hover:border-brand-red/40 hover:ring-brand-red/25',
          fillRow && 'sm:min-w-0 sm:flex-1 sm:justify-center'
        )}
      >
        <DaTreehouseCategoryCardBackdrop variant="chip" />
        <div className="relative z-[1] flex min-w-0 items-center gap-1.5">
          <CategoryThumb slug={c.slug} sizePx={38} className="group-hover:ring-brand-red/30" />
          <span className="max-w-[5rem] truncate text-[10px] font-medium text-zinc-100 group-hover:text-white sm:max-w-[6rem] sm:text-[11px]">
            {c.name}
          </span>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={`/smokers-club/category/${c.slug}`}
      className={cn(
        'group relative flex min-w-[6rem] shrink-0 flex-col items-center gap-2 overflow-hidden rounded-xl border border-amber-500/25 px-2 py-3 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] ring-1 ring-amber-500/20 transition hover:border-brand-red/40 hover:ring-brand-red/25 sm:min-w-0 sm:px-3',
        fillRow && 'sm:flex-1'
      )}
    >
      <DaTreehouseCategoryCardBackdrop variant="chip" />
      <div className="relative z-[1] flex flex-col items-center gap-2">
        <CategoryThumb slug={c.slug} sizePx={52} className="group-hover:ring-brand-red/35" />
        <span className="text-center text-[11px] font-medium leading-tight text-zinc-100 group-hover:text-white">
          {c.name}
        </span>
      </div>
    </Link>
  );
}

type ChipsJustify = 'start' | 'end' | 'center';

/** Inline category chips (header ZIP row or compact strips). */
export function SmokersClubCategoryChipsRow({
  className,
  justify = 'end',
}: {
  className?: string;
  justify?: ChipsJustify;
}) {
  const fillRow = justify === 'center';
  const rowJustify =
    justify === 'end'
      ? 'justify-start sm:justify-end'
      : justify === 'center'
        ? 'justify-start'
        : 'justify-start';
  return (
    <div className={cn('w-full min-w-0', className)}>
      <p className="sr-only">Shop by category</p>
      <div
        className={cn(
          'flex w-full gap-3 overflow-x-auto pb-0.5 pt-0.5 [scrollbar-width:thin] sm:gap-4 sm:overflow-visible sm:pb-0 md:gap-5',
          rowJustify
        )}
      >
        {items.map((c) => (
          <CategoryChipLink key={c.slug} c={c} compact={true} fillRow={fillRow} />
        ))}
      </div>
    </div>
  );
}

export function HeroCategories({ className }: { className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        Shop by category
      </p>
      <div className="flex w-full gap-3 overflow-x-auto pb-1 pt-0.5 sm:justify-between sm:gap-4 sm:overflow-visible md:gap-5">
        {items.map((c) => (
          <CategoryChipLink key={c.slug} c={c} compact={false} fillRow />
        ))}
      </div>
    </div>
  );
}
