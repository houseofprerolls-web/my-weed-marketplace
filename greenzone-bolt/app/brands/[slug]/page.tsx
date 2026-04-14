import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BrandShowcase } from '@/components/brands/BrandShowcase';
import { loadBrandShowcase } from '@/lib/brandShowcaseLoad';
import { createSupabaseDirectoryClient } from '@/lib/supabaseServerDirectory';
import { SITE_NAME } from '@/lib/brand';
import { getSiteUrl } from '@/lib/siteUrl';
import { indexingRobotsForPublicPages } from '@/lib/seoIndexing';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = getSiteUrl();
  const seg = encodeURIComponent(String(params.slug ?? '').trim());
  const canonical = `${site}/brands/${seg}`;
  const robots = indexingRobotsForPublicPages();
  try {
    const client = createSupabaseDirectoryClient();
    const data = await loadBrandShowcase(client, params.slug);
    if (!data) {
      return { title: `Brand | ${SITE_NAME}`, robots, alternates: { canonical } };
    }
    const aboutSnippet = data.brand.about?.trim().replace(/\s+/g, ' ').slice(0, 155);
    const description =
      data.brand.tagline?.trim() ||
      (aboutSnippet && aboutSnippet.length > 0 ? `${aboutSnippet}${aboutSnippet.length >= 155 ? '…' : ''}` : '') ||
      `Explore ${data.brand.name} — product lineup and shops that may carry this brand.`;
    const title = `${data.brand.name} | Brands | ${SITE_NAME}`;
    const ogImages = data.brand.hero_image_url
      ? [{ url: data.brand.hero_image_url }]
      : [{ url: `${site}/brand/datreehouse-logo.png` }];
    return {
      title,
      description,
      robots,
      alternates: { canonical },
      openGraph: {
        title: data.brand.name,
        description,
        url: canonical,
        siteName: SITE_NAME,
        images: ogImages,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.brand.name,
        description,
        images: ogImages.map((i) => i.url),
      },
    };
  } catch {
    return { title: `Brand | ${SITE_NAME}`, robots, alternates: { canonical } };
  }
}

export default async function BrandDetailPage({ params }: Props) {
  let data;
  try {
    const client = createSupabaseDirectoryClient();
    data = await loadBrandShowcase(client, params.slug);
  } catch {
    notFound();
  }
  if (!data) notFound();
  return <BrandShowcase data={data} />;
}
