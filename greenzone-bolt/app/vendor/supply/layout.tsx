import type { Metadata } from 'next';
import { SupplyRfqDraftProvider } from '@/contexts/SupplyRfqDraftContext';
import { VendorSupplyRouteLayout } from '@/components/supply/VendorSupplyRouteLayout';

export const metadata: Metadata = {
  title: 'Supply marketplace',
  robots: { index: false, follow: false },
};

export default function VendorSupplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupplyRfqDraftProvider>
      <VendorSupplyRouteLayout>{children}</VendorSupplyRouteLayout>
    </SupplyRfqDraftProvider>
  );
}
