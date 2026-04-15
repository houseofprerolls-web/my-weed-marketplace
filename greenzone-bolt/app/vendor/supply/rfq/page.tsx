import { Suspense } from 'react';
import VendorSupplyRfqClient from './VendorSupplyRfqClient';

type PageProps = {
  searchParams: { supplier?: string | string[] };
};

export default function VendorSupplyRfqPage({ searchParams }: PageProps) {
  const raw = searchParams.supplier;
  const supplierId = typeof raw === 'string' ? raw.trim() : '';
  return (
    <Suspense fallback={null}>
      <VendorSupplyRfqClient supplierId={supplierId} />
    </Suspense>
  );
}
