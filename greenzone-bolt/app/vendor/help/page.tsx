'use client';

import Link from 'next/link';
import { Loader2, BookOpen, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { VendorSubpageLayout } from '@/components/vendor/VendorSubpageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';

const faqs = [
  {
    q: 'Why is my store not visible to shoppers?',
    a: 'Your dispensary must be approved and marked live in our system. Use Business Profile to confirm details, and ensure compliance items (license, hours) are complete.',
  },
  {
    q: 'How do I add or edit menu items?',
    a: 'Open Menu Manager from the sidebar. You can create products, set prices, and toggle in-stock status. Changes apply to your public listing when your store is live.',
  },
  {
    q: 'Where do I see new orders?',
    a: 'Go to Orders in the vendor area (or from Settings). You can update status as you prepare and fulfill each order.',
  },
  {
    q: 'How are customers listed?',
    a: 'The Customers page groups shoppers by the account or guest checkout details captured on each order. It is for your reference only and does not expose full account data from other users.',
  },
];

export default function VendorHelpPage() {
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness({
    adminMenuVendorId,
  });

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <VendorSubpageLayout
      title={`Help & support — ${vendor.name}`}
      subtitle="Quick answers and where to get more help."
    >
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
            <MessageCircle className="mb-3 h-8 w-8 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-2 text-sm text-gray-400">
              For account or compliance questions, use the same channel you used to onboard (your marketplace operator or compliance team). When you write in, include your store name and public slug{' '}
              <span className="font-mono text-green-400">/{vendor.slug}</span> so support can look you up.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              You can also review your{' '}
              <Link href="/account" className="text-green-400 hover:underline">
                account
              </Link>{' '}
              and{' '}
              <Link href="/vendor/profile" className="text-green-400 hover:underline">
                business profile
              </Link>{' '}
              for details on file.
            </p>
          </Card>

          <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
            <BookOpen className="mb-3 h-8 w-8 text-green-500" />
            <h2 className="text-lg font-semibold text-white">In the app</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/vendor/dashboard" className="text-green-400 hover:underline">
                  Dashboard
                </Link>{' '}
                — overview and shortcuts
              </li>
              <li>
                <Link href="/vendor/settings" className="text-green-400 hover:underline">
                  Settings
                </Link>{' '}
                — links to profile, menu, orders, billing
              </li>
              <li>
                <Link href="/vendor/onboarding" className="text-green-400 hover:underline">
                  List your business
                </Link>{' '}
                — new vendor applications
              </li>
            </ul>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Common questions</h2>
          <div className="space-y-3">
            {faqs.map((item) => (
              <Card key={item.q} className="border-green-900/15 bg-gray-950/80 p-5">
                <h3 className="font-medium text-green-100">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </VendorSubpageLayout>
  );
}
