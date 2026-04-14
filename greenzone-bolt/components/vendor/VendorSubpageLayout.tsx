'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VendorNav from '@/components/vendor/VendorNav';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function VendorSubpageLayout({
  title,
  subtitle,
  children,
  backHref = '/vendor/dashboard',
  backLabel = 'Dashboard',
}: Props) {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const resolvedBackHref = backHref.startsWith('/vendor')
    ? withAdminVendorQuery(backHref, adminMenuVendorId)
    : backHref;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-green-900/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <Link href={resolvedBackHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-2 text-gray-400">{subtitle}</p> : null}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <VendorNav />
          </div>
          <div className="min-w-0 md:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
