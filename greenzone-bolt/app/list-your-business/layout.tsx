import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_NAME } from '@/lib/brand';

const title = `List your dispensary or delivery service | ${SITE_NAME}`;
const description = `Apply to join ${SITE_NAME} — reach local shoppers, publish your menu, run deals, and manage orders. Fast review and POS-friendly onboarding.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export default function ListYourBusinessLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
