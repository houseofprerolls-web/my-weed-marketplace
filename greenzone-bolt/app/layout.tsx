import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { VendorsSchemaProvider } from '@/contexts/VendorsSchemaContext';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { SiteChrome } from '@/components/SiteChrome';
import { AgeVerification } from '@/components/auth/AgeVerification';
import { GeoZipPromptAfterAge } from '@/components/auth/GeoZipPromptAfterAge';
import { PwaHomescreenLoyaltyPrompt } from '@/components/loyalty/PwaHomescreenLoyaltyPrompt';
import { ConfigWarning } from '@/components/ConfigWarning';
import { AppShellErrorBoundary } from '@/components/AppShellErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { SITE_NAME } from '@/lib/brand';
import { getSiteUrl } from '@/lib/siteUrl';
import { isIndexingEnabled } from '@/lib/seoIndexing';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true,
});

const defaultDescription =
  'Discover dispensaries, delivery services, and cannabis brands nationwide. Browse menus, read reviews, find deals, and connect with verified businesses.';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: `${SITE_NAME} — Nationwide Cannabis Directory & Discovery`,
  description: defaultDescription,
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  themeColor: '#000000',
  icons: {
    icon: '/brand/datreehouse-logo.png',
    apple: '/brand/datreehouse-logo.png',
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  robots: isIndexingEnabled() ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    title: `${SITE_NAME} — Nationwide Cannabis Directory`,
    description: defaultDescription,
    images: [{ url: '/brand/datreehouse-logo.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Nationwide Cannabis Directory`,
    description: defaultDescription,
    images: [{ url: '/brand/datreehouse-logo.png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vendorsSchema = resolveUseVendorsTableForDiscovery();
  return (
    <html lang="en" className="dark">
      {/* No manual <head> — it can drop Next’s CSS link tags; theme is in globals.css */}
      <body className={inter.className}>
        {process.env.NODE_ENV === 'development' ? (
          <link rel="stylesheet" href="/tailwind-app.css" />
        ) : null}
        <VendorsSchemaProvider value={vendorsSchema}>
          <AuthProvider>
            <CartProvider>
              <AppShellErrorBoundary>
                <div className="flex min-h-[100dvh] min-h-screen flex-col">
                  <ConfigWarning />
                  <AgeVerification />
                  <GeoZipPromptAfterAge />
                  <PwaHomescreenLoyaltyPrompt />
                  <SiteChrome>{children}</SiteChrome>
                  <Toaster />
                  <SonnerToaster richColors theme="dark" position="top-center" />
                </div>
              </AppShellErrorBoundary>
            </CartProvider>
          </AuthProvider>
        </VendorsSchemaProvider>
      </body>
    </html>
  );
}
