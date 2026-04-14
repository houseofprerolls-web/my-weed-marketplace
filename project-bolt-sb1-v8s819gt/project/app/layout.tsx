import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AgeVerification } from '@/components/auth/AgeVerification';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GreenZone - Nationwide Cannabis Directory & Discovery Platform',
  description: 'Discover dispensaries, delivery services, and cannabis brands nationwide. Browse menus, read reviews, find deals, and connect with verified businesses.',
  openGraph: {
    title: 'GreenZone - Nationwide Cannabis Directory',
    description: 'Discover dispensaries, delivery services, and cannabis brands nationwide.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GreenZone - Nationwide Cannabis Directory',
    description: 'Discover dispensaries, delivery services, and cannabis brands nationwide.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
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
              <AgeVerification />
              <Header />
              <main className="flex-1 bg-black">
                {children}
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
