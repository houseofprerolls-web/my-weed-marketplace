import { getSiteUrl } from '@/lib/siteUrl';

/**
 * SEO safety switch:
 * - Default: non-indexable unless explicitly enabled
 * - Production launch: set NEXT_PUBLIC_ALLOW_INDEXING=1
 */
export function isIndexingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === '1';
}

export function siteHost(): string {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return 'www.datreehouse.com';
  }
}

/** Align child routes with root layout when the SEO launch flag is off. */
export function indexingRobotsForPublicPages(): { index: boolean; follow: boolean } {
  return isIndexingEnabled() ? { index: true, follow: true } : { index: false, follow: false };
}
