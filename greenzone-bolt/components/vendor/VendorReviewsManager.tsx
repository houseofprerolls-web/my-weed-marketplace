'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, Flag, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  filterReviewsCreatedNotInFuture,
  vendorDashboardReviewerLabel,
} from '@/lib/vendorReviewDisplay';

export type ReviewManageRow = {
  id: string;
  reviewer_id: string | null;
  rating: number;
  title: string;
  body: string | null;
  created_at: string;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  reviewer_name: string;
};

type Props = {
  vendorId: string;
};

export function VendorReviewsManager({ vendorId }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReviewManageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reportDrafts, setReportDrafts] = useState<Record<string, string>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(
        'id, reviewer_id, rating, title, body, created_at, vendor_reply, vendor_reply_at, reviewer_display_handle'
      )
      .eq('entity_type', 'vendor')
      .eq('entity_id', vendorId)
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }

    const list = filterReviewsCreatedNotInFuture(
      (data || []) as Omit<ReviewManageRow, 'reviewer_name'>[]
    );
    const ids = Array.from(new Set(list.map((r) => r.reviewer_id).filter(Boolean))) as string[];
    const fullNameById = new Map<string, string>();
    const profileUsernameById = new Map<string, string>();
    const userProfilesUsernameById = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username').in('id', ids);
      for (const p of profs || []) {
        const row = p as { id: string; full_name: string | null; username?: string | null };
        fullNameById.set(row.id, String(row.full_name || '').trim());
        const un = String(row.username || '').trim();
        if (un) profileUsernameById.set(row.id, un);
      }
      const { data: ups } = await supabase.from('user_profiles').select('id, username').in('id', ids);
      for (const u of ups || []) {
        const un = String((u as { username?: string }).username || '').trim();
        if (un) userProfilesUsernameById.set(u.id as string, un);
      }
    }

    setRows(
      list.map((r) => {
        const rid = r.reviewer_id || '';
        const guest = String((r as { reviewer_display_handle?: string | null }).reviewer_display_handle || '').trim();
        const reviewer_name = vendorDashboardReviewerLabel({
          profileUsername: rid ? profileUsernameById.get(rid) ?? null : null,
          secondaryUsername: rid ? userProfilesUsernameById.get(rid) ?? null : null,
          profileFullName: rid ? fullNameById.get(rid) ?? null : null,
          guestHandle: guest || null,
        });
        return {
          ...r,
          reviewer_name,
        };
      })
    );
    const drafts: Record<string, string> = {};
    for (const r of list) {
      drafts[r.id] = r.vendor_reply || '';
    }
    setReplyDrafts(drafts);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveReply(reviewId: string) {
    setSavingId(reviewId);
    const { error } = await supabase.rpc('vendor_set_review_reply', {
      p_review_id: reviewId,
      p_reply: replyDrafts[reviewId] ?? '',
    });
    setSavingId(null);
    if (error) {
      toast({ title: 'Could not save reply', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Reply published', description: 'Shoppers will see it on your listing.' });
    load();
  }

  async function submitReport(reviewId: string) {
    const reason = (reportDrafts[reviewId] || '').trim();
    if (reason.length < 10) {
      toast({
        title: 'Add a bit more detail',
        description: 'Please explain why this review should be reviewed (at least 10 characters).',
        variant: 'destructive',
      });
      return;
    }
    setReportingId(reviewId);
    const { error } = await supabase.from('review_vendor_reports').insert({
      review_id: reviewId,
      vendor_id: vendorId,
      reason,
    });
    setReportingId(null);
    if (error) {
      toast({
        title: 'Report not submitted',
        description: error.message.includes('relation') ? 'Run migration 0039 (review_vendor_reports).' : error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Report sent', description: 'Admins will review your request.' });
    setReportDrafts((d) => ({ ...d, [reviewId]: '' }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-green-900/20 bg-gray-900/50 p-10 text-center text-gray-400">
        No reviews yet for this store.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((r) => (
        <Card key={r.id} className="border-green-900/20 bg-gray-900/50 p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{r.reviewer_name}</p>
              <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= r.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`}
                />
              ))}
            </div>
          </div>
          <p className="mb-1 font-medium text-white">{r.title}</p>
          {r.body && <p className="mb-4 text-sm text-gray-300">{r.body}</p>}

          {r.vendor_reply && (
            <div className="mb-4 rounded-lg border border-green-800/40 bg-green-950/20 p-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-green-400">
                <MessageSquare className="h-3 w-3" />
                Your public reply
              </p>
              <p className="text-sm text-gray-200">{r.vendor_reply}</p>
              {r.vendor_reply_at && (
                <p className="mt-2 text-xs text-gray-500">Posted {new Date(r.vendor_reply_at).toLocaleString()}</p>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-green-900/20 pt-4">
            <Label className="text-gray-300">Reply publicly (visible on your listing)</Label>
            <Textarea
              value={replyDrafts[r.id] ?? ''}
              onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              rows={3}
              placeholder="Thank the customer or address their feedback…"
              className="border-green-900/30 bg-black/40 text-white"
            />
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={savingId === r.id}
              onClick={() => saveReply(r.id)}
            >
              {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save reply'}
            </Button>
          </div>

          <div className="mt-6 space-y-2 border-t border-green-900/20 pt-4">
            <Label className="flex items-center gap-2 text-amber-200/90">
              <Flag className="h-4 w-4" />
              Report to admins
            </Label>
            <p className="text-xs text-gray-500">
              If you believe this review violates policy or is fraudulent, admins can review removal.
            </p>
            <Textarea
              value={reportDrafts[r.id] ?? ''}
              onChange={(e) => setReportDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              rows={2}
              placeholder="Reason for admin review (required)…"
              className="border-amber-900/30 bg-black/40 text-white"
            />
            <Button
              size="sm"
              variant="outline"
              className="border-amber-700/50 text-amber-400"
              disabled={reportingId === r.id}
              onClick={() => submitReport(r.id)}
            >
              {reportingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit report'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
