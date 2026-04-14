'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

type AuditEventRow = {
  id: string;
  actor_id: string;
  created_at: string;
  action_key: string;
  summary: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
};

type CommentRow = {
  id: string;
  event_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type ProfileMini = { id: string; email: string | null; username: string | null };

function actorLabel(profiles: Map<string, ProfileMini>, id: string): string {
  const p = profiles.get(id);
  if (!p) return id.slice(0, 8) + '…';
  const u = p.username?.trim();
  if (u) return u;
  return p.email?.trim() || id.slice(0, 8) + '…';
}

export default function AdminActivityLogPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileMini>>(new Map());
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [commentsByEvent, setCommentsByEvent] = useState<Record<string, CommentRow[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Set<string>>(new Set());
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  const fetchProfilesFor = useCallback(async (actorIds: string[]) => {
    const unique = Array.from(new Set(actorIds)).filter(Boolean);
    if (!unique.length) return new Map<string, ProfileMini>();
    const { data, error } = await supabase.from('profiles').select('id, email, username').in('id', unique);
    if (error) {
      console.warn('activity-log profiles', error.message);
      return new Map();
    }
    const m = new Map<string, ProfileMini>();
    for (const row of data || []) {
      m.set(row.id, row as ProfileMini);
    }
    return m;
  }, []);

  const loadEvents = useCallback(
    async (pageNum: number) => {
      const offset = (pageNum - 1) * PAGE_SIZE;
      let q = supabase
        .from('admin_audit_events')
        .select('id, actor_id, created_at, action_key, summary, resource_type, resource_id, metadata', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (appliedSearch.trim()) {
        const safe = appliedSearch.trim().replace(/%/g, '').replace(/,/g, ' ').slice(0, 120);
        if (safe.length) {
          const s = `%${safe}%`;
          q = q.or(`summary.ilike.${s},action_key.ilike.${s}`);
        }
      }
      if (appliedDateFrom.trim()) {
        const t = new Date(`${appliedDateFrom.trim()}T00:00:00.000Z`).toISOString();
        q = q.gte('created_at', t);
      }
      if (appliedDateTo.trim()) {
        const t = new Date(`${appliedDateTo.trim()}T23:59:59.999Z`).toISOString();
        q = q.lte('created_at', t);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      const rows = (data || []) as AuditEventRow[];
      const normalized = rows.map((r) => ({
        ...r,
        metadata:
          r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
            ? (r.metadata as Record<string, unknown>)
            : {},
      }));

      setEvents(normalized);
      setTotalCount(typeof count === 'number' ? count : normalized.length);

      const prof = await fetchProfilesFor(normalized.map((r) => r.actor_id));
      setProfiles(prof);
    },
    [appliedSearch, appliedDateFrom, appliedDateTo, fetchProfilesFor]
  );

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setListLoading(true);
    void (async () => {
      try {
        await loadEvents(page);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: 'Could not load activity log',
            description: formatSupabaseError(e),
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, appliedSearch, appliedDateFrom, appliedDateTo, loadEvents, toast]);

  useEffect(() => {
    if (totalCount <= 0) return;
    const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [totalCount, page]);

  function applyFilters() {
    setPage(1);
    setAppliedSearch(search);
    setAppliedDateFrom(dateFromInput);
    setAppliedDateTo(dateToInput);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function ensureComments(eventId: string) {
    if (commentsByEvent[eventId]) return;
    setCommentsLoading((s) => new Set(s).add(eventId));
    try {
      const { data, error } = await supabase
        .from('admin_audit_event_comments')
        .select('id, event_id, author_id, body, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const list = (data || []) as CommentRow[];
      setCommentsByEvent((prev) => ({ ...prev, [eventId]: list }));
      const authorIds = list.map((c) => c.author_id);
      const prof = await fetchProfilesFor(authorIds);
      setProfiles((prev) => {
        const next = new Map(prev);
        prof.forEach((v, k) => next.set(k, v));
        return next;
      });
    } catch (e) {
      toast({
        title: 'Could not load comments',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setCommentsLoading((s) => {
        const n = new Set(s);
        n.delete(eventId);
        return n;
      });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        void ensureComments(id);
      }
      return next;
    });
  }

  async function submitComment(eventId: string) {
    const body = (commentDraft[eventId] ?? '').trim();
    if (!body) {
      toast({ title: 'Enter a note', variant: 'destructive' });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setPostingComment(eventId);
    try {
      const { error } = await supabase.from('admin_audit_event_comments').insert({
        event_id: eventId,
        author_id: user.id,
        body,
      });
      if (error) throw error;
      setCommentDraft((d) => ({ ...d, [eventId]: '' }));
      const { data: rows } = await supabase
        .from('admin_audit_event_comments')
        .select('id, event_id, author_id, body, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      const list = (rows || []) as CommentRow[];
      setCommentsByEvent((prev) => ({ ...prev, [eventId]: list }));
      const prof = await fetchProfilesFor(list.map((c) => c.author_id));
      setProfiles((prev) => {
        const next = new Map(prev);
        prof.forEach((v, k) => next.set(k, v));
        return next;
      });
      toast({ title: 'Note added' });
    } catch (e) {
      toast({
        title: 'Could not post note',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setPostingComment(null);
    }
  }

  const profileMap = useMemo(() => profiles, [profiles]);

  if (roleLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center p-6">
        <Card className="max-w-md border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" aria-hidden />
          <h1 className="text-lg font-semibold text-white">Access denied</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200">
          <History className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Activity log</h1>
          <p className="text-sm text-zinc-400">
            Admin and junior-admin changes with notes for coordination (newest first).
          </p>
        </div>
      </div>

      <Card className="mb-6 border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label htmlFor="act-search" className="text-zinc-400">
              Search summary or action
            </Label>
            <Input
              id="act-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void applyFilters()}
              placeholder="e.g. vendor, banner, loyalty"
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="act-from" className="text-zinc-400">
              From (UTC date)
            </Label>
            <Input
              id="act-from"
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="act-to" className="text-zinc-400">
              To (UTC date)
            </Label>
            <Input
              id="act-to"
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => void applyFilters()}
            disabled={listLoading}
          >
            Apply filters
          </Button>
        </div>
      </Card>

      {listLoading && events.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-zinc-500">No events match these filters.</p>
      ) : (
        <>
        <ul className="space-y-2">
          {events.map((ev) => {
            const open = expanded.has(ev.id);
            const comments = commentsByEvent[ev.id];
            const loadingC = commentsLoading.has(ev.id);
            return (
              <li key={ev.id}>
                <Card
                  className={cn(
                    'border-zinc-800 bg-zinc-900/40 transition-colors',
                    open && 'ring-1 ring-zinc-700/80'
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 rounded-lg p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                    onClick={() => toggleExpand(ev.id)}
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                    ) : (
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">{ev.summary}</p>
                      <p className="mt-1 font-mono text-[11px] text-zinc-500">
                        {ev.action_key}
                        {ev.resource_type ? ` · ${ev.resource_type}` : ''}
                        {ev.resource_id ? ` · ${ev.resource_id}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {actorLabel(profileMap, ev.actor_id)} ·{' '}
                        {new Date(ev.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </button>
                  {open ? (
                    <div className="border-t border-zinc-800 px-4 pb-4 pt-2">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Metadata
                      </p>
                      <pre className="mb-4 max-h-48 overflow-auto rounded-md border border-zinc-800 bg-black/40 p-3 text-[11px] text-zinc-300">
                        {JSON.stringify(ev.metadata, null, 2)}
                      </pre>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Notes
                      </p>
                      {loadingC ? (
                        <p className="text-xs text-zinc-500">Loading notes…</p>
                      ) : (
                        <ul className="mb-3 space-y-2">
                          {(comments || []).map((c) => (
                            <li
                              key={c.id}
                              className="rounded-md border border-zinc-800/80 bg-black/25 px-3 py-2 text-sm text-zinc-200"
                            >
                              <p className="whitespace-pre-wrap">{c.body}</p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {actorLabel(profileMap, c.author_id)} ·{' '}
                                {new Date(c.created_at).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </p>
                            </li>
                          ))}
                          {(!comments || comments.length === 0) && (
                            <li className="text-xs text-zinc-600">No notes yet.</li>
                          )}
                        </ul>
                      )}
                      <Label htmlFor={`note-${ev.id}`} className="text-zinc-400">
                        Add a note (reasoning for other admins)
                      </Label>
                      <Textarea
                        id={`note-${ev.id}`}
                        value={commentDraft[ev.id] ?? ''}
                        onChange={(e) =>
                          setCommentDraft((d) => ({ ...d, [ev.id]: e.target.value }))
                        }
                        className="mt-1 min-h-[72px] border-zinc-700 bg-zinc-950 text-white"
                        placeholder="Why this change was made, follow-ups, etc."
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 bg-zinc-700 text-white hover:bg-zinc-600"
                        disabled={postingComment === ev.id}
                        onClick={() => void submitComment(ev.id)}
                      >
                        {postingComment === ev.id ? 'Posting…' : 'Post note'}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>

        {totalCount > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-zinc-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-200"
                disabled={page <= 1 || listLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </Button>
              <span className="min-w-[5rem] text-center text-sm text-zinc-400">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-200"
                disabled={page >= totalPages || listLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
        </>
      )}
    </div>
  );
}
