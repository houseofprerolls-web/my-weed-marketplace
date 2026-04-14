import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';
import { getSiteUrl } from '@/lib/siteUrl';
import { indexingRobotsForPublicPages } from '@/lib/seoIndexing';

const description =
  'Browse licensed dispensaries and delivery near you on DaTreehouse — menus, deals, reviews, and Smokers Club picks.';

export const metadata: Metadata = {
  title: `Discover dispensaries & delivery | ${SITE_NAME}`,
  description,
  robots: indexingRobotsForPublicPages(),
  alternates: { canonical: `${getSiteUrl()}/discover` },
  openGraph: {
    title: `Discover | ${SITE_NAME}`,
    description,
    url: `${getSiteUrl()}/discover`,
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: `${getSiteUrl()}/brand/datreehouse-logo.png` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Discover | ${SITE_NAME}`,
    description,
    images: [`${getSiteUrl()}/brand/datreehouse-logo.png`],
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
