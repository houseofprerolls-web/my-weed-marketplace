import type { Metadata } from 'next';

/** City page still uses demo sample data; avoid indexing thin/duplicate URLs until SSR + real inventory ships. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CityDispensariesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
