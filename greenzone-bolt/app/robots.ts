import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { isIndexingEnabled } from '@/lib/seoIndexing';

/** Next.js chunks, CSS, and data — must stay crawlable so Google can render real HTML. */
const NEXT_ASSET_ALLOWS = ['/_next/', '/_next/static/', '/_next/image', '/_next/data/'];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  if (!isIndexingEnabled()) {
    return {
      rules: {
        userAgent: '*',
        // Allow is emitted before Disallow (Next resolver) so Google can fetch JS/CSS while HTML URLs stay discouraged.
        allow: NEXT_ASSET_ALLOWS,
        disallow: '/',
      },
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: ['/', ...NEXT_ASSET_ALLOWS],
      disallow: ['/account/', '/vendor/', '/admin/', '/cart/', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
