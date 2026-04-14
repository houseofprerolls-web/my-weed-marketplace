'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Flag, ArrowRight, AlertCircle } from 'lucide-react';

type ReviewReport = {
  id: string;
  created_at: string;
  review_id: string;
  vendor_id: string;
  reason: string;
  status: string;
};

export default function AdminModerationPage() {
  const { isAdmin, loading: authLoading } = useRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [reviewReports, setReviewReports] = useState<ReviewReport[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        stats?: { totalReports?: number };
        reviewReports?: ReviewReport[];
        error?: string;
      };
      if (!res.ok) {
        toast({
          title: 'Could not load moderation data',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        return;
      }
      setTotalReports(j.stats?.totalReports ?? 0);
      setReviewReports(j.reviewReports || []);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const pendingFlags = reviewReports.filter((r) => r.status === 'pending');

  if (authLoading || (isAdmin && loading)) {
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Moderation</h1>
            <p className="text-sm text-zinc-400">
              Platform reports and review flags. Full workflows live on the dashboard tabs.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="border-zinc-600 text-zinc-200 hover:bg-zinc-800">
          <Link href="/admin?tab=review-reports" className="inline-flex items-center gap-2">
            Open dashboard tabs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
          <p className="text-sm font-medium text-zinc-400">Platform reports (pending)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{totalReports}</p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-emerald-400">
            <Link href="/admin?tab=reports">Review in dashboard</Link>
          </Button>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50 p-5 ring-1 ring-zinc-800/80">
          <p className="text-sm font-medium text-zinc-400">Review flags (pending)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{pendingFlags.length}</p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-emerald-400">
            <Link href="/admin?tab=review-reports">Review in dashboard</Link>
          </Button>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent review flags</h2>
      {pendingFlags.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
          <Flag className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
          No pending review flags.
        </Card>
      ) : (
        <ul className="space-y-3">
          {pendingFlags.slice(0, 12).map((r) => (
            <li key={r.id}>
              <Card className="border-zinc-800 bg-zinc-900/50 p-4 ring-1 ring-zinc-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                    pending
                  </Badge>
                  <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-200">{r.reason}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  review {r.review_id} · vendor {r.vendor_id}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
