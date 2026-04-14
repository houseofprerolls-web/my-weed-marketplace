import { SmokersClubCategoryClient } from '@/components/smokers-club/SmokersClubCategoryClient';

type PageProps = { params: { slug: string } };

/** Server entry: metadata lives in `./layout.tsx` so this file never needs `use client`. */
export default function SmokersClubCategoryPage({ params }: PageProps) {
  return <SmokersClubCategoryClient slug={params.slug} />;
}
