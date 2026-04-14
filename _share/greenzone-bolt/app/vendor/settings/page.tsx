'use client';

import Link from 'next/link';
import { ChevronRight, Loader2, Store, UserCircle, CreditCard, ShoppingBag, UtensilsCrossed, Bell, MapPin, UsersRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { VendorSubpageLayout } from '@/components/vendor/VendorSubpageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';

const links: {
  href: string;
  title: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    href: '/vendor/profile',
    title: 'Business profile',
    description: 'Store name, branding, address, and public listing details',
    icon: Store,
  },
  {
    href: '/account/profile',
    title: 'Personal account',
    description: 'Your login profile, contact info, and sign out',
    icon: UserCircle,
  },
  {
    href: '/vendor/menu',
    title: 'Menu manager',
    description: 'Products, categories, and inventory',
    icon: UtensilsCrossed,
  },
  {
    href: '/vendor/map-location',
    title: 'Store map pin',
    description: 'Map marker only inside admin-enabled operating areas',
    icon: MapPin,
  },
  {
    href: '/vendor/orders',
    title: 'Orders',
    description: 'Incoming orders and fulfillment',
    icon: ShoppingBag,
  },
  {
    href: '/vendor/team',
    title: 'Team access',
    description: 'Invite managers by email and control dashboard access',
    icon: UsersRound,
  },
  {
    href: '/vendor/billing',
    title: 'Billing & invoices',
    description: 'Subscription charges and payment history',
    icon: CreditCard,
  },
];

export default function VendorSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <VendorSubpageLayout
      title={`Settings — ${vendor.name}`}
      subtitle="Shortcuts to manage your storefront and account."
    >
      <div className="space-y-4">
        {links.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-5 transition hover:border-green-600/40 hover:bg-gray-900/90">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-green-900/30 bg-green-950/20">
                  <Icon className="h-6 w-6 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="mt-0.5 text-sm text-gray-400">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-500" />
              </div>
            </Card>
          </Link>
        ))}

        <Card className="border-green-900/10 bg-gray-950/50 p-5">
          <div className="flex items-start gap-4">
            <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />
            <div>
              <h3 className="font-medium text-gray-200">Notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                Email and push preferences for new orders and reviews are coming soon. For now, check{' '}
                <Link href="/vendor/orders" className="text-green-400 hover:underline">
                  Orders
                </Link>{' '}
                regularly.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </VendorSubpageLayout>
  );
}
