import type { Metadata } from 'next';
import { SupplyPortalGate } from '@/components/supply/SupplyPortalGate';

export const metadata: Metadata = {
  title: 'Supply portal',
  robots: { index: false, follow: false },
};

export default function SupplyLayout({ children }: { children: React.ReactNode }) {
  return <SupplyPortalGate>{children}</SupplyPortalGate>;
}
