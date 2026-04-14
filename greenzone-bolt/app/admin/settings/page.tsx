'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/useRole';
import { Settings, UserCog, LayoutGrid, ExternalLink, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const { isAdmin, isMasterAdmin, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-6">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-lg font-semibold text-white">Access denied</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-700/50 text-zinc-200">
          <Settings className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-zinc-400">Admin tools and configuration shortcuts.</p>
        </div>
      </div>

      <ul className="space-y-4">
        {isMasterAdmin && (
          <li>
            <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <UserCog className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  <div>
                    <h2 className="font-semibold text-white">Junior admins</h2>
                    <p className="mt-1 text-sm text-zinc-400">Promote and manage jr. admin accounts (master only).</p>
                  </div>
                </div>
                <Button asChild className="shrink-0 bg-violet-700 text-white hover:bg-violet-600">
                  <Link href="/admin?tab=jr-admins">Open</Link>
                </Button>
              </div>
            </Card>
          </li>
        )}
        <li>
          <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                <div>
                  <h2 className="font-semibold text-white">Feature slots</h2>
                  <p className="mt-1 text-sm text-zinc-400">Homepage and discovery feature configuration.</p>
                </div>
              </div>
              <Button asChild className="shrink-0 bg-emerald-800 text-white hover:bg-emerald-700">
                <Link href="/admin?tab=features">Open</Link>
              </Button>
            </div>
          </Card>
        </li>
        <li>
          <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                <div>
                  <h2 className="font-semibold text-white">Public onboarding form</h2>
                  <p className="mt-1 text-sm text-zinc-400">Opens the vendor “List your business” page.</p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 border-zinc-600 text-zinc-200">
                <Link href="/vendor/onboarding" target="_blank" rel="noopener noreferrer">
                  Open
                </Link>
              </Button>
            </div>
          </Card>
        </li>
      </ul>
    </div>
  );
}
