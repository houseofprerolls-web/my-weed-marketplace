'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { parseOutreachCsv } from '@/lib/outreachCsvParse';
import { OUTREACH_MERGE_TOKENS } from '@/lib/outreachTemplate';
import { ensureConnectMailboxInOptions } from '@/lib/outreachFromOptions';
import { htmlToPlainText, plainTextToSimpleHtml } from '@/lib/outreachHtmlText';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Upload,
  Send,
  MailCheck,
  Archive,
  Ban,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table2,
  Eye,
  UserPlus,
  UserMinus,
  ExternalLink,
  RotateCcw,
  Columns2,
  ArrowDownToLine,
} from 'lucide-react';
import Link from 'next/link';

type Contact = {
  id: string;
  email: string;
  person_name: string | null;
  company_name: string | null;
  phone?: string | null;
  /** License / import metadata */
  notes?: string | null;
  /** ULS licenseType: storefront = walk-in retail; delivery = Non-Storefront retailer */
  uls_premise_kind?: string | null;
  status: string;
  last_sent_at: string | null;
  replied_at: string | null;
  created_at: string;
  assigned_to_user_id?: string | null;
  assigned_at?: string | null;
  last_sent_by_user_id?: string | null;
  last_sent_by_label?: string | null;
  assigned_to_label?: string | null;
};

const DRAFT_SUBJECT_KEY = 'outreach_template_draft_subject';
const DRAFT_HTML_KEY = 'outreach_template_draft_html';
const DRAFT_TEXT_KEY = 'outreach_template_draft_text';
const USE_DRAFT_ON_SEND_KEY = 'outreach_use_draft_when_sending';

