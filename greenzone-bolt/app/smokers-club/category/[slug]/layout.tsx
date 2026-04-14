import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  resolveSmokersClubCategorySlug,
  SMOKERS_CLUB_CATEGORY_LABELS,
} from '@/lib/smokersClubCategory';

type LayoutProps = { children: ReactNode };

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const slug = resolveSmokersClubCategorySlug(params.slug);
  if (!slug) {
    return {
      title: 'Category | Smokers Club',
      description: 'Browse Smokers Club categories on GreenZone.',
    };
  }
  const label = SMOKERS_CLUB_CATEGORY_LABELS[slug];
  const lower = label.toLowerCase();
  return {
    title: `${label} | Smokers Club`,
    description: `Shop ${lower} bestsellers, nearby delivery and storefront pickup, on-sale SKUs, and the full in-stock menu on GreenZone Smokers Club.`,
    openGraph: {
      title: `${label} | Smokers Club`,
      description: `GreenZone Smokers Club — ${lower}, curated for California shoppers.`,
    },
  };
}

export default function SmokersClubCategorySlugLayout({ children }: LayoutProps) {
  return children;
}
