import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { createSupabaseAnonServer } from '@/lib/supabaseServerAnon';
import { SITE_NAME } from '@/lib/brand';
import { indexingRobotsForPublicPages } from '@/lib/seoIndexing';

export type StrainSeoPayload = {
  name: string;
  slug: string;
  type: string;
  description: string;
  thcMin: number;
  thcMax: number;
  imageUrl: string | null;
};

async function fetchStrainSeoPayload(slug: string): Promise<StrainSeoPayload | null> {
  const s = String(slug ?? '').trim();
  if (!s) return null;
  const client = createSupabaseAnonServer();
  if (!client) return null;
  const { data, error } = await client
    .from('strains')
    .select('name,slug,type,description,thc_min,thc_max,image_url')
    .eq('slug', s)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const name = String(row.name ?? 'Strain').trim() || 'Strain';
  const descRaw = String(row.description ?? '').trim();
  const type = String(row.type ?? '').trim() || 'cannabis';
  const thcMin = Number(row.thc_min ?? 0);
  const thcMax = Number(row.thc_max ?? 0);
  const description =
    descRaw.length > 0
      ? descRaw.slice(0, 160) + (descRaw.length > 160 ? '…' : '')
      : `${name} (${type}) — THC info, effects, and flavors on ${SITE_NAME}.`;
  const img = typeof row.image_url === 'string' && row.image_url.trim() ? row.image_url.trim() : null;
  return {
    name,
    slug: String(row.slug ?? s).trim() || s,
    type,
    description,
    thcMin: Number.isFinite(thcMin) ? thcMin : 0,
    thcMax: Number.isFinite(thcMax) ? thcMax : 0,
    imageUrl: img,
  };
}

export async function buildStrainMetadata(slug: string): Promise<Metadata> {
  const site = getSiteUrl();
  const seg = encodeURIComponent(String(slug ?? '').trim());
  const canonical = `${site}/strains/${seg}`;
  const robots = indexingRobotsForPublicPages();
  const payload = await fetchStrainSeoPayload(slug);

  if (!payload) {
    return {
      title: `Strain | ${SITE_NAME}`,
      robots,
      alternates: { canonical },
    };
  }

  const title = `${payload.name} strain (${payload.type}) | ${SITE_NAME}`;
  const ogImages =
    payload.imageUrl && /^https?:\/\//i.test(payload.imageUrl)
      ? [{ url: payload.imageUrl }]
      : [{ url: `${site}/brand/datreehouse-logo.png` }];

  return {
    title,
    description: payload.description,
    robots,
    alternates: { canonical },
    openGraph: {
      title,
      description: payload.description,
      url: canonical,
      siteName: SITE_NAME,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: payload.description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export async function buildStrainJsonLd(slug: string): Promise<Record<string, unknown> | null> {
  const site = getSiteUrl();
  const payload = await fetchStrainSeoPayload(slug);
  if (!payload) return null;
  const seg = encodeURIComponent(payload.slug);
  const url = `${site}/strains/${seg}`;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: payload.name,
    description: payload.description,
    url,
    category: 'Cannabis strain',
  };
  if (payload.imageUrl && /^https?:\/\//i.test(payload.imageUrl)) {
    ld.image = payload.imageUrl;
  }
  if (payload.thcMin > 0 || payload.thcMax > 0) {
    ld.additionalProperty = [
      {
        '@type': 'PropertyValue',
        name: 'THC range',
        value: `${payload.thcMin}–${payload.thcMax}%`,
      },
    ];
  }
  return ld;
}
