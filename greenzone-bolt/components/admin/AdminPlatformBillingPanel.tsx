'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { useAdminWorkspaceRegion } from '@/contexts/AdminRegionContext';
import { BillingBrandProfilePicker, BillingVendorPicker } from '@/components/admin/AdminPlatformBillingPartyPickers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CircleAlert as AlertCircle,
  FileUp,
  RefreshCw,
  CircleCheck as CheckCircle,
  Sparkles,
  Loader2,
  Undo2,
  Wallet,
  Users,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type VendorExtra = { name: string; slug: string | null; billing_delinquent: boolean } | null;
type ProfileExtra = { email: string | null } | null;

type AccountRow = {
  id: string;
  party_kind: string;
  vendor_id: string | null;
  profile_id: string | null;
  display_label: string | null;
  amount_cents: number;
  due_day_of_month: number;
  invoice_document_url: string | null;
  invoice_storage_path: string | null;
  notes: string | null;
  vendor: VendorExtra;
  profile: ProfileExtra;
};

type PeriodRow = {
  id: string;
  account_id: string;
  period_year: number;
  period_month: number;
  due_date: string;
  amount_cents: number;
  paid_at: string | null;
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function ymd(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function partyKindLabel(kind: string) {
  if (kind === 'vendor') return 'Dispensary';
  if (kind === 'internal_profile') return 'Brand / user';
  return kind;
}

type BillingMainTab = 'pay' | 'accounts' | 'more';

export function AdminPlatformBillingPanel() {
  const { toast } = useToast();
  const { region: adminWorkspaceRegion } = useAdminWorkspaceRegion();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  const [selectedPaidPeriods, setSelectedPaidPeriods] = useState<Set<string>>(new Set());
  const [markBusy, setMarkBusy] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [extractBusy, setExtractBusy] = useState(false);
  const extractCreateFileRef = useRef<HTMLInputElement>(null);

  const [formParty, setFormParty] = useState<'vendor' | 'internal_profile'>('vendor');
  const [formVendorId, setFormVendorId] = useState('');
  const [formProfileId, setFormProfileId] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDay, setFormDueDay] = useState('15');
  const [formNotes, setFormNotes] = useState('');
  const [formInvoiceUrl, setFormInvoiceUrl] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [partyPickerKey, setPartyPickerKey] = useState(0);
  const [internalLinkMode, setInternalLinkMode] = useState<'brand' | 'profile_uuid'>('brand');
  const [uploadAccountId, setUploadAccountId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [clearUploadedInvoice, setClearUploadedInvoice] = useState(false);
  const [mainTab, setMainTab] = useState<BillingMainTab>('pay');
  const [pickedDispensary, setPickedDispensary] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/admin/platform-billing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        accounts?: AccountRow[];
        periods?: PeriodRow[];
      };
      if (!res.ok) {
        toast({
          title: 'Could not load billing',
          description: j.error || res.statusText,
          variant: 'destructive',
        });
        return;
      }
      setAccounts(j.accounts || []);
      setPeriods(j.periods || []);
      setSelectedPeriods(new Set());
      setSelectedPaidPeriods(new Set());
    } catch (e) {
      toast({
        title: 'Billing load failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayUtc = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }, []);

  const stats = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    for (const p of periods) {
      if (p.paid_at) continue;
      const due = new Date(p.due_date + 'T12:00:00Z');
      if (due < todayUtc) overdue += 1;
      else if (due.getTime() <= todayUtc.getTime() + 7 * 86400000) dueSoon += 1;
    }
    return { overdue, dueSoon };
  }, [periods, todayUtc]);

  const unpaidPeriods = useMemo(
    () => periods.filter((p) => !p.paid_at).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [periods]
  );

  const unpaidByAccount = useMemo(() => {
    const m = new Map<string, PeriodRow[]>();
    for (const p of unpaidPeriods) {
      const list = m.get(p.account_id) ?? [];
      list.push(p);
      m.set(p.account_id, list);
    }
    return m;
  }, [unpaidPeriods]);

  const paidPeriodsRecent = useMemo(() => {
    return periods
      .filter((p) => p.paid_at)
      .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
      .slice(0, 120);
  }, [periods]);

  const accountLabel = (a: AccountRow) => {
    if (a.display_label?.trim()) return a.display_label.trim();
    if (a.party_kind === 'vendor' && a.vendor) return a.vendor.name;
    if (a.party_kind === 'internal_profile' && a.profile?.email) return a.profile.email;
    return a.id.slice(0, 8);
  };

  const unpaidAccountIdsOrdered = useMemo(() => {
    const ids = Array.from(unpaidByAccount.keys());
    ids.sort((a, b) => {
      const ra = accounts.find((x) => x.id === a);
      const rb = accounts.find((x) => x.id === b);
      const la = ra ? accountLabel(ra) : a;
      const lb = rb ? accountLabel(rb) : b;
      return la.localeCompare(lb);
    });
    return ids;
  }, [unpaidByAccount, accounts]);

  function beginEdit(a: AccountRow) {
    setMainTab('accounts');
    setEditingAccountId(a.id);
    setClearUploadedInvoice(false);
    setFormParty(a.party_kind === 'internal_profile' ? 'internal_profile' : 'vendor');
    setFormVendorId(a.vendor_id ?? '');
    setFormProfileId(a.profile_id ?? '');
    if (a.party_kind === 'vendor' && a.vendor_id) {
      const nm = a.vendor?.name?.trim() || accountLabel(a);
      setPickedDispensary({ id: a.vendor_id, name: nm });
    } else {
      setPickedDispensary(null);
    }
    setFormLabel(a.display_label ?? '');
    setFormAmount((a.amount_cents / 100).toFixed(2));
    setFormDueDay(String(a.due_day_of_month));
    setFormNotes(a.notes ?? '');
    setFormInvoiceUrl(a.invoice_document_url ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingAccountId(null);
    setClearUploadedInvoice(false);
    setFormParty('vendor');
    setFormVendorId('');
    setFormProfileId('');
    setFormLabel('');
    setFormAmount('');
    setFormDueDay('15');
    setFormNotes('');
    setFormInvoiceUrl('');
    setInternalLinkMode('brand');
    setPartyPickerKey((k) => k + 1);
    setPickedDispensary(null);
  }

  async function confirmDeleteBillingAccount() {
    if (!deleteTarget) return;
    try {
      setDeleteBusy(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/admin/platform-billing?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ title: 'Delete failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.account_delete',
        summary: `Deleted platform billing account ${deleteTarget.id}`,
        resourceType: 'platform_billing_account',
        resourceId: deleteTarget.id,
      });
      toast({ title: 'Billing removed', description: 'All months and files for this account were deleted.' });
      if (editingAccountId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number.parseFloat(formAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    const due = Number.parseInt(formDueDay, 10);
    if (!Number.isFinite(due) || due < 1 || due > 28) {
      toast({ title: 'Due day must be 1–28', variant: 'destructive' });
      return;
    }
    try {
      setFormSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const body: Record<string, unknown> = {
        party_kind: formParty,
        vendor_id: formParty === 'vendor' ? formVendorId.trim() : null,
        profile_id: formParty === 'internal_profile' ? formProfileId.trim() : null,
        display_label: formLabel.trim() || null,
        amount_cents: Math.round(amount * 100),
        due_day_of_month: due,
        notes: formNotes.trim() || null,
        invoice_document_url: formInvoiceUrl.trim() || null,
      };
      if (editingAccountId) {
        body.id = editingAccountId;
        if (clearUploadedInvoice) {
          body.invoice_storage_path = null;
        }
      }
      const res = await fetch('/api/admin/platform-billing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        toast({ title: 'Save failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.account_upsert',
        summary: `Platform billing account ${j.id || ''}`,
        resourceType: 'platform_billing_account',
        resourceId: j.id || '',
      });
      toast({
        title: 'Saved',
        description: editingAccountId
          ? 'Billing account saved. Periods sync through the current month.'
          : 'Billing account created. Periods sync through the current month.',
      });
      cancelEdit();
      await load();
    } finally {
      setFormSaving(false);
    }
  }

  async function markSelectedPaid() {
    if (selectedPeriods.size === 0) {
      toast({ title: 'Select periods', description: 'Choose one or more unpaid periods.', variant: 'destructive' });
      return;
    }
    try {
      setMarkBusy(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/platform-billing/mark-paid', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_ids: Array.from(selectedPeriods) }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ title: 'Mark paid failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.mark_paid',
        summary: `Marked ${selectedPeriods.size} billing period(s) paid`,
        resourceType: 'platform_billing_period',
        resourceId: Array.from(selectedPeriods).join(','),
      });
      toast({ title: 'Marked paid', description: 'Vendor storefronts restore when no overdue periods remain.' });
      await load();
    } finally {
      setMarkBusy(false);
    }
  }

  async function uploadInvoice(file: File | null) {
    if (!file || !uploadAccountId) {
      toast({ title: 'Pick account and file', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const signRes = await fetch('/api/admin/platform-billing/invoice-sign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: uploadAccountId,
          mime_type: file.type,
          bytes: file.size,
        }),
      });
      const signJ = (await signRes.json().catch(() => ({}))) as {
        error?: string;
        signed_url?: string;
        object_path?: string;
      };
      if (!signRes.ok || !signJ.signed_url) {
        toast({
          title: 'Upload sign failed',
          description: signJ.error || signRes.statusText,
          variant: 'destructive',
        });
        return;
      }
      const put = await fetch(signJ.signed_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) {
        toast({ title: 'Upload failed', description: put.statusText, variant: 'destructive' });
        return;
      }
      const saveRes = await fetch('/api/admin/platform-billing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uploadAccountId,
          party_kind: accounts.find((a) => a.id === uploadAccountId)?.party_kind || 'vendor',
          vendor_id: accounts.find((a) => a.id === uploadAccountId)?.vendor_id,
          profile_id: accounts.find((a) => a.id === uploadAccountId)?.profile_id,
          display_label: accounts.find((a) => a.id === uploadAccountId)?.display_label,
          amount_cents: accounts.find((a) => a.id === uploadAccountId)?.amount_cents ?? 0,
          due_day_of_month: accounts.find((a) => a.id === uploadAccountId)?.due_day_of_month ?? 15,
          notes: accounts.find((a) => a.id === uploadAccountId)?.notes,
          invoice_document_url: accounts.find((a) => a.id === uploadAccountId)?.invoice_document_url,
          invoice_storage_path: signJ.object_path,
        }),
      });
      const saveJ = (await saveRes.json().catch(() => ({}))) as { error?: string };
      if (!saveRes.ok) {
        toast({ title: 'Could not save path', description: saveJ.error, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.invoice_upload',
        summary: `Uploaded invoice for billing account ${uploadAccountId}`,
        resourceType: 'platform_billing_account',
        resourceId: uploadAccountId,
      });
      toast({ title: 'Invoice attached', description: 'Vendors on this account can open it from their billing page.' });
      await load();
    } finally {
      setUploading(false);
    }
  }

  function allUnpaidPeriodIdsForAccount(accountId: string): string[] {
    return (unpaidByAccount.get(accountId) ?? []).map((p) => p.id);
  }

  function accountHeaderCheckboxState(accountId: string): boolean | 'indeterminate' {
    const ids = allUnpaidPeriodIdsForAccount(accountId);
    if (ids.length === 0) return false;
    const selected = ids.filter((id) => selectedPeriods.has(id)).length;
    if (selected === 0) return false;
    if (selected === ids.length) return true;
    return 'indeterminate';
  }

  function toggleAllUnpaidForAccount(accountId: string) {
    const ids = allUnpaidPeriodIdsForAccount(accountId);
    if (ids.length === 0) return;
    const allOn = ids.every((id) => selectedPeriods.has(id));
    const next = new Set(selectedPeriods);
    for (const id of ids) {
      if (allOn) next.delete(id);
      else next.add(id);
    }
    setSelectedPeriods(next);
  }

  async function markAccountAllPaid(accountId: string) {
    try {
      setMarkBusy(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/platform-billing/mark-paid', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_ids: [accountId] }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ title: 'Mark paid failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.mark_paid',
        summary: `Marked all open periods paid for account ${accountId}`,
        resourceType: 'platform_billing_account',
        resourceId: accountId,
      });
      toast({ title: 'Marked paid', description: 'All open periods for this account are closed.' });
      await load();
    } finally {
      setMarkBusy(false);
    }
  }

  async function extractSuggestionsForAccount(accountId: string, file?: File | null) {
    const acc = accountId ? accounts.find((x) => x.id === accountId) : undefined;
    if (!file && !acc?.invoice_storage_path) {
      toast({
        title: 'No invoice file',
        description: 'Upload a PDF or image first, or pick a file below for extract-only (no upload).',
        variant: 'destructive',
      });
      return;
    }
    try {
      setExtractBusy(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        res = await fetch('/api/admin/platform-billing/extract-invoice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } else {
        res = await fetch('/api/admin/platform-billing/extract-invoice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId }),
        });
      }
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        amount_cents?: number | null;
        due_day_of_month?: number | null;
        invoice_number?: string | null;
        note?: string;
      };
      if (!res.ok) {
        toast({ title: 'Extract failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      if (acc) {
        beginEdit(acc);
      } else {
        cancelEdit();
        setMainTab('accounts');
      }
      if (typeof j.amount_cents === 'number' && Number.isFinite(j.amount_cents) && j.amount_cents >= 0) {
        setFormAmount((j.amount_cents / 100).toFixed(2));
      }
      if (
        typeof j.due_day_of_month === 'number' &&
        Number.isFinite(j.due_day_of_month) &&
        j.due_day_of_month >= 1 &&
        j.due_day_of_month <= 28
      ) {
        setFormDueDay(String(j.due_day_of_month));
      }
      if (typeof j.invoice_number === 'string' && j.invoice_number.trim()) {
        const inv = j.invoice_number.trim();
        setFormNotes((prev) => {
          const p = prev.trim();
          if (p.includes(inv)) return prev;
          return p ? `${p} · Invoice #${inv}` : `Invoice #${inv}`;
        });
      }
      toast({
        title: 'Suggestions applied',
        description: j.note || 'Review fields and click Save — nothing is stored until you save.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setExtractBusy(false);
    }
  }

  async function runReopenSelected() {
    if (selectedPaidPeriods.size === 0) return;
    try {
      setReopenBusy(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/platform-billing/mark-unpaid', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_ids: Array.from(selectedPaidPeriods) }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({ title: 'Reopen failed', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'platform_billing.mark_unpaid',
        summary: `Reopened ${selectedPaidPeriods.size} billing period(s)`,
        resourceType: 'platform_billing_period',
        resourceId: Array.from(selectedPaidPeriods).join(','),
      });
      toast({
        title: 'Periods reopened',
        description: 'Those months are unpaid again; delinquency rules re-apply if overdue.',
      });
      setReopenDialogOpen(false);
      await load();
    } finally {
      setReopenBusy(false);
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40 p-8 text-zinc-400">Loading platform billing…</Card>
    );
  }

  const tabTriggerClass =
    'gap-1.5 px-3 py-2 text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-none';

  return (
    <div className="space-y-4">
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as BillingMainTab)} className="w-full gap-4">
        <TabsList className="mb-1 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 sm:flex-nowrap">
          <TabsTrigger value="pay" className={`${tabTriggerClass} data-[state=active]:bg-emerald-950/70 data-[state=active]:text-emerald-100`}>
            <Wallet className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Mark paid
            {stats.overdue > 0 ? (
              <span className="ml-0.5 rounded-full bg-red-600/90 px-1.5 py-px text-[10px] font-semibold leading-none text-white">
                {stats.overdue}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="accounts" className={tabTriggerClass}>
            <Users className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Set up billing
          </TabsTrigger>
          <TabsTrigger value="more" className={tabTriggerClass}>
            <FolderOpen className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Files & undo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pay" className="mt-0 space-y-4 focus-visible:outline-none">
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">Usual flow:</span> tick the months you received payment for, then
            click <span className="text-zinc-200">Mark paid</span>. Or use <span className="text-zinc-200">Pay all</span>{' '}
            on a row to clear every open month for that shop.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-red-900/30 bg-red-950/20 p-4">
              <div className="flex items-center gap-2 text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Overdue</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{stats.overdue}</p>
              <p className="mt-1 text-xs text-zinc-500">Past due — dispensary may be hidden until paid.</p>
            </Card>
            <Card className="border-amber-900/30 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Due in 7 days</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{stats.dueSoon}</p>
              <p className="mt-1 text-xs text-zinc-500">They get a heads-up on their dashboard.</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="border-zinc-700">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={markBusy || selectedPeriods.size === 0}
              onClick={() => void markSelectedPaid()}
              className="bg-emerald-700 hover:bg-emerald-600"
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Mark paid ({selectedPeriods.size} selected)
            </Button>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="mb-1 text-base font-semibold text-white">Open months</h3>
            <p className="mb-3 text-sm text-zinc-500">Unpaid invoice months, grouped by shop or user.</p>
        {unpaidPeriods.length === 0 ? (
          <p className="text-sm text-zinc-500">No open periods.</p>
        ) : (
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {unpaidAccountIdsOrdered.map((accountId) => {
              const group = unpaidByAccount.get(accountId) ?? [];
              const acc = accounts.find((a) => a.id === accountId);
              const headState = accountHeaderCheckboxState(accountId);
              return (
                <div key={accountId} className="space-y-2 rounded-md border border-zinc-800 bg-black/20 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                    <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-200">
                      <Checkbox
                        checked={
                          headState === true ? true : headState === 'indeterminate' ? 'indeterminate' : false
                        }
                        onCheckedChange={() => toggleAllUnpaidForAccount(accountId)}
                        className="shrink-0"
                      />
                      <span className="truncate">{acc ? accountLabel(acc) : accountId.slice(0, 8)}</span>
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 shrink-0 text-xs"
                      disabled={markBusy || group.length === 0}
                      onClick={() => void markAccountAllPaid(accountId)}
                    >
                      Pay all open
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {group.map((p) => {
                      const due = new Date(p.due_date + 'T12:00:00Z');
                      const overdue = due < todayUtc;
                      const soon =
                        !overdue && due.getTime() <= todayUtc.getTime() + 7 * 86400000;
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-black/30 p-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedPeriods.has(p.id)}
                            onCheckedChange={(c) => {
                              const next = new Set(selectedPeriods);
                              if (c === true) next.add(p.id);
                              else next.delete(p.id);
                              setSelectedPeriods(next);
                            }}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-zinc-500">
                              {p.period_year}-{String(p.period_month).padStart(2, '0')} · Due {ymd(p.due_date)} ·{' '}
                              {money(p.amount_cents)}
                            </div>
                          </div>
                          {overdue ? (
                            <Badge variant="destructive" className="shrink-0">
                              Overdue
                            </Badge>
                          ) : soon ? (
                            <Badge className="shrink-0 border-amber-700 bg-amber-950/50 text-amber-200">≤7d</Badge>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-0 space-y-4 focus-visible:outline-none">
          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="mb-1 text-base font-semibold text-white">Who you bill</h3>
            <p className="mb-3 text-sm text-zinc-500">
              {accounts.length === 0
                ? 'Add someone with the form below.'
                : `${accounts.length} row${accounts.length === 1 ? '' : 's'} — Edit opens the form under this list.`}
            </p>
            <ul className="space-y-2 text-sm text-zinc-300">
              {accounts.length === 0 ? (
                <li className="text-zinc-500">Nobody yet.</li>
              ) : (
                accounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded border border-zinc-800 bg-black/20 p-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{accountLabel(a)}</span>
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                          {partyKindLabel(a.party_kind)}
                        </Badge>
                        {a.vendor?.billing_delinquent ? (
                          <Badge variant="destructive">Behind</Badge>
                        ) : (
                          <Badge className="border-emerald-800 bg-emerald-950/40 text-emerald-200">Current</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {money(a.amount_cents)} / month · due day {a.due_day_of_month}
                        {a.invoice_storage_path ? ' · invoice on file' : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-zinc-600 text-zinc-200"
                        onClick={() => beginEdit(a)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-900/50 text-red-300 hover:bg-red-950/40"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">
                {editingAccountId ? 'Edit billing' : 'Add someone new'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {editingAccountId ? (
                  <Button type="button" size="sm" variant="ghost" className="text-zinc-400" onClick={() => cancelEdit()}>
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300"
                  onClick={() => {
                    cancelEdit();
                    setMainTab('accounts');
                  }}
                >
                  Clear form
                </Button>
              </div>
            </div>
            <form onSubmit={(e) => void saveAccount(e)} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-zinc-400">Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white disabled:opacity-60"
              value={formParty}
              disabled={Boolean(editingAccountId)}
              onChange={(e) => {
                setFormParty(e.target.value as 'vendor' | 'internal_profile');
                setPartyPickerKey((k) => k + 1);
                setInternalLinkMode('brand');
                setPickedDispensary(null);
                if (e.target.value === 'vendor') setFormProfileId('');
                else setFormVendorId('');
              }}
            >
              <option value="vendor">Dispensary (affects live shop if overdue)</option>
              <option value="internal_profile">Brand or other user</option>
            </select>
          </div>
          {formParty === 'vendor' ? (
            <div className="space-y-1.5 sm:col-span-2">
              {!editingAccountId ? (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/25 px-3 py-2.5 text-sm">
                  {formVendorId.trim() &&
                  pickedDispensary &&
                  pickedDispensary.id === formVendorId.trim() ? (
                    <p className="text-zinc-200">
                      <span className="text-zinc-500">Creating billing for </span>
                      <span className="font-semibold text-white">{pickedDispensary.name}</span>
                      <span className="text-zinc-500"> — set amount and due day, then add billing.</span>
                    </p>
                  ) : (
                    <p className="text-zinc-400">
                      Choose the dispensary this billing is for (search below). That shop is the one tied to this
                      account.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-300">
                  Editing billing for{' '}
                  <span className="font-semibold text-white">
                    {(() => {
                      const ed = accounts.find((x) => x.id === editingAccountId);
                      if (!ed) return 'this account';
                      return ed.vendor?.name?.trim() || accountLabel(ed);
                    })()}
                  </span>
                </div>
              )}
              <Label className="text-zinc-400">Dispensary</Label>
              <BillingVendorPicker
                key={partyPickerKey}
                vendorId={formVendorId}
                onVendorIdChange={setFormVendorId}
                onDispensaryChosen={({ id, displayName }) => {
                  setPickedDispensary({ id, name: displayName });
                }}
                disabled={Boolean(editingAccountId)}
                disabledSummary={
                  editingAccountId
                    ? (() => {
                        const a = accounts.find((x) => x.id === editingAccountId);
                        const name = a?.vendor?.name?.trim();
                        return name
                          ? `${name} · ${formVendorId.slice(0, 8)}…`
                          : `Vendor ${formVendorId.slice(0, 8)}…`;
                      })()
                    : undefined
                }
                region={adminWorkspaceRegion}
              />
              <p className="text-xs text-zinc-500">Search by name, email, or slug. Sidebar region filter applies.</p>
            </div>
          ) : editingAccountId ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-zinc-400">Profile</Label>
              <div className="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
                {accounts.find((x) => x.id === editingAccountId)?.profile?.email || '—'}
                <span className="mt-1 block font-mono text-xs text-zinc-500">{formProfileId}</span>
              </div>
              <p className="text-xs text-zinc-500">Profile cannot be changed when editing an account.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:col-span-2">
              <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="internal-link"
                    className="border-zinc-600"
                    checked={internalLinkMode === 'brand'}
                    onChange={() => {
                      setInternalLinkMode('brand');
                      setFormProfileId('');
                      setPartyPickerKey((k) => k + 1);
                    }}
                  />
                  Brand (page manager)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="internal-link"
                    className="border-zinc-600"
                    checked={internalLinkMode === 'profile_uuid'}
                    onChange={() => {
                      setInternalLinkMode('profile_uuid');
                      setFormProfileId('');
                    }}
                  />
                  Profile UUID (advanced)
                </label>
              </div>
              {internalLinkMode === 'brand' ? (
                <>
                  <Label className="text-zinc-400">Brand</Label>
                  <BillingBrandProfilePicker
                    key={partyPickerKey}
                    profileId={formProfileId}
                    onProfileIdChange={setFormProfileId}
                    onBrandLabelHint={(hint) => {
                      setFormLabel((prev) => (prev.trim() ? prev : hint));
                    }}
                  />
                  <p className="text-xs text-zinc-500">Uses brand page managers (set under Brand pages).</p>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Profile ID (UUID)</Label>
                  <Input
                    value={formProfileId}
                    onChange={(e) => setFormProfileId(e.target.value)}
                    placeholder="profiles.id (auth user id)"
                    className="border-zinc-700 bg-zinc-950 text-white"
                  />
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-zinc-400">Nickname (optional)</Label>
            <Input
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Amount (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Due day each month (1–28)</Label>
            <Input
              type="number"
              min={1}
              max={28}
              value={formDueDay}
              onChange={(e) => setFormDueDay(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-zinc-400">Invoice URL (optional)</Label>
            <Input
              value={formInvoiceUrl}
              onChange={(e) => setFormInvoiceUrl(e.target.value)}
              placeholder="https://…"
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          {editingAccountId ? (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="clear-uploaded-invoice"
                checked={clearUploadedInvoice}
                onCheckedChange={(c) => setClearUploadedInvoice(c === true)}
              />
              <Label htmlFor="clear-uploaded-invoice" className="cursor-pointer text-sm font-normal text-zinc-400">
                Remove uploaded invoice file from this account (keeps URL above if set)
              </Label>
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-zinc-400">Notes</Label>
            <Input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={formSaving} className="bg-emerald-700 hover:bg-emerald-600">
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              {editingAccountId ? 'Save' : 'Add billing'}
            </Button>
            {editingAccountId && accounts.find((a) => a.id === editingAccountId)?.invoice_storage_path ? (
              <Button
                type="button"
                variant="outline"
                disabled={extractBusy}
                className="border-violet-700/50 text-violet-200"
                onClick={() => void extractSuggestionsForAccount(editingAccountId)}
              >
                {extractBusy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Extract from invoice file
              </Button>
            ) : null}
            {!editingAccountId ? (
              <>
                <input
                  ref={extractCreateFileRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={extractBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (f) void extractSuggestionsForAccount('', f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-violet-700/50 text-violet-200"
                  disabled={extractBusy}
                  onClick={() => extractCreateFileRef.current?.click()}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Extract from file (no upload)
                </Button>
              </>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-zinc-500 sm:col-span-2">
            One row per shop or user. New amount/due day affects future months; old months stay until you mark paid.
          </p>
        </form>
          </Card>
        </TabsContent>

        <TabsContent value="more" className="mt-0 space-y-4 focus-visible:outline-none">
          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="mb-1 text-base font-semibold text-white">Upload invoice</h3>
            <p className="mb-3 text-sm text-zinc-500">They can open this from their own billing page.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-zinc-400">Recipient</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
                  value={uploadAccountId}
                  onChange={(e) => setUploadAccountId(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountLabel(a)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="border-zinc-700 bg-zinc-950 text-sm text-zinc-300 file:mr-2"
                  disabled={uploading || !uploadAccountId}
                  onChange={(e) => void uploadInvoice(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-violet-700/50 text-violet-200"
                disabled={
                  extractBusy ||
                  !uploadAccountId ||
                  !accounts.find((a) => a.id === uploadAccountId)?.invoice_storage_path
                }
                onClick={() => void extractSuggestionsForAccount(uploadAccountId)}
              >
                {extractBusy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Fill form from uploaded file
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                <span className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 hover:bg-zinc-900">
                  Fill from file…
                </span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={extractBusy || !uploadAccountId}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (f && uploadAccountId) void extractSuggestionsForAccount(uploadAccountId, f);
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              AI uses <code className="text-zinc-400">OPENAI_API_KEY</code> on the server. Opens the billing form with
              guesses — always review and Save.
            </p>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="mb-1 text-base font-semibold text-white">Undo a mistaken payment</h3>
            <p className="mb-3 text-sm text-zinc-500">Select paid months, then reopen — they become unpaid again.</p>
            {paidPeriodsRecent.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent paid months loaded.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-800/50 text-amber-200"
                    disabled={selectedPaidPeriods.size === 0 || reopenBusy}
                    onClick={() => setReopenDialogOpen(true)}
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    Reopen selected ({selectedPaidPeriods.size})
                  </Button>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {paidPeriodsRecent.map((p) => {
                    const acc = accounts.find((a) => a.id === p.account_id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-800 bg-black/30 p-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedPaidPeriods.has(p.id)}
                          onCheckedChange={(c) => {
                            const next = new Set(selectedPaidPeriods);
                            if (c === true) next.add(p.id);
                            else next.delete(p.id);
                            setSelectedPaidPeriods(next);
                          }}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-zinc-200">{acc ? accountLabel(acc) : p.account_id}</div>
                          <div className="text-zinc-500">
                            {p.period_year}-{String(p.period_month).padStart(2, '0')} · Paid{' '}
                            {p.paid_at ? ymd(p.paid_at.slice(0, 10)) : '—'} · {money(p.amount_cents)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !deleteBusy && !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete billing for {deleteTarget ? accountLabel(deleteTarget) : '…'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This removes every invoice month and any uploaded file for this account. Shops can no longer see platform
              billing here. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-800"
              disabled={deleteBusy}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-800 text-white hover:bg-red-700"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteBillingAccount();
              }}
            >
              {deleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete billing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenDialogOpen} onOpenChange={(o) => !reopenBusy && setReopenDialogOpen(o)}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen {selectedPaidPeriods.size} paid period(s)?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              These months will show as unpaid again. If any due dates are already in the past, vendor storefronts may
              become hidden until you mark them paid again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-800" disabled={reopenBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-800 text-white hover:bg-amber-700"
              disabled={reopenBusy}
              onClick={(e) => {
                e.preventDefault();
                void runReopenSelected();
              }}
            >
              {reopenBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reopen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
