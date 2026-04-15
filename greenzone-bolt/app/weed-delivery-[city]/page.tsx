import { Suspense } from 'react';
import { WeedDeliveryCityClient } from './WeedDeliveryCityClient';

type PageProps = { params: { city: string } };

export default function WeedDeliveryCityPage({ params }: PageProps) {
  const citySlug = params.city ?? '';
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <WeedDeliveryCityClient citySlug={citySlug} />
    </Suspense>
  );
}
