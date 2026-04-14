'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Flag, ImageIcon, ArrowRight } from 'lucide-react';

type Props = {
  pendingVendorCount: number;
  reportsToModerateCount: number;
  pendingBannerCount: number;
  vendorsSchema: boolean;
};

export function AdminPriorityQueue({
  pendingVendorCount,
  reportsToModerateCount,
  pendingBannerCount,
  vendorsSchema,
}: Props) {
  return (
    <section className="mb-8" aria-labelledby="admin-priority-queue-heading">
      <h2 id="admin-priority-queue-heading" className="mb-4 text-lg font-semibold text-white">
        Priority queue
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/60 p-5 shadow-sm ring-1 ring-zinc-800/80">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <ClipboardCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-white">Pending vendor approvals</h3>
                <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{pendingVendorCount}</p>
                <p className="text-sm text-zinc-400">
                  {pendingVendorCount === 1 ? 'Business waiting' : 'Businesses waiting'}
                </p>
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="mt-4 w-full border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            <Link href="/admin?tab=vendors" className="inline-flex items-center justify-center gap-2">
              Review
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60 p-5 shadow-sm ring-1 ring-zinc-800/80">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
              <Flag className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-white">Reports to moderate</h3>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{reportsToModerateCount}</p>
              <p className="text-sm text-zinc-400">
                {reportsToModerateCount === 1 ? 'Flagged item' : 'Flagged items'}
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="mt-4 w-full border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            <Link href="/admin/moderation" className="inline-flex items-center justify-center gap-2">
              Open
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60 p-5 shadow-sm ring-1 ring-zinc-800/80 sm:col-span-2 xl:col-span-1">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-white">Banner approvals</h3>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{pendingBannerCount}</p>
              <p className="text-sm text-zinc-400">Pending creative review</p>
            </div>
          </div>
          {vendorsSchema ? (
            <Button
              asChild
              variant="secondary"
              className="mt-4 w-full border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/admin?tab=club-banners" className="inline-flex items-center justify-center gap-2">
                Approve
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <p className="mt-4 text-xs text-zinc-500">Enable vendors schema for homepage banner queue.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
