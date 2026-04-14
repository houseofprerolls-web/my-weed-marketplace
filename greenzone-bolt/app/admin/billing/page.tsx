'use client';

import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { AdminPlatformBillingPanel } from '@/components/admin/AdminPlatformBillingPanel';
import { Loader2, CircleAlert as AlertCircle, Receipt } from 'lucide-react';

export default function AdminBillingPage() {
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
          <p className="text-zinc-400">You need an admin account to manage platform billing.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Receipt className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Platform billing</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Three steps: <span className="text-zinc-300">Mark paid</span> when money lands,{' '}
            <span className="text-zinc-300">Set up billing</span> for shops and brands,{' '}
            <span className="text-zinc-300">Files & undo</span> for PDFs and mistakes.
          </p>
        </div>
      </div>
      <AdminPlatformBillingPanel />
    </div>
  );
}
