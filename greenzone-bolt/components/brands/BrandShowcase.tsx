import Link from 'next/link';
import { ExternalLink, Instagram, Sparkles, Store } from 'lucide-react';
import type { BrandShowcaseData, BrandShowcaseTheme } from '@/lib/brandShowcaseLoad';
import { listingHrefForVendor } from '@/lib/listingPath';
import { SITE_IMAGE_SLOTS } from '@/lib/siteImageSlots';
import { OptimizedImg } from '@/components/media/OptimizedImg';
import { cn } from '@/lib/utils';

const THEME_STYLES: Record<
  BrandShowcaseTheme,
  {
    mesh: string;
    orbA: string;
    orbB: string;
    accent: string;
    accentMuted: string;
    chip: string;
    cardBorder: string;
  }
> = {
  emerald: {
    mesh: 'from-emerald-500/[0.12] via-zinc-950 to-lime-400/[0.08]',
    orbA: 'bg-emerald-500/25 blur-[100px]',
    orbB: 'bg-lime-400/15 blur-[120px]',
    accent: 'text-emerald-300',
    accentMuted: 'text-emerald-200/70',
    chip: 'border-emerald-400/25 bg-emerald-950/50 text-emerald-100/90',
    cardBorder: 'border-emerald-500/15 hover:border-emerald-400/35',
  },
  violet: {
    mesh: 'from-violet-600/[0.18] via-zinc-950 to-fuchsia-500/[0.1]',
    orbA: 'bg-violet-500/30 blur-[100px]',
    orbB: 'bg-fuchsia-500/20 blur-[120px]',
    accent: 'text-violet-300',
    accentMuted: 'text-violet-200/70',
    chip: 'border-violet-400/25 bg-violet-950/50 text-violet-100/90',
    cardBorder: 'border-violet-500/15 hover:border-violet-400/35',
  },
  sunset: {
    mesh: 'from-orange-500/[0.14] via-zinc-950 to-rose-500/[0.12]',
    orbA: 'bg-orange-500/25 blur-[100px]',
    orbB: 'bg-rose-500/20 blur-[120px]',
    accent: 'text-orange-300',
    accentMuted: 'text-orange-200/70',
    chip: 'border-orange-400/25 bg-orange-950/40 text-orange-100/90',
    cardBorder: 'border-orange-500/15 hover:border-orange-400/35',
  },
  ocean: {
    mesh: 'from-cyan-500/[0.14] via-zinc-950 to-sky-600/[0.1]',
    orbA: 'bg-cyan-500/25 blur-[100px]',
    orbB: 'bg-sky-500/20 blur-[120px]',
    accent: 'text-cyan-300',
    accentMuted: 'text-cyan-200/70',
    chip: 'border-cyan-400/25 bg-cyan-950/45 text-cyan-100/90',
    cardBorder: 'border-cyan-500/15 hover:border-cyan-400/35',
  },
  mono: {
    mesh: 'from-zinc-500/[0.12] via-zinc-950 to-zinc-800/[0.08]',
    orbA: 'bg-zinc-500/20 blur-[100px]',
    orbB: 'bg-zinc-400/10 blur-[120px]',
    accent: 'text-zinc-200',
    accentMuted: 'text-zinc-400',
    chip: 'border-zinc-600/40 bg-zinc-900/60 text-zinc-200',
    cardBorder: 'border-zinc-700/40 hover:border-zinc-500/50',
  },
};

