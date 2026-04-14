import type { Metadata } from 'next';
import { buildStrainJsonLd, buildStrainMetadata } from '@/lib/strainSeo';

type Props = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildStrainMetadata(params.slug);
}

export default async function StrainDetailLayout({ children, params }: Props) {
  const jsonLd = await buildStrainJsonLd(params.slug);
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
