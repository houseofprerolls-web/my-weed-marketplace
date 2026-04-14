import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';
import { getSiteUrl } from '@/lib/siteUrl';
import { indexingRobotsForPublicPages } from '@/lib/seoIndexing';

const description =
  `Explore cannabis strains — indica, sativa, hybrid — with effects, flavors, and THC ranges on ${SITE_NAME}.`;

export const metadata: Metadata = {
  title: `Cannabis strains directory | ${SITE_NAME}`,
  description,
  robots: indexingRobotsForPublicPages(),
  alternates: { canonical: `${getSiteUrl()}/strains` },
  openGraph: {
    title: `Strains | ${SITE_NAME}`,
    description,
    url: `${getSiteUrl()}/strains`,
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: `${getSiteUrl()}/brand/datreehouse-logo.png` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Strains | ${SITE_NAME}`,
    description,
    images: [`${getSiteUrl()}/brand/datreehouse-logo.png`],
  },
};

export default function StrainsSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