function readDraftFromStorage() {
  if (typeof window === 'undefined') {
    return { subject: '', html: '', text: '' };
  }
  return {
    subject: localStorage.getItem(DRAFT_SUBJECT_KEY) ?? '',
    html: localStorage.getItem(DRAFT_HTML_KEY) ?? '',
    text: localStorage.getItem(DRAFT_TEXT_KEY) ?? '',
  };
}

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  snippet: string,
  current: string,
  onNext: (next: string) => void
) {
  if (!el) {
    onNext(`${current}${snippet}`);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet + current.slice(end);
  onNext(next);
  const pos = start + snippet.length;
  queueMicrotask(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

const STATUSES = [
  'imported',
  'queued',
  'sent',
  'replied',
  'bounced',
  'unsubscribed',
  'archived',
  'no_send',
] as const;

function cellsToObject(headers: string[], cells: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  headers.forEach((h, i) => {
    o[h] = (cells[i] ?? '').trim();
  });
  return o;
}

function premiseBadgeClass(k: string | null | undefined) {
  switch (k) {
    case 'storefront':
      return 'border-violet-700/50 bg-violet-950/50 text-violet-200';
    case 'delivery':
      return 'border-sky-700/50 bg-sky-950/50 text-sky-200';
    default:
      return 'border-zinc-600 bg-zinc-800 text-zinc-400';
  }
}

function statusBadgeClass(s: string) {
  switch (s) {
    case 'imported':
    case 'queued':
      return 'border-zinc-600 bg-zinc-800 text-zinc-200';
    case 'sent':
      return 'border-blue-700/50 bg-blue-950/60 text-blue-200';
    case 'replied':
      return 'border-emerald-700/50 bg-emerald-950/60 text-emerald-200';
    case 'unsubscribed':
    case 'no_send':
      return 'border-amber-800/50 bg-amber-950/40 text-amber-200';
    case 'archived':
    case 'bounced':
      return 'border-zinc-700 bg-zinc-900 text-zinc-400';
    default:
      return 'border-zinc-600 bg-zinc-800 text-zinc-300';
  }
}

export default function AdminOutreachPage() {
  const { isMasterAdmin, loading: roleLoading, isAdmin } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'table' | 'board'>('table');
  const [boardScope, setBoardScope] = useState<'team' | 'my'>('team');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [fromOptions, setFromOptions] = useState<{ id: string; from: string }[]>(() =>
    ensureConnectMailboxInOptions([])
  );
  const [fromId, setFromId] = useState<string>(() => ensureConnectMailboxInOptions([])[0]?.id ?? 'connect');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftHtml, setDraftHtml] = useState('');
  const [draftText, setDraftText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    subject: string;
    html: string;
    text: string;
    built_in?: { subject: string; html: string; text: string };
    sample?: boolean;
  } | null>(null);
  const [compareBuiltinPreview, setCompareBuiltinPreview] = useState(true);
  const [useDraftWhenSending, setUseDraftWhenSending] = useState(true);
  const [templateDefaultLoading, setTemplateDefaultLoading] = useState(false);
  const subjectFieldRef = useRef<HTMLInputElement>(null);
  const htmlFieldRef = useRef<HTMLTextAreaElement>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const mergeTargetRef = useRef<'subject' | 'html' | 'text'>('text');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 40;
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [premiseFilter, setPremiseFilter] = useState<string>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');

  const [csvPreview, setCsvPreview] = useState<{
    headers: string[];
    rows: string[][];
    delimiter?: string;
  } | null>(null);
  const [replaceAllBeforeImport, setReplaceAllBeforeImport] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [sendBusy, setSendBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const [boardCols, setBoardCols] = useState<Record<string, Contact[]>>({
    new: [],
    sent: [],
    replied: [],
    closed: [],
  });
  const [boardLoading, setBoardLoading] = useState(false);

  const tokenRef = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!isMasterAdmin) return;
    const d = readDraftFromStorage();
    setDraftSubject(d.subject);
    setDraftHtml(d.html);
    setDraftText(d.text);
    if (typeof window !== 'undefined') {
      setUseDraftWhenSending(localStorage.getItem(USE_DRAFT_ON_SEND_KEY) !== '0');
    }
  }, [isMasterAdmin]);

  function persistUseDraftOnSend(on: boolean) {
    setUseDraftWhenSending(on);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USE_DRAFT_ON_SEND_KEY, on ? '1' : '0');
    }
  }

  function insertMergeToken(token: string) {
    const t = mergeTargetRef.current;
    if (t === 'subject') insertAtCursor(subjectFieldRef.current, token, draftSubject, setDraftSubject);
    else if (t === 'html') insertAtCursor(htmlFieldRef.current, token, draftHtml, setDraftHtml);
    else insertAtCursor(textFieldRef.current, token, draftText, setDraftText);
  }

  async function loadDefaultTemplate() {
    setTemplateDefaultLoading(true);
    try {
      const token = await tokenRef();
      if (!token) return;
      const res = await fetch('/api/master/outreach/template-default', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as { subject?: string; html?: string; text?: string; error?: string };
      if (!res.ok) {
        toast({ title: 'Could not load template', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      if (j.subject != null) setDraftSubject(j.subject);
      if (j.html != null) setDraftHtml(j.html);
      if (j.text != null) setDraftText(j.text);
      setPreviewOpen(true);
      toast({
        title: 'Built-in template loaded',
        description: 'Merge tokens are intact. Use Save draft locally to persist in this browser.',
      });
    } finally {
      setTemplateDefaultLoading(false);
    }
  }

  function syncPlainFromHtml() {
    if (!draftHtml.trim()) {
      toast({ title: 'HTML is empty', description: 'Nothing to convert.', variant: 'destructive' });
      return;
    }
    setDraftText(htmlToPlainText(draftHtml));
    toast({ title: 'Plain text filled', description: 'Best-effort extraction from HTML — review before send.' });
  }

  function syncHtmlFromPlain() {
    if (!draftText.trim()) {
      toast({ title: 'Plain text is empty', description: 'Nothing to convert.', variant: 'destructive' });
      return;
    }
    setDraftHtml(plainTextToSimpleHtml(draftText));
    toast({
      title: 'HTML filled',
      description: 'Simple auto-layout from plain text. Prefer the built-in HTML if you only changed wording.',
    });
  }

  useEffect(() => {
    if (!isMasterAdmin) return;
    void (async () => {
      const token = await tokenRef();
      if (!token) return;
      const res = await fetch('/api/master/outreach/from-options', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as {
        options?: { id: string; from: string }[];
        default_from_id?: string;
        error?: string;
      };
      const merged = ensureConnectMailboxInOptions(Array.isArray(j.options) ? j.options : []);
      if (!res.ok) {
        toast({
          title: 'From list (partial)',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        setFromOptions(merged);
        setFromId((prev) => (merged.some((o) => o.id === prev) ? prev : merged[0]?.id || 'connect'));
        return;
      }
      setFromOptions(merged);
      const def = j.default_from_id || merged.find((o) => o.id === 'default')?.id || merged[0]?.id || 'default';
      setFromId((prev) => (merged.some((o) => o.id === prev) ? prev : def));
    })();
  }, [isMasterAdmin, toast, tokenRef]);

  const loadList = useCallback(async () => {
    if (!isMasterAdmin) return;
    setListLoading(true);
    try {
      const token = await tokenRef();
      if (!token) {
        setContacts([]);
        return;
      }
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('per_page', String(perPage));
      if (statusFilter !== 'all') sp.set('status', statusFilter);
      if (premiseFilter !== 'all') sp.set('premise_kind', premiseFilter);
      if (searchApplied.trim()) sp.set('q', searchApplied.trim());
      sp.set('board_scope', boardScope);
      if (assignedFilter !== 'all') sp.set('assigned_to', assignedFilter);
      const res = await fetch(`/api/master/outreach/contacts?${sp}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as { contacts?: Contact[]; total?: number; error?: string };
      if (!res.ok) {
        toast({ title: 'Load failed', description: j.error || res.statusText, variant: 'destructive' });
        setContacts([]);
        return;
      }
      setContacts(j.contacts || []);
      setTotal(typeof j.total === 'number' ? j.total : 0);
      setSelected(new Set());
    } finally {
      setListLoading(false);
    }
  }, [
    isMasterAdmin,
    page,
    perPage,
    statusFilter,
    premiseFilter,
    searchApplied,
    boardScope,
    assignedFilter,
    toast,
    tokenRef,
  ]);

  const loadBoard = useCallback(async () => {
    if (!isMasterAdmin) return;
    setBoardLoading(true);
    try {
      const token = await tokenRef();
      if (!token) return;

      const fetchStatus = async (status: string) => {
        const sp = new URLSearchParams();
        sp.set('status', status);
        sp.set('per_page', '30');
        sp.set('page', '1');
        if (premiseFilter !== 'all') sp.set('premise_kind', premiseFilter);
        sp.set('board_scope', boardScope);
        if (assignedFilter !== 'all') sp.set('assigned_to', assignedFilter);
        const res = await fetch(`/api/master/outreach/contacts?${sp}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json()) as { contacts?: Contact[] };
        return j.contacts || [];
      };

      const [imported, queued, sent, replied, arch, unsub, noSend, bounced] = await Promise.all([
        fetchStatus('imported'),
        fetchStatus('queued'),
        fetchStatus('sent'),
        fetchStatus('replied'),
        fetchStatus('archived'),
        fetchStatus('unsubscribed'),
        fetchStatus('no_send'),
        fetchStatus('bounced'),
      ]);

      setBoardCols({
        new: [...imported, ...queued],
        sent,
        replied,
        closed: [...arch, ...unsub, ...noSend, ...bounced],
      });
    } finally {
      setBoardLoading(false);
    }
  }, [isMasterAdmin, tokenRef, premiseFilter, boardScope, assignedFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (view === 'board' && isMasterAdmin) void loadBoard();
  }, [view, isMasterAdmin, loadBoard]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvPreview(parseOutreachCsv(text));
    };
    reader.readAsText(file);
  };

  /** Raw header→cell maps; server maps varied column names (e.g. email_address) to email/person/company. */
  const csvImportRows = useMemo(() => {
    if (!csvPreview || csvPreview.headers.length === 0) return [];
    return csvPreview.rows.map((cells) => cellsToObject(csvPreview.headers, cells));
  }, [csvPreview]);

  async function runImport() {
    if (csvImportRows.length === 0) return;
    if (replaceAllBeforeImport) {
      const ok = window.confirm(
        'Delete ALL outreach contacts and send history, then import this file? This cannot be undone.'
      );
      if (!ok) return;
    }
    setImportBusy(true);
    try {
      const token = await tokenRef();
      if (!token) return;
      const res = await fetch('/api/master/outreach/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvImportRows, replace_all: replaceAllBeforeImport }),
      });
      const j = (await res.json()) as {
        error?: string;
        processed?: number;
        unique_emails?: number;
        skipped_invalid_before_rpc?: number;
        replaced_all?: boolean;
        merged_duplicate_emails_in_file?: number;
      };
      if (!res.ok) {
        toast({ title: 'Import failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      const skipped = j.skipped_invalid_before_rpc ?? 0;
      const merged = j.merged_duplicate_emails_in_file ?? 0;
      const parts: string[] = [];
      if (j.replaced_all) parts.push('Replaced entire list.');
      parts.push(`${j.processed ?? j.unique_emails ?? 0} contacts saved.`);
      if (merged > 0) parts.push(`${merged} duplicate email row(s) merged (license lines combined in notes).`);
      if (skipped > 0) parts.push(`${skipped} row(s) skipped (no valid email).`);
      toast({
        title: 'Import complete',
        description: parts.join(' '),
      });
      setCsvPreview(null);
      setPage(1);
      await loadList();
      if (view === 'board') await loadBoard();
    } finally {
      setImportBusy(false);
    }
  }

  async function patchContact(
    id: string,
    body: { status?: string; notes?: string | null; assigned_to_user_id?: string | null }
  ) {
    setRowBusy(id);
    try {
      const token = await tokenRef();
      if (!token) return;
      const res = await fetch('/api/master/outreach/contact', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: 'Update failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await loadList();
      if (view === 'board') await loadBoard();
    } finally {
      setRowBusy(null);
    }
  }

  async function sendSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast({ title: 'Select contacts', description: 'Choose at least one row.', variant: 'destructive' });
      return;
    }
    setSendBusy(true);
    try {
      const token = await tokenRef();
      if (!token) return;
      const res = await fetch('/api/master/outreach/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_ids: ids,
          max_batch: 25,
          from_id: fromId,
          use_template_draft: useDraftWhenSending,
          draft_subject: draftSubject.trim() || null,
          draft_html: draftHtml.trim() || null,
          draft_text: draftText.trim() || null,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        sent_ok?: number;
        results?: { id: string; ok: boolean; error?: string }[];
      };
      if (!res.ok) {
        toast({ title: 'Send failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      const failed = (j.results || []).filter((r) => !r.ok);
      toast({
        title: 'Send finished',
        description:
          failed.length > 0
            ? `${j.sent_ok ?? 0} sent, ${failed.length} failed. Check SMTP credentials / mailbox, or Resend and domain DNS.`
            : `${j.sent_ok ?? 0} email(s) sent.`,
        variant: failed.length > 0 ? 'destructive' : 'default',
      });
      await loadList();
      if (view === 'board') await loadBoard();
    } finally {
      setSendBusy(false);
    }
  }

  async function runPreview() {
    setPreviewLoading(true);
    try {
      const token = await tokenRef();
      if (!token) return;
      const firstSelected = Array.from(selected)[0];
      const res = await fetch('/api/master/outreach/preview', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: firstSelected || undefined,
          draft_subject: draftSubject.trim() || null,
          draft_html: draftHtml.trim() || null,
          draft_text: draftText.trim() || null,
          compare_builtin: compareBuiltinPreview,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        subject?: string;
        html?: string;
        text?: string;
        built_in?: { subject: string; html: string; text: string };
        sample?: boolean;
      };
      if (!res.ok) {
        toast({ title: 'Preview failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      if (j.subject != null && j.html != null && j.text != null) {
        setPreviewResult({
          subject: j.subject,
          html: j.html,
          text: j.text,
          built_in: j.built_in,
          sample: j.sample,
        });
        setPreviewOpen(true);
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  function saveDraftToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DRAFT_SUBJECT_KEY, draftSubject);
    localStorage.setItem(DRAFT_HTML_KEY, draftHtml);
    localStorage.setItem(DRAFT_TEXT_KEY, draftText);
    toast({ title: 'Draft saved', description: 'Template draft stored in this browser (not on the server).' });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelect() {
    const pageIds = contacts.map((c) => c.id);
    const allOn = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  if (roleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin || !isMasterAdmin) {
    return (
      <div className="p-8 text-center text-zinc-300">
        <p>Outreach is restricted to master admins.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/admin">Back to admin</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Outreach</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          California ULS exports differ by <span className="font-mono text-zinc-500">licenseType</span>:{' '}
          <span className="text-zinc-300">Retailer – Non-Storefront</span> (often C9) →{' '}
          <span className="text-sky-300">Delivery</span>. Plain{' '}
          <span className="text-zinc-300">Commercial – Retailer</span> without “Non-Storefront” (often C10) →{' '}
          <span className="text-violet-300">Storefront</span>. Same columns in both exports; only the type string (and
          license prefix) changes. Import maps owner, phone, email, DBA/legal; full type line stays in Notes. Check{' '}
          <span className="font-medium text-zinc-300">Replace all existing contacts</span> to wipe before import.
          Set <code className="rounded bg-zinc-800 px-1 text-xs">RESEND_API_KEY</code> (same as Vercel / forgot-password
          via Resend) and optionally <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_EMAIL_FROM</code> — if
          from is omitted, sends use <code className="rounded bg-zinc-800 px-1 text-xs">connect@datreehouse.com</code>{' '}
          when the key is present. Or use <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_EMAIL_FROM_OPTIONS</code>, SMTP (
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_SMTP_HOST</code>,{' '}
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_SMTP_USER</code>,{' '}
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_SMTP_PASS</code>), or{' '}
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_EMAIL_TRANSPORT=smtp</code> to force mailbox. Optional{' '}
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_EMAIL_HTML</code> /{' '}
          <code className="rounded bg-zinc-800 px-1 text-xs">OUTREACH_EMAIL_TEXT</code> for custom copy.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={view === 'table' ? 'default' : 'outline'}
          size="sm"
          className={view === 'table' ? 'bg-emerald-700' : 'border-zinc-600'}
          onClick={() => setView('table')}
        >
          <Table2 className="mr-2 h-4 w-4" />
          Table
        </Button>
        <Button
          type="button"
          variant={view === 'board' ? 'default' : 'outline'}
          size="sm"
          className={view === 'board' ? 'bg-emerald-700' : 'border-zinc-600'}
          onClick={() => setView('board')}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          Board
        </Button>
      </div>

      <Card className="mb-6 border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Send &amp; pipeline</h2>
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="w-full min-w-[140px] sm:w-40">
            <Label className="text-zinc-500">Board scope</Label>
            <Select
              value={boardScope}
              onValueChange={(v) => {
                setBoardScope(v as 'team' | 'my');
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Team (all)</SelectItem>
                <SelectItem value="my">My (assigned or I sent)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-[140px] sm:w-44">
            <Label className="text-zinc-500">Assigned</Label>
            <Select
              value={assignedFilter}
              onValueChange={(v) => {
                setAssignedFilter(v as 'all' | 'me' | 'unassigned');
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="me">Assigned to me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 max-w-md">
            <Label htmlFor="outreach-send-from" className="text-zinc-500">
              Send from (verified sender)
            </Label>
            <select
              id="outreach-send-from"
              className="mt-1 flex h-10 w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40 disabled:cursor-not-allowed disabled:opacity-50"
              value={fromOptions.some((o) => o.id === fromId) ? fromId : (fromOptions[0]?.id ?? '')}
              disabled={fromOptions.length === 0}
              onChange={(e) => setFromId(e.target.value)}
              title="Outbound From header — must match a verified domain in Resend (or your SMTP account)."
            >
              {fromOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.from}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-600">
              Includes <span className="font-mono text-zinc-400">connect@datreehouse.com</span> when not already in
              server config. Sends still require <span className="font-mono">RESEND_API_KEY</span> or SMTP on the server.
            </p>
          </div>
        </div>
        <p className="mb-2 text-xs text-zinc-500">
          Use merge tokens in the draft (typed or inserted below). They are replaced per contact when you preview or
          send. If both HTML and plain text are empty, the server uses the built-in template (or{' '}
          <span className="font-mono">OUTREACH_EMAIL_HTML</span> / <span className="font-mono">OUTREACH_EMAIL_TEXT</span>{' '}
          when set). Only one of HTML or plain text is required: the other is filled in automatically.
        </p>
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <Checkbox
            checked={useDraftWhenSending}
            onCheckedChange={(v) => persistUseDraftOnSend(v === true)}
            aria-label="Use template draft when sending"
          />
          Use template draft when sending (subject + bodies below; turn off to always use server built-in / env only)
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {OUTREACH_MERGE_TOKENS.map(({ token, label }) => (
            <Button
              key={token}
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-600 font-mono text-[11px] text-emerald-200/90"
              title={label}
              onClick={() => insertMergeToken(token)}
            >
              {token}
            </Button>
          ))}
          <span className="w-full text-[11px] text-zinc-600 sm:w-auto sm:pl-2">
            Inserts into the field you last clicked (subject, HTML, or plain text).
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-600"
            onClick={() => setPreviewOpen((o) => !o)}
          >
            {previewOpen ? 'Hide' : 'Show'} template draft
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-600"
            disabled={previewLoading}
            onClick={() => void runPreview()}
          >
            {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview (first selected or sample)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-600"
            disabled={templateDefaultLoading}
            onClick={() => void loadDefaultTemplate()}
          >
            {templateDefaultLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Load built-in template
          </Button>
          <Button type="button" variant="secondary" className="border-zinc-600" onClick={saveDraftToStorage}>
            Save draft locally
          </Button>
          <Button asChild variant="outline" className="border-zinc-600">
            <a
              href="https://resend.com/emails"
              target="_blank"
              rel="noopener noreferrer"
              title="Resend delivery log (only when using Resend; with SMTP, check your host’s sent mail or logs)"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Check logs
            </a>
          </Button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <Checkbox
            checked={compareBuiltinPreview}
            onCheckedChange={(v) => setCompareBuiltinPreview(v === true)}
            aria-label="Compare to built-in when previewing"
          />
          <Columns2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          When previewing, also show built-in default (same contact) so you can see what changed
        </label>
        {previewOpen ? (
          <div className="mt-4 grid gap-3 md:grid-cols-1">
            <div>
              <Label className="text-zinc-500">Draft subject (optional)</Label>
              <Input
                ref={subjectFieldRef}
                className="mt-1 border-zinc-700 bg-zinc-950 text-white"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                onFocus={() => {
                  mergeTargetRef.current = 'subject';
                }}
                placeholder="Empty = server default subject (or OUTREACH_EMAIL_SUBJECT)"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-zinc-500">Draft HTML</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-zinc-400" onClick={syncPlainFromHtml}>
                  <ArrowDownToLine className="mr-1 h-3.5 w-3.5" />
                  Fill plain text from HTML
                </Button>
              </div>
              <Textarea
                ref={htmlFieldRef}
                className="mt-1 min-h-[140px] border-zinc-700 bg-zinc-950 font-mono text-xs text-zinc-200"
                value={draftHtml}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraftHtml(e.target.value)}
                onFocus={() => {
                  mergeTargetRef.current = 'html';
                }}
                placeholder="Optional if plain text is set. Merge tokens stay as {{company_name}} etc."
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-zinc-500">Draft plain text</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-zinc-400" onClick={syncHtmlFromPlain}>
                  <ArrowDownToLine className="mr-1 h-3.5 w-3.5" />
                  Fill HTML from plain text
                </Button>
              </div>
              <Textarea
                ref={textFieldRef}
                className="mt-1 min-h-[140px] border-zinc-700 bg-zinc-950 font-mono text-xs text-zinc-200"
                value={draftText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraftText(e.target.value)}
                onFocus={() => {
                  mergeTargetRef.current = 'text';
                }}
                placeholder="Optional if HTML is set."
              />
            </div>
          </div>
        ) : null}
        {previewResult ? (
          <div className="mt-4 space-y-4 rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <div>
              <p className="text-xs font-medium text-zinc-400">Your template (merged)</p>
              {previewResult.sample ? (
                <p className="mt-1 text-[11px] text-amber-200/80">Sample contact — select a row to preview a real import.</p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-200">
                <span className="text-zinc-500">Subject:</span> {previewResult.subject}
              </p>
              <div className="mt-3 max-h-48 overflow-auto rounded border border-zinc-800 bg-white p-2 text-xs text-black">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: previewResult.html }} />
              </div>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 p-2 text-xs text-zinc-400">
                {previewResult.text}
              </pre>
            </div>
            {previewResult.built_in ? (
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-medium text-zinc-400">Built-in default (merged, same contact)</p>
                {previewResult.built_in.subject === previewResult.subject &&
                previewResult.built_in.html === previewResult.html &&
                previewResult.built_in.text === previewResult.text ? (
                  <p className="mt-2 text-xs text-zinc-500">Matches your preview — draft resolves the same as the server default.</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-zinc-200">
                      <span className="text-zinc-500">Subject:</span> {previewResult.built_in.subject}
                    </p>
                    <div className="mt-3 max-h-48 overflow-auto rounded border border-zinc-800 bg-white p-2 text-xs text-black">
                      {/* eslint-disable-next-line react/no-danger */}
                      <div dangerouslySetInnerHTML={{ __html: previewResult.built_in.html }} />
                    </div>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 p-2 text-xs text-zinc-400">
                      {previewResult.built_in.text}
                    </pre>
                  </>
                )}
              </div>
            ) : null}
            <p className="text-[11px] text-zinc-600">
              Sends use the same merge rules as this preview when &quot;Use template draft when sending&quot; is on.
            </p>
          </div>
        ) : null}
      </Card>

      <Card className="mb-6 border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Upload className="h-5 w-5 text-emerald-400" />
          Import CSV
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-zinc-400">File</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              className="border-zinc-700 bg-zinc-950 text-zinc-200 file:text-zinc-300"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
              <Checkbox
                checked={replaceAllBeforeImport}
                onCheckedChange={(v) => setReplaceAllBeforeImport(v === true)}
                aria-label="Replace all contacts"
              />
              Replace all existing contacts
            </label>
            <Button
              type="button"
              disabled={csvImportRows.length === 0 || importBusy}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void runImport()}
            >
              {importBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${csvImportRows.length} rows`}
            </Button>
          </div>
        </div>
        {csvPreview && csvPreview.headers.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-zinc-800">
            <p className="border-b border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
              Preview (first 8 rows)
              {csvPreview.delimiter
                ? ` · delimiter: ${csvPreview.delimiter === '\t' ? 'tab' : csvPreview.delimiter === ';' ? 'semicolon' : 'comma'}`
                : ''}{' '}
              · {csvPreview.headers.length} columns · headers: {csvPreview.headers.join(', ')}
            </p>
            <table className="w-full text-left text-sm text-zinc-300">
              <tbody>
                {csvPreview.rows.slice(0, 8).map((cells, ri) => (
                  <tr key={ri} className="border-t border-zinc-800">
                    {cells.map((c, ci) => (
                      <td key={ci} className="max-w-[200px] truncate px-3 py-2">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {view === 'table' ? (
        <Card className="border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="w-full min-w-[140px] sm:w-44">
                <Label className="text-zinc-500">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full min-w-[160px] sm:w-48">
                <Label className="text-zinc-500">ULS premise</Label>
                <Select
                  value={premiseFilter}
                  onValueChange={(v) => {
                    setPremiseFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-950 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="storefront">Storefront</SelectItem>
                    <SelectItem value="delivery">Delivery (non-storefront)</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[200px] flex-1">
                <Label className="text-zinc-500">Search</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Email, company, name, phone…"
                    className="border-zinc-700 bg-zinc-950 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSearchApplied(searchDraft);
                        setPage(1);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => {
                      setSearchApplied(searchDraft);
                      setPage(1);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={selected.size === 0 || sendBusy}
                onClick={() => void sendSelected()}
              >
                {sendBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send to selected (max 25)
              </Button>
            </div>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-16 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="pb-3 pr-2">
                        <Checkbox
                          checked={
                            contacts.length > 0 && contacts.every((c) => selected.has(c.id))
                          }
                          onCheckedChange={() => togglePageSelect()}
                          aria-label="Select page"
                        />
                      </th>
                      <th className="pb-3 pr-3">Business (DBA · legal)</th>
                      <th className="pb-3 pr-3">Owner</th>
                      <th className="pb-3 pr-3">Phone</th>
                      <th className="pb-3 pr-3">Email</th>
                      <th className="pb-3 pr-3">Premise</th>
                      <th className="pb-3 pr-3 max-w-[220px]">Notes</th>
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3 pr-3">Assigned</th>
                      <th className="pb-3 pr-3">Last sender</th>
                      <th className="pb-3 pr-3">Last sent</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className="border-b border-zinc-800/80">
                        <td className="py-3 pr-2 align-top">
                          <Checkbox
                            checked={selected.has(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                            aria-label={`Select ${c.email}`}
                          />
                        </td>
                        <td className="max-w-[160px] truncate py-3 pr-3 align-top text-zinc-200">
                          {c.company_name || '—'}
                        </td>
                        <td className="max-w-[120px] truncate py-3 pr-3 align-top text-zinc-200">
                          {c.person_name || '—'}
                        </td>
                        <td className="max-w-[120px] truncate py-3 pr-3 align-top font-mono text-xs text-zinc-300">
                          {c.phone ?? '—'}
                        </td>
                        <td className="max-w-[200px] truncate py-3 pr-3 align-top font-mono text-xs text-zinc-300">
                          {c.email}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <Badge variant="outline" className={premiseBadgeClass(c.uls_premise_kind)}>
                            {c.uls_premise_kind === 'delivery'
                              ? 'Delivery'
                              : c.uls_premise_kind === 'storefront'
                                ? 'Storefront'
                                : '—'}
                          </Badge>
                        </td>
                        <td className="max-w-[220px] truncate py-3 pr-3 align-top text-xs text-zinc-500" title={c.notes ?? ''}>
                          {c.notes ?? '—'}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <Badge variant="outline" className={statusBadgeClass(c.status)}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="max-w-[120px] py-3 pr-3 align-top text-xs text-zinc-400">
                          {!c.assigned_to_user_id ? (
                            <span className="text-zinc-600">Unassigned</span>
                          ) : (
                            <span className="block truncate text-zinc-300">{c.assigned_to_label || '—'}</span>
                          )}
                        </td>
                        <td className="max-w-[120px] truncate py-3 pr-3 align-top text-xs text-zinc-400">
                          {c.last_sent_by_label ?? '—'}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 align-top text-xs text-zinc-500">
                          {c.last_sent_at ? new Date(c.last_sent_at).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {c.assigned_to_user_id === user?.id ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 border-zinc-600 px-2 text-xs"
                                disabled={rowBusy === c.id || !user?.id}
                                onClick={() => void patchContact(c.id, { assigned_to_user_id: null })}
                              >
                                <UserMinus className="mr-1 h-3.5 w-3.5" />
                                Unclaim
                              </Button>
                            ) : !c.assigned_to_user_id ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 border-zinc-600 px-2 text-xs"
                                disabled={rowBusy === c.id || !user?.id}
                                onClick={() => void patchContact(c.id, { assigned_to_user_id: user?.id ?? null })}
                              >
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                                Claim
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-zinc-600 px-2 text-xs"
                              disabled={rowBusy === c.id}
                              onClick={() => void patchContact(c.id, { status: 'replied' })}
                            >
                              <MailCheck className="mr-1 h-3.5 w-3.5" />
                              Replied
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-zinc-600 px-2 text-xs"
                              disabled={rowBusy === c.id}
                              onClick={() => void patchContact(c.id, { status: 'archived' })}
                            >
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              Archive
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-zinc-600 px-2 text-xs"
                              disabled={rowBusy === c.id}
                              onClick={() => void patchContact(c.id, { status: 'no_send' })}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              No send
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {contacts.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">No contacts match this filter.</p>
              ) : null}
              <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {(
            [
              ['new', 'New (imported / queued)', boardCols.new],
              ['sent', 'Sent', boardCols.sent],
              ['replied', 'Replied', boardCols.replied],
              ['closed', 'Closed / unsub / no-send', boardCols.closed],
            ] as const
          ).map(([key, title, list]) => (
            <Card key={key} className="border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">
                {title}{' '}
                <span className="text-zinc-500">({list.length})</span>
              </h3>
              {boardLoading ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-500" />
              ) : (
                <ul className="space-y-2">
                  {list.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-zinc-800 bg-zinc-950/80 p-2 text-xs text-zinc-300"
                    >
                      <p className="font-medium text-zinc-100">{c.company_name || c.email}</p>
                      <p className="truncate text-zinc-500">{c.person_name || '—'}</p>
                      <p className="truncate font-mono text-zinc-600">{c.phone ?? '—'}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className={premiseBadgeClass(c.uls_premise_kind)}>
                          {c.uls_premise_kind === 'delivery'
                            ? 'Delivery'
                            : c.uls_premise_kind === 'storefront'
                              ? 'Storefront'
                              : '—'}
                        </Badge>
                        <Badge variant="outline" className={statusBadgeClass(c.status)}>
                          {c.status}
                        </Badge>
                        {c.assigned_to_user_id ? (
                          <Badge variant="outline" className="border-amber-800/50 bg-amber-950/40 text-amber-100">
                            A: {c.assigned_to_label || '—'}
                          </Badge>
                        ) : null}
                        {c.last_sent_by_label ? (
                          <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-200">
                            Sent: {c.last_sent_by_label}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.assigned_to_user_id === user?.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 border-zinc-600 px-2 text-[10px]"
                            disabled={rowBusy === c.id || !user?.id}
                            onClick={() => void patchContact(c.id, { assigned_to_user_id: null })}
                          >
                            Unclaim
                          </Button>
                        ) : !c.assigned_to_user_id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 border-zinc-600 px-2 text-[10px]"
                            disabled={rowBusy === c.id || !user?.id}
                            onClick={() => void patchContact(c.id, { assigned_to_user_id: user?.id ?? null })}
                          >
                            Claim
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  {list.length === 0 ? <li className="text-zinc-600">Empty</li> : null}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
