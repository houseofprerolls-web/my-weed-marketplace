import { Suspense } from 'react';

/**
 * A few vendor routes still call `useSearchParams()` directly (e.g. onboarding, menu categories).
 * Suspense here keeps static prerender from deopting the whole `/vendor` tree for those pages.
 */
export default function VendorRootLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
