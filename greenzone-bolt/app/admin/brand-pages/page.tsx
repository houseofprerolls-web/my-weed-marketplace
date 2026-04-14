'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { AdminBrandPagesPanel } from '@/components/admin/AdminBrandPagesPanel';
import { Loader2, ArrowLeft, CircleAlert as AlertCircle, Sparkles } from 'lucide-react';

export default function AdminBrandPagesPage() {
  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Card className="max-w-md border-red-900/30 bg-zinc-950 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-white">Admins only</h1>
          <p className="text-zinc-400">You need an admin account to manage brand pages.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Brand pages</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Edit public showcases, verification, and self-serve editors for each brand.
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-fit border-zinc-700 text-zinc-200" asChild>
          <Link href="/admin/catalog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Catalog hub
          </Link>
        </Button>
      </div>
      <AdminBrandPagesPanel />
    </div>
  );
}