function firstCatalogImage(images: unknown): string {
  if (!Array.isArray(images)) return '';
  for (const x of images) {
    const s = String(x || '').trim();
    if (/^https?:\/\//i.test(s)) return s;
  }
  return '';
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function instagramHref(raw: string): { href: string; label: string } {
  const t = raw.trim();
  if (!t) return { href: '#', label: '' };
  if (/^https?:\/\//i.test(t)) return { href: t, label: 'Instagram' };
  const handle = t.replace(/^@/, '');
  return { href: `https://instagram.com/${handle}`, label: `@${handle}` };
}

export function BrandShowcase({ data }: { data: BrandShowcaseData }) {
  const { brand, catalog, retailers } = data;
  const th = THEME_STYLES[brand.page_theme];
  const placeholder = SITE_IMAGE_SLOTS.productPlaceholder;
  const catalogWithPhotos = catalog.filter((p) => Boolean(firstCatalogImage(p.images)));
  const ig = brand.social_instagram ? instagramHref(brand.social_instagram) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100',
          th.mesh
        )}
        aria-hidden
      />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full opacity-70 md:h-96 md:w-96" aria-hidden>
        <div className={cn('h-full w-full rounded-full', th.orbA)} />
      </div>
      <div className="pointer-events-none absolute -right-24 bottom-40 h-80 w-80 rounded-full opacity-60" aria-hidden>
        <div className={cn('h-full w-full rounded-full', th.orbB)} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/brands"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            ← All brands
          </Link>
          <Link
            href="/discover"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            Discover shops
          </Link>
        </nav>

        <header className="relative mb-16 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/30 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {brand.hero_image_url ? (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.hero_image_url}
                alt=""
                className="h-full w-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            </div>
          ) : null}

          <div className="relative flex flex-col gap-8 p-8 sm:flex-row sm:items-end sm:p-12">
            <div className="flex shrink-0 justify-center sm:justify-start">
              <div
                className={cn(
                  'relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border bg-zinc-900/80 shadow-xl sm:h-44 sm:w-44',
                  th.cardBorder
                )}
              >
                {brand.logo_url ? (
                  <OptimizedImg
                    src={brand.logo_url}
                    alt=""
                    className="h-full w-full object-contain p-3"
                    preset="card"
                  />
                ) : (
                  <span className={cn('text-5xl font-black tracking-tighter', th.accent)}>
                    {brand.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">{brand.name}</h1>
                {brand.verified ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      th.chip
                    )}
                  >
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Verified brand
                  </span>
                ) : null}
              </div>
              {brand.tagline ? (
                <p className={cn('mt-3 max-w-2xl text-lg leading-relaxed sm:text-xl', th.accentMuted)}>
                  {brand.tagline}
                </p>
              ) : (
                <p className={cn('mt-3 max-w-2xl text-base', th.accentMuted)}>
                  Product lineup and stores that may carry this brand on GreenZone.
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {brand.website_url ? (
                  <a
                    href={brand.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-white/5',
                      th.chip
                    )}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Official site
                  </a>
                ) : null}
                {ig && ig.href !== '#' ? (
                  <a
                    href={ig.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-white/5',
                      th.chip
                    )}
                  >
                    <Instagram className="h-4 w-4" aria-hidden />
                    {ig.label}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {brand.about ? (
          <section className="mb-20">
            <h2 className={cn('mb-4 text-xs font-semibold uppercase tracking-[0.2em]', th.accentMuted)}>About</h2>
            <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-6 backdrop-blur-md sm:p-8">
              <div className="prose prose-invert prose-p:text-zinc-300 prose-p:leading-relaxed max-w-none">
                {brand.about.split('\n').map((para, i) =>
                  para.trim() ? (
                    <p key={i} className="mb-4 last:mb-0">
                      {para}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mb-20">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={cn('text-xs font-semibold uppercase tracking-[0.2em]', th.accentMuted)}>Lineup</h2>
              <p className="mt-1 text-2xl font-semibold text-white">Signature products</p>
              <p className="mt-1 max-w-xl text-sm text-zinc-500">
                From our master catalog — what shops can add to menus. Products with photos are shown first.
              </p>
            </div>
          </div>

          {catalogWithPhotos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-zinc-500">
              No catalog photos yet for this brand. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalogWithPhotos.map((p, idx) => {
                const img = firstCatalogImage(p.images) || placeholder;
                const tall = idx % 5 === 0;
                return (
                  <article
                    key={p.id}
                    className={cn(
                      'group flex flex-col overflow-hidden rounded-2xl border bg-zinc-900/40 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-900/60 hover:shadow-xl',
                      th.cardBorder,
                      tall ? 'lg:row-span-1' : ''
                    )}
                  >
                    <div className={cn('relative w-full overflow-hidden bg-black/50', tall ? 'aspect-[4/5] sm:aspect-[3/4]' : 'aspect-[4/3]')}>
                      <OptimizedImg
                        src={img}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        preset="card"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-16">
                        <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', th.chip)}>
                          {formatCategory(p.category)}
                        </span>
                        <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">{p.name}</h3>
                        {(p.potency_thc != null || p.potency_cbd != null) && (
                          <p className="mt-1 text-xs text-zinc-400">
                            {p.potency_thc != null ? `THC ${p.potency_thc}%` : ''}
                            {p.potency_thc != null && p.potency_cbd != null ? ' · ' : ''}
                            {p.potency_cbd != null ? `CBD ${p.potency_cbd}%` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {p.description ? (
                      <p className="line-clamp-3 p-4 text-sm leading-relaxed text-zinc-500">{p.description}</p>
                    ) : (
                      <div className="p-4" />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-6">
            <h2 className={cn('text-xs font-semibold uppercase tracking-[0.2em]', th.accentMuted)}>On menus now</h2>
            <p className="mt-1 text-2xl font-semibold text-white">Shops that may carry {brand.name}</p>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Live storefronts with in-stock items linked to this brand (by catalog link or matching shelf name).
            </p>
          </div>

          {retailers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-zinc-500">
              <Store className="mx-auto mb-3 h-10 w-10 opacity-40" aria-hidden />
              No live menus list this brand yet — browse{' '}
              <Link href="/discover" className={cn('underline underline-offset-2', th.accent)}>
                Discover
              </Link>{' '}
              for nearby shops.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {retailers.map((r) => (
                <li key={r.id}>
                  <Link
                    href={listingHrefForVendor(r)}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border bg-black/25 p-4 backdrop-blur-md transition hover:bg-black/40',
                      th.cardBorder
                    )}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                      {r.logo_url ? (
                        <OptimizedImg src={r.logo_url} alt="" className="h-full w-full object-cover" preset="thumb" />
                      ) : (
                        <Store className="h-6 w-6 text-zinc-600" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        {r.productCount} in-stock {r.productCount === 1 ? 'match' : 'matches'}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-xs font-medium', th.accent)}>View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
