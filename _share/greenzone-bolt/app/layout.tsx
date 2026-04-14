import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AgeVerification } from '@/components/auth/AgeVerification';
import { GeoZipPromptAfterAge } from '@/components/auth/GeoZipPromptAfterAge';
import { ConfigWarning } from '@/components/ConfigWarning';
import { Toaster } from '@/components/ui/toaster';
import { SITE_NAME } from '@/lib/brand';

const inter = Inter({ subsets: ['latin'] });

const defaultDescription =
  'Discover dispensaries, delivery services, and cannabis brands nationwide. Browse menus, read reviews, find deals, and connect with verified businesses.';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Nationwide Cannabis Directory & Discovery`,
  description: defaultDescription,
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
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <ConfigWarning />
              <AgeVerification />
              <GeoZipPromptAfterAge />
              <Header />
              <main className="relative flex-1 bg-black">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent"
                  aria-hidden
                />
                <div className="relative z-[1]">{children}</div>
              </main>
              <Footer />
              <Toaster />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
