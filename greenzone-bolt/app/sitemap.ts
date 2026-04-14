import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { createSupabaseAnonServer } from '@/lib/supabaseServerAnon';
import { fetchAllSupabasePages } from '@/lib/supabasePaginate';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { isIndexingEnabled } from '@/lib/seoIndexing';
import { listingHrefForVendor } from '@/lib/listingPath';

const STATIC_PATHS: {
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}[] =
  [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/discover', changeFrequency: 'daily', priority: 0.95 },
    { path: '/map', changeFrequency: 'daily', priority: 0.9 },
    { path: '/feed', changeFrequency: 'daily', priority: 0.85 },
    { path: '/dispensaries', changeFrequency: 'daily', priority: 0.9 },
    { path: '/deals', changeFrequency: 'daily', priority: 0.85 },
    { path: '/strains', changeFrequency: 'daily', priority: 0.85 },
    { path: '/brands', changeFrequency: 'daily', priority: 0.8 },
    { path: '/search', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/pricing', changeFrequency: 'monthly', priority: 0.85 },
    { path: '/business', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/vendor/onboarding', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/help', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/compliance', changeFrequency: 'yearly', priority: 0.35 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/order-refund-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/community-guidelines', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/vendor-agreement', changeFrequency: 'yearly', priority: 0.35 },
    { path: '/advertising-policy', changeFrequency: 'yearly', priority: 0.35 },
    { path: '/guides', changeFrequency: 'weekly', priority: 0.75 },
    { path: '/guides/how-cannabis-delivery-works', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/guides/how-to-read-a-coa', changeFrequency: 'monthly', priority: 0.7 },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingEnabled()) return [];
  const base = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const client = createSupabaseAnonServer();
  if (!client) return entries;

  try {
    if (resolveUseVendorsTableForDiscovery()) {
      const { rows, error } = await fetchAllSupabasePages<{ id: string; slug?: string | null }>(
        async (from, to) => {
          const { data, error: e } = await client.from('vendors').select('id,slug').range(from, to);
          return { data, error: e ? { message: e.message } : null };
        },
        { pageSize: 1000, maxPages: 50 }
      );
      if (!error) {
        for (const r of rows) {
          if (r.id) {
            entries.push({
              url: `${base}${listingHrefForVendor({ id: r.id, slug: r.slug })}`,
              lastModified: now,
              changeFrequency: 'weekly',
              priority: 0.75,
            });
          }
        }
      }
    } else {
      const { rows, error } = await fetchAllSupabasePages<{ id: string }>(
        async (from, to) => {
          const { data, error: e } = await client.from('vendor_profiles').select('id').range(from, to);
          return { data, error: e ? { message: e.message } : null };
        },
        { pageSize: 1000, maxPages: 50 }
      );
      if (!error) {
        for (const r of rows) {
          if (r.id) {
            entries.push({
              url: `${base}${listingHrefForVendor({ id: r.id })}`,
              lastModified: now,
              changeFrequency: 'weekly',
              priority: 0.75,
            });
          }
        }
      }
    }

    const strainsRes = await fetchAllSupabasePages<{ slug: string }>(
      async (from, to) => {
        const { data, error: e } = await client.from('strains').select('slug').range(from, to);
        return { data, error: e ? { message: e.message } : null };
      },
      { pageSize: 1000, maxPages: 20 }
    );
    if (!strainsRes.error) {
      for (const r of strainsRes.rows) {
        const slug = String(r.slug || '').trim();
        if (slug) {
          entries.push({
            url: `${base}/strains/${encodeURIComponent(slug)}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.65,
          });
        }
      }
    }

    const brandsRes = await fetchAllSupabasePages<{ slug: string }>(
      async (from, to) => {
        const { data, error: e } = await client.from('brands').select('slug').range(from, to);
        return { data, error: e ? { message: e.message } : null };
      },
      { pageSize: 1000, maxPages: 20 }
    );
    if (!brandsRes.error) {
      for (const r of brandsRes.rows) {
        const slug = String(r.slug || '').trim();
        if (slug) {
          entries.push({
            url: `${base}/brands/${encodeURIComponent(slug)}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.65,
          });
        }
      }
    }
  } catch {
    /* keep static + whatever we already built */
  }

  return entries;
}
