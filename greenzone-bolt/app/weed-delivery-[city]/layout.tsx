import type { Metadata } from 'next';

/** Programmatic delivery slug pages are not unique SEO landings yet; keep them out of the index. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function WeedDeliveryCityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
