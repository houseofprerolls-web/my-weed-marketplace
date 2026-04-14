'use client';

import { Card } from '@/components/ui/card';

export default function VendorSupplyOrdersPlaceholderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Supply orders</h1>
      <Card className="border-sky-900/30 bg-zinc-900/50 p-8 text-center text-zinc-400">
        <p className="text-sm">
          Wholesale purchase orders will appear here when B2B checkout and order records ship on the platform.
        </p>
        <p className="mt-3 text-xs text-zinc-500">For now, track supplier conversations under My RFQs.</p>
      </Card>
    </div>
  );
}
