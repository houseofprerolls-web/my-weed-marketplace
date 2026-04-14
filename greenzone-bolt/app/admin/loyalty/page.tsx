'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import { useToast } from '@/hooks/use-toast';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { AlertCircle, Gift, ImageIcon, Loader2, ShoppingBag, Trash2, Trophy, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type PrizeRow = { prize_rank: number; title: string; description: string; image_url: string };

type LeaderRow = {
  consumer_id: string;
  email: string;
  username: string;
  points_month: number;
  spend_cents_month: number;
  orders_credited: number;
};

type LoyaltyStoreItemRow = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  points_cost: number;
  item_type: string;
  sort_order: number;
  active: boolean;
  stock_remaining: string;
};

const LOYALTY_STORE_ITEM_TYPES = ['merch', 'credit', 'digital', 'event', 'bundle', 'other'] as const;

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function utcMonthInputValue(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseMonthInput(v: string): { year: number; month: number; monthStart: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month, monthStart: `${m[1]}-${m[2]}-01` };
}

export default function AdminLoyaltyPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [monthInput, setMonthInput] = useState(() => utcMonthInputValue(new Date()));
  const [prizes, setPrizes] = useState<PrizeRow[]>([
    { prize_rank: 1, title: '', description: '', image_url: '' },
    { prize_rank: 2, title: '', description: '', image_url: '' },
    { prize_rank: 3, title: '', description: '', image_url: '' },
  ]);
  const [uploadingRank, setUploadingRank] = useState<number | null>(null);
  const [prizesLoading, setPrizesLoading] = useState(false);
  const [prizesSaving, setPrizesSaving] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [storeItems, setStoreItems] = useState<LoyaltyStoreItemRow[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeUploadingId, setStoreUploadingId] = useState<string | null>(null);

  const parsed = useMemo(() => parseMonthInput(monthInput), [monthInput]);

  const loadPrizes = useCallback(async () => {
    if (!parsed) return;
    setPrizesLoading(true);
    try {
      const { data, error } = await supabase
        .from('datreehouse_monthly_prizes')
        .select('prize_rank, title, description, image_url')
        .eq('month_start', parsed.monthStart)
        .order('prize_rank', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as {
        prize_rank: number;
        title: string;
        description: string | null;
        image_url: string | null;
      }[];
      const byRank = new Map(rows.map((r) => [r.prize_rank, r]));
      setPrizes(
        [1, 2, 3].map((rank) => {
          const hit = byRank.get(rank);
          return {
            prize_rank: rank,
            title: hit?.title ?? '',
            description: hit?.description ?? '',
            image_url: hit?.image_url?.trim() ?? '',
          };
        })
      );
    } catch (e) {
      toast({
        title: 'Could not load prizes',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setPrizesLoading(false);
    }
  }, [parsed, toast]);

  const loadBoard = useCallback(async () => {
    if (!parsed) return;
    setBoardLoading(true);
    try {
      const { data, error } = await supabase.rpc('datreehouse_loyalty_admin_leaderboard', {
        p_year: parsed.year,
        p_month: parsed.month,
        p_limit: 200,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setBoard(
        rows.map((r: Record<string, unknown>) => ({
          consumer_id: String(r.consumer_id ?? ''),
          email: String(r.email ?? ''),
          username: String(r.username ?? ''),
          points_month: num(r.points_month),
          spend_cents_month: num(r.spend_cents_month),
          orders_credited: num(r.orders_credited),
        }))
      );
    } catch (e) {
      toast({
        title: 'Could not load leaderboard',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
      setBoard([]);
    } finally {
      setBoardLoading(false);
    }
  }, [parsed, toast]);

  const loadStoreItems = useCallback(async () => {
    if (!isAdmin) return;
    setStoreLoading(true);
    try {
      const { data, error } = await supabase
        .from('datreehouse_loyalty_store_items')
        .select('id,title,description,image_url,points_cost,item_type,sort_order,active,stock_remaining')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as {
        id: string;
        title: string;
        description: string | null;
        image_url: string | null;
        points_cost: number;
        item_type: string;
        sort_order: number;
        active: boolean;
        stock_remaining: number | null;
      }[];
      setStoreItems(
        rows.map((r) => ({
          id: r.id,
          title: r.title ?? '',
          description: r.description ?? '',
          image_url: r.image_url?.trim() ?? '',
          points_cost: num(r.points_cost),
          item_type: r.item_type || 'other',
          sort_order: num(r.sort_order),
          active: Boolean(r.active),
          stock_remaining: r.stock_remaining == null ? '' : String(r.stock_remaining),
        }))
      );
    } catch (e) {
      toast({
        title: 'Could not load loyalty store',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
      setStoreItems([]);
    } finally {
      setStoreLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!isAdmin || !parsed) return;
    void loadPrizes();
    void loadBoard();
  }, [isAdmin, parsed, loadPrizes, loadBoard]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadStoreItems();
  }, [isAdmin, loadStoreItems]);

  async function addStoreItem() {
    setStoreSaving(true);
    try {
      const nextSort =
        storeItems.length === 0 ? 0 : Math.max(...storeItems.map((s) => s.sort_order), 0) + 10;
      const { error } = await supabase.from('datreehouse_loyalty_store_items').insert({
        title: 'New store item',
        description: null,
        image_url: null,
        points_cost: 500,
        item_type: 'other',
        sort_order: nextSort,
        active: false,
        stock_remaining: null,
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'loyalty.store.create',
        summary: 'Created Da Treehouse loyalty store item (draft)',
        resourceType: 'datreehouse_loyalty_store_items',
        metadata: {},
      });
      toast({ title: 'Draft item added', description: 'Edit fields and save, then set Active when ready.' });
      await loadStoreItems();
    } catch (e) {
      toast({
        title: 'Could not add item',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setStoreSaving(false);
    }
  }

  async function saveStoreItem(row: LoyaltyStoreItemRow) {
    setStoreSaving(true);
    try {
      const stockRaw = row.stock_remaining.trim();
      let stockRemaining: number | null = null;
      if (stockRaw !== '') {
        const n = Number(stockRaw);
        if (!Number.isInteger(n) || n < 0) {
          throw new Error('Stock must be blank (unlimited) or a non-negative integer.');
        }
        stockRemaining = n;
      }
      const pc = Math.floor(row.points_cost);
      if (!Number.isFinite(pc) || pc <= 0) {
        throw new Error('Points cost must be a positive integer.');
      }
      const { error } = await supabase
        .from('datreehouse_loyalty_store_items')
        .update({
          title: row.title.trim() || 'Store item',
          description: row.description.trim() || null,
          image_url: row.image_url.trim() || null,
          points_cost: pc,
          item_type: row.item_type || 'other',
          sort_order: Math.floor(row.sort_order) || 0,
          active: row.active,
          stock_remaining: stockRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'loyalty.store.save',
        summary: `Updated loyalty store item ${row.id}`,
        resourceType: 'datreehouse_loyalty_store_items',
        resourceId: row.id,
        metadata: { title: row.title },
      });
      toast({ title: 'Saved', description: 'Store item updated.' });
      await loadStoreItems();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setStoreSaving(false);
    }
  }

  async function deleteStoreItem(id: string) {
    if (!window.confirm('Delete this store item? Redemption history is kept; this cannot be undone.')) return;
    setStoreSaving(true);
    try {
      const { error } = await supabase.from('datreehouse_loyalty_store_items').delete().eq('id', id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'loyalty.store.delete',
        summary: `Deleted loyalty store item ${id}`,
        resourceType: 'datreehouse_loyalty_store_items',
        resourceId: id,
        metadata: {},
      });
      toast({ title: 'Deleted' });
      await loadStoreItems();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setStoreSaving(false);
    }
  }

  async function handleStoreImageUpload(itemId: string, file: File) {
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setStoreUploadingId(itemId);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      setStoreItems((prev) =>
        prev.map((row) => (row.id === itemId ? { ...row, image_url: up.url } : row))
      );
      toast({
        title: 'Image uploaded',
        description: 'URL filled in — click Save on this item to persist.',
      });
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setStoreUploadingId(null);
    }
  }

  async function handlePrizeImageUpload(rank: number, file: File) {
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setUploadingRank(rank);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      setPrizes((prev) => prev.map((row) => (row.prize_rank === rank ? { ...row, image_url: up.url } : row)));
      toast({
        title: 'Image uploaded',
        description: 'URL filled in below — click “Save prizes” to store it for this month.',
      });
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setUploadingRank(null);
    }
  }

  async function savePrizes() {
    if (!parsed) return;
    setPrizesSaving(true);
    try {
      const rows = prizes.map((p) => ({
        month_start: parsed.monthStart,
        prize_rank: p.prize_rank,
        title: p.title.trim() || `Prize ${p.prize_rank}`,
        description: p.description.trim() || null,
        image_url: p.image_url.trim() || null,
      }));
      const { error } = await supabase.from('datreehouse_monthly_prizes').upsert(rows, {
        onConflict: 'month_start,prize_rank',
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'loyalty.prizes.save',
        summary: `Saved Da Treehouse monthly prizes for ${parsed.monthStart}`,
        resourceType: 'datreehouse_monthly_prizes',
        resourceId: parsed.monthStart,
        metadata: { ranks: rows.map((r) => r.prize_rank) },
      });
      toast({ title: 'Saved', description: 'Monthly prizes updated for this month.' });
      await loadPrizes();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setPrizesSaving(false);
    }
  }

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900/50 text-emerald-200">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Da Treehouse loyalty</h1>
          <p className="text-sm text-zinc-400">
            Edit monthly prizes and review shopper points (1 pt / $1 on completed orders, UTC month).
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="loyalty-month" className="text-zinc-300">
            Calendar month (UTC)
          </Label>
          <Input
            id="loyalty-month"
            type="month"
            value={monthInput}
            onChange={(e) => setMonthInput(e.target.value)}
            className="w-52 border-zinc-700 bg-zinc-900 text-white"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-zinc-600 text-zinc-200"
          disabled={!parsed || boardLoading}
          onClick={() => void loadBoard()}
        >
          Refresh leaderboard
        </Button>
      </div>

      <Card className="mb-8 border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
          Monthly prizes (shopper-facing)
        </h2>
        {prizesLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="space-y-5">
            {prizes.map((p, idx) => (
              <div
                key={p.prize_rank}
                className="rounded-lg border border-zinc-800 bg-black/30 p-4"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                  Rank #{p.prize_rank}
                </p>
                <Label className="text-zinc-400">Title</Label>
                <Input
                  value={p.title}
                  onChange={(e) => {
                    const next = [...prizes];
                    next[idx] = { ...next[idx]!, title: e.target.value };
                    setPrizes(next);
                  }}
                  className="mt-1 border-zinc-700 bg-zinc-950 text-white"
                  placeholder={`Prize ${p.prize_rank} headline`}
                />
                <Label className="mt-3 block text-zinc-400">Prize photo</Label>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Optional image for 1st place only (shown on /loyalty-store; ranks 2–3 are text-only). Paste a URL or upload to vendor-media.
                </p>
                {p.image_url.trim() ? (
                  <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview; arbitrary URLs */}
                    <img
                      src={p.image_url.trim()}
                      alt=""
                      className="max-h-40 w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 text-zinc-600">
                    <ImageIcon className="h-8 w-8 opacity-50" aria-hidden />
                  </div>
                )}
                <Input
                  value={p.image_url}
                  onChange={(e) => {
                    const next = [...prizes];
                    next[idx] = { ...next[idx]!, image_url: e.target.value };
                    setPrizes(next);
                  }}
                  className="mt-2 border-zinc-700 bg-zinc-950 text-white"
                  placeholder="https://…"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    id={`loyalty-prize-img-${p.prize_rank}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingRank === p.prize_rank}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handlePrizeImageUpload(p.prize_rank, f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-600 text-zinc-200"
                    disabled={!user || uploadingRank === p.prize_rank}
                    onClick={() => document.getElementById(`loyalty-prize-img-${p.prize_rank}`)?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {uploadingRank === p.prize_rank ? 'Uploading…' : 'Upload image'}
                  </Button>
                  {p.image_url.trim() ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-white"
                      onClick={() => {
                        const next = [...prizes];
                        next[idx] = { ...next[idx]!, image_url: '' };
                        setPrizes(next);
                      }}
                    >
                      Clear image
                    </Button>
                  ) : null}
                </div>
                <Label className="mt-3 block text-zinc-400">Description</Label>
                <Textarea
                  value={p.description}
                  onChange={(e) => {
                    const next = [...prizes];
                    next[idx] = { ...next[idx]!, description: e.target.value };
                    setPrizes(next);
                  }}
                  className="mt-1 min-h-[72px] border-zinc-700 bg-zinc-950 text-white"
                  placeholder="What winners get, fulfillment notes, etc."
                />
              </div>
            ))}
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              disabled={!parsed || prizesSaving}
              onClick={() => void savePrizes()}
            >
              {prizesSaving ? 'Saving…' : 'Save prizes for this month'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="mb-8 border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShoppingBag className="h-5 w-5 text-sky-400" aria-hidden />
            Loyalty points store
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-200"
              disabled={storeLoading || storeSaving}
              onClick={() => void loadStoreItems()}
            >
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-sky-700 text-white hover:bg-sky-600"
              disabled={storeSaving}
              onClick={() => void addStoreItem()}
            >
              Add store item
            </Button>
          </div>
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Shoppers redeem with lifetime earned points minus prior store redemptions. Leave stock blank for unlimited;
          otherwise each redemption decrements stock. Inactive items are hidden from the public catalog.
        </p>
        {storeLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : storeItems.length === 0 ? (
          <p className="text-sm text-zinc-500">No store items yet — add one to populate the shopper points store (/loyalty-store).</p>
        ) : (
          <div className="space-y-5">
            {storeItems.map((row, idx) => (
              <div key={row.id} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-mono text-zinc-600">{row.id}</p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`store-active-${row.id}`} className="text-xs text-zinc-400">
                      Active
                    </Label>
                    <Switch
                      id={`store-active-${row.id}`}
                      checked={row.active}
                      onCheckedChange={(v) => {
                        const next = [...storeItems];
                        next[idx] = { ...next[idx]!, active: Boolean(v) };
                        setStoreItems(next);
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-zinc-400">Title</Label>
                    <Input
                      value={row.title}
                      onChange={(e) => {
                        const next = [...storeItems];
                        next[idx] = { ...next[idx]!, title: e.target.value };
                        setStoreItems(next);
                      }}
                      className="mt-1 border-zinc-700 bg-zinc-950 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Item type</Label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
                      value={row.item_type}
                      onChange={(e) => {
                        const next = [...storeItems];
                        next[idx] = { ...next[idx]!, item_type: e.target.value };
                        setStoreItems(next);
                      }}
                    >
                      {LOYALTY_STORE_ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Points cost</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={row.points_cost || ''}
                      onChange={(e) => {
                        const next = [...storeItems];
                        next[idx] = { ...next[idx]!, points_cost: num(e.target.value) };
                        setStoreItems(next);
                      }}
                      className="mt-1 border-zinc-700 bg-zinc-950 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Sort order</Label>
                    <Input
                      type="number"
                      step={1}
                      value={row.sort_order}
                      onChange={(e) => {
                        const next = [...storeItems];
                        next[idx] = { ...next[idx]!, sort_order: num(e.target.value) };
                        setStoreItems(next);
                      }}
                      className="mt-1 border-zinc-700 bg-zinc-950 text-white"
                    />
                  </div>
                </div>
                <Label className="mt-3 block text-zinc-400">Description</Label>
                <Textarea
                  value={row.description}
                  onChange={(e) => {
                    const next = [...storeItems];
                    next[idx] = { ...next[idx]!, description: e.target.value };
                    setStoreItems(next);
                  }}
                  className="mt-1 min-h-[64px] border-zinc-700 bg-zinc-950 text-white"
                />
                <Label className="mt-3 block text-zinc-400">Image</Label>
                <p className="mt-0.5 text-xs text-zinc-500">Public URL or upload to vendor-media.</p>
                {row.image_url.trim() ? (
                  <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.image_url.trim()} alt="" className="max-h-36 w-full object-contain" />
                  </div>
                ) : null}
                <Input
                  value={row.image_url}
                  onChange={(e) => {
                    const next = [...storeItems];
                    next[idx] = { ...next[idx]!, image_url: e.target.value };
                    setStoreItems(next);
                  }}
                  className="mt-2 border-zinc-700 bg-zinc-950 text-white"
                  placeholder="https://…"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    id={`store-img-${row.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={storeUploadingId === row.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleStoreImageUpload(row.id, f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-600 text-zinc-200"
                    disabled={!user || storeUploadingId === row.id}
                    onClick={() => document.getElementById(`store-img-${row.id}`)?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {storeUploadingId === row.id ? 'Uploading…' : 'Upload image'}
                  </Button>
                </div>
                <Label className="mt-3 block text-zinc-400">Stock remaining</Label>
                <p className="mt-0.5 text-xs text-zinc-500">Blank = unlimited.</p>
                <Input
                  value={row.stock_remaining}
                  onChange={(e) => {
                    const next = [...storeItems];
                    next[idx] = { ...next[idx]!, stock_remaining: e.target.value };
                    setStoreItems(next);
                  }}
                  className="mt-1 max-w-xs border-zinc-700 bg-zinc-950 text-white"
                  placeholder="e.g. 10"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-sky-700 text-white hover:bg-sky-600"
                    disabled={storeSaving}
                    onClick={() => void saveStoreItem(row)}
                  >
                    Save item
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={storeSaving}
                    onClick={() => void deleteStoreItem(row.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Admin leaderboard</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Points earned this month and total subtotal on orders that credited those points (linked rows). Dollars are
          approximate from cents.
        </p>
        {boardLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : board.length === 0 ? (
          <p className="text-sm text-zinc-500">No loyalty activity for this month yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Username</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium text-right">Points</th>
                  <th className="px-3 py-2 font-medium text-right">Spend (subtotal)</th>
                  <th className="px-3 py-2 font-medium text-right">Orders</th>
                  <th className="px-3 py-2 font-mono text-[10px] font-medium text-zinc-600">User ID</th>
                </tr>
              </thead>
              <tbody>
                {board.map((row, i) => (
                  <tr key={row.consumer_id} className="border-b border-zinc-800/80 text-zinc-200">
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2">{row.username || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400">{row.email || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {row.points_month.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-300/90">
                      ${(row.spend_cents_month / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.orders_credited}</td>
                    <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-[10px] text-zinc-600">
                      {row.consumer_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
