import type { Metadata } from 'next';
import { buildListingJsonLd, buildListingMetadata } from '@/lib/listingSeo';

type Props = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildListingMetadata(params.slug);
}

export default async function ListingLayout({ children, params }: Props) {
  const jsonLd = await buildListingJsonLd(params.slug);
  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
