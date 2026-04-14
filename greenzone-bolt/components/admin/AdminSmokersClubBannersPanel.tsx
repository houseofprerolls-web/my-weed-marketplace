'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Crop,
  Loader2,
  Check,
  X,
  Trash2,
  ImagePlus,
  Upload,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { bannerKind, resolvedSiteBannerImageUrl, type HomepageBannerRow } from '@/lib/siteBanners';
import { uploadVendorMediaFile } from '@/lib/vendorMediaUpload';
import {
  isMarketingBannerImageUrlAllowedForSave,
  marketingBannerImageUrlSaveErrorMessage,
} from '@/lib/marketingBanners/validateImageUrl';
import { MARKETING_BANNER_SLIDES_TABLE } from '@/lib/marketingBanners/table';
import {
  MARKETING_SLIDE_SELECT_BASE,
  MARKETING_SLIDE_SELECT_FULL,
  isMissingCreativeFormatColumnError,
  marketingBannerSlidesLoadErrorHint,
} from '@/lib/marketingBanners/slideSchema';
import {
  BANNER_ADMIN_PAGE_TAB_ORDER,
  PLATFORM_AD_PLACEMENTS,
  bannerAdminPageTabIncludesPlacementKey,
  bannerAdminRowMatchesPageTab,
  placementDefaultCreativeFormat,
  placementLabel,
  placementMeta,
  type BannerAdminPageTabId,
  type PlatformPlacementMeta,
} from '@/lib/platformAdPlacements';
import {
  MARKETING_BANNER_CREATIVE_FORMAT_IDS,
  MARKETING_BANNER_CREATIVE_FORMAT_META,
  MARKETING_BANNER_SLOT_ASPECT_CLASS,
  cropAspectRatioForFormat,
  marketingBannerViewportClassName,
  normalizeMarketingBannerCreativeFormat,
  type MarketingBannerCreativeFormat,
} from '@/lib/marketingBanners/creativeFormats';
import { AdminSmokersClubBannersCharts } from '@/components/admin/AdminSmokersClubBannersCharts';
import { BannerPlacementPreviews, type BannerPlacementPreviewsProps } from '@/components/banners/BannerPlacementPreviews';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorImageFitDialog } from '@/components/vendor/VendorImageFitDialog';
import { cn } from '@/lib/utils';

/** Placement options show long M/D specs — need width + `textValue` on items so the closed trigger stays one line. */
const PLACEMENT_SELECT_CONTENT_CLASS =
  'max-h-[min(70vh,32rem)] min-w-[max(var(--radix-select-trigger-width),18rem)] sm:min-w-[22rem]';

const BANNER_PRESET_SELECT_CONTENT_CLASS =
  'max-h-[min(70vh,32rem)] min-w-[max(var(--radix-select-trigger-width),16rem)] sm:min-w-[20rem]';

/** Select value for `listing_market_id` null (global fallback rows). */
const LISTING_MARKET_NONE = '__global__';

/** Paths like `deals` → `/deals`; http(s) and `//` URLs unchanged. */
function normalizeBannerLinkUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return t;
  return t.startsWith('/') ? t : `/${t}`;
}

/** Matches public carousel ordering: `sort_order` then newest first. */
function compareBannerCarouselOrder(a: HomepageBannerRow, b: HomepageBannerRow): number {
  const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (so !== 0) return so;
  const ct = (b.created_at ?? '').localeCompare(a.created_at ?? '');
  if (ct !== 0) return ct;
  return a.id.localeCompare(b.id);
}

type ListingMarketOption = { id: string; name: string; slug: string };

function creativeFormatForRow(row: Pick<HomepageBannerRow, 'creative_format'>): MarketingBannerCreativeFormat {
  return normalizeMarketingBannerCreativeFormat(row.creative_format);
}

type Row = HomepageBannerRow & { vendor_name?: string | null; market_label?: string | null };

/** Padding + gentle horizontal scroll if the preview grid is wider than the card (no max-height — don’t clip the card). */
const PLACEMENT_PREVIEWS_SCROLL_SHELL_CLASS =
  'overflow-x-auto overflow-y-visible overscroll-x-contain rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4 [-webkit-overflow-scrolling:touch]';

function PlacementPreviewsInScrollShell(props: BannerPlacementPreviewsProps) {
  return (
    <div className={PLACEMENT_PREVIEWS_SCROLL_SHELL_CLASS}>
      <BannerPlacementPreviews {...props} />
    </div>
  );
}

function ListingMarketSelectBlock({
  row,
  markets,
  busyId,
  onValueChange,
}: {
  row: Row;
  markets: ListingMarketOption[];
  busyId: string | null;
  onValueChange: (row: Row, marketKey: string) => void;
}) {
  const value = row.listing_market_id ?? LISTING_MARKET_NONE;
  return (
    <div className="mt-2 flex max-w-full flex-col gap-1.5 sm:max-w-xl sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 pt-1.5 text-xs text-gray-500">Market (ZIP)</span>
      <div className="min-w-0 w-full sm:flex-1">
        <Select
          value={value}
          onValueChange={(v) => onValueChange(row, v)}
          disabled={busyId === row.id}
        >
          <SelectTrigger className="h-8 w-full min-w-0 border-green-900/40 bg-gray-950 text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
            <SelectItem value={LISTING_MARKET_NONE} textValue="All markets — global fallback">
              <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                <span className="font-medium">All markets (global fallback)</span>
                <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                  Used when a shopper’s metro has no targeted slides
                </span>
              </span>
            </SelectItem>
            {markets.map((m) => (
              <SelectItem key={m.id} value={m.id} textValue={m.name}>
                <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                    {m.slug}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CreativeFormatSelectBlock({
  row,
  busyId,
  creativeFormatEditable = true,
  onValueChange,
}: {
  row: Row;
  busyId: string | null;
  /** False when DB has no `creative_format` column (migration 0168). */
  creativeFormatEditable?: boolean;
  onValueChange: (row: Row, format: MarketingBannerCreativeFormat) => void;
}) {
  const value = creativeFormatForRow(row);
  return (
    <div className="mt-2 flex max-w-full flex-col gap-1.5 sm:max-w-xl sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 pt-1.5 text-xs text-gray-500">Creative size</span>
      <div className="min-w-0 w-full sm:flex-1">
        <Select
          value={value}
          onValueChange={(v) => onValueChange(row, v as MarketingBannerCreativeFormat)}
          disabled={busyId === row.id || !creativeFormatEditable}
        >
          <SelectTrigger className="h-8 w-full min-w-0 border-green-900/40 bg-gray-950 text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={BANNER_PRESET_SELECT_CONTENT_CLASS}>
            {MARKETING_BANNER_CREATIVE_FORMAT_IDS.map((id) => {
              const m = MARKETING_BANNER_CREATIVE_FORMAT_META[id];
              return (
                <SelectItem key={id} value={id} textValue={`${m.label} ${m.sizeLabel}`} className="items-start py-2">
                  <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                      {m.sizeLabel}
                    </span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BannerLinkEditBlock({
  row,
  busyId,
  onSave,
}: {
  row: Row;
  busyId: string | null;
  onSave: (row: Row, rawUrl: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.link_url ?? '');
  const busy = busyId === row.id;

  useEffect(() => {
    if (!editing) setDraft(row.link_url ?? '');
  }, [row.id, row.link_url, editing]);

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <Label className="text-xs text-gray-500">Click-through URL</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 border-green-900/40 bg-gray-950 text-xs text-white"
            placeholder="/deals or https://…"
            disabled={busy}
          />
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  const ok = await onSave(row, draft);
                  if (ok) setEditing(false);
                })();
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save link'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDraft(row.link_url ?? '');
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-zinc-500">
          Paths without <code className="text-zinc-400">/</code> or <code className="text-zinc-400">http</code> get a
          leading slash. Leave empty to clear (vendor slides fall back to their listing).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">Link</p>
        {row.link_url?.trim() ? (
          <a
            href={row.link_url}
            className="break-all text-sm text-green-400 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {row.link_url}
          </a>
        ) : (
          <p className="text-xs text-amber-200/85">No URL — platform banners default to home; vendor slides use listing.</p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0 border-white/20"
        disabled={busy}
        onClick={() => setEditing(true)}
      >
        <Pencil className="mr-1 h-4 w-4" />
        Edit link
      </Button>
    </div>
  );
}

function PlacementDimensionsBlock({ placement }: { placement: PlatformPlacementMeta }) {
  return (
    <dl className="mb-3 grid gap-2.5 text-xs text-zinc-500">
      <div className="min-w-0">
        <dt className="font-medium text-amber-200/90">Live aspect</dt>
        <dd className="mt-0.5 max-w-full leading-relaxed break-words text-zinc-400">{placement.sizeMobile}</dd>
      </div>
    </dl>
  );
}

type Props = {
  onQueueChanged?: () => void;
};

export function AdminSmokersClubBannersPanel({ onQueueChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminBlobByKey, setAdminBlobByKey] = useState<Record<string, string | null>>({});
  const [adminFileByKey, setAdminFileByKey] = useState<Record<string, File | null>>({});
  const [adminLink, setAdminLink] = useState('');
  const [adminCreativeFormat, setAdminCreativeFormat] = useState<MarketingBannerCreativeFormat>('leaderboard');
  const [adminPlacement, setAdminPlacement] = useState<string>('homepage_hero');
  const [adminListingMarketId, setAdminListingMarketId] = useState<string>(LISTING_MARKET_NONE);
  const [listingMarkets, setListingMarkets] = useState<ListingMarketOption[]>([]);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminFitOpen, setAdminFitOpen] = useState(false);
  const [adminFitSrc, setAdminFitSrc] = useState<string | null>(null);
  const [adminFitForKey, setAdminFitForKey] = useState<string | null>(null);
  const [adminFitFileName, setAdminFitFileName] = useState('');
  /** DB has marketing_banner_slides.creative_format (migration 0168). */
  const [slideSchemaMode, setSlideSchemaMode] = useState<'full' | 'no_creative_format'>('full');
  const [bannerPageTab, setBannerPageTab] = useState<BannerAdminPageTabId>('all');
  /** Opens crop dialog on the current slide image (same flow as new uploads). */
  const [recropRow, setRecropRow] = useState<Row | null>(null);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  const adminPickKeyRef = useRef<string | null>(null);
  const adminBlobByKeyRef = useRef(adminBlobByKey);
  adminBlobByKeyRef.current = adminBlobByKey;

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('listing_markets')
        .select('id,name,slug')
        .order('sort_order', { ascending: true });
      if (error || !data) return;
      setListingMarkets(data as ListingMarketOption[]);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const fetchPair = (cols: string) =>
      Promise.all([
        supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .select(cols)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false }),
        supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .select(cols)
          .eq('status', 'archived')
          .order('updated_at', { ascending: false })
          .limit(50),
      ]);

    let [mainRes, archRes] = await fetchPair(MARKETING_SLIDE_SELECT_FULL);
    if (mainRes.error && isMissingCreativeFormatColumnError(mainRes.error)) {
      [mainRes, archRes] = await fetchPair(MARKETING_SLIDE_SELECT_BASE);
      if (!mainRes.error) {
        setSlideSchemaMode('no_creative_format');
      }
    } else if (!mainRes.error) {
      setSlideSchemaMode('full');
    }

    if (mainRes.error) {
      const hint = marketingBannerSlidesLoadErrorHint(mainRes.error);
      toast({
        title: 'Could not load marketing slides',
        description: hint ?? mainRes.error.message,
        variant: 'destructive',
      });
      setRows([]);
      setLoading(false);
      return;
    }
    if (archRes.error) {
      toast({
        title: 'Could not load unpublished slides',
        description: archRes.error.message,
        variant: 'destructive',
      });
    }
    const seen = new Set<string>();
    const list: HomepageBannerRow[] = [];
    const combined = [...(mainRes.data ?? []), ...(archRes.data ?? [])] as unknown as HomepageBannerRow[];
    for (const r of combined) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const row = { ...r } as HomepageBannerRow;
      if (row.creative_format == null || String(row.creative_format).trim() === '') {
        row.creative_format = 'leaderboard';
      }
      if (row.sort_order == null || Number.isNaN(Number(row.sort_order))) {
        row.sort_order = 0;
      }
      list.push(row);
    }
    const ids = Array.from(
      new Set(list.map((r) => r.vendor_id).filter((id): id is string => id != null))
    );
    const nameBy = new Map<string, string>();
    if (ids.length) {
      const { data: vn } = await supabase.from('vendors').select('id,name').in('id', ids);
      for (const v of (vn || []) as { id: string; name: string | null }[]) {
        nameBy.set(v.id, v.name || '');
      }
    }
    const marketIds = Array.from(
      new Set(
        list.map((r) => r.listing_market_id).filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const marketLabelBy = new Map<string, string>();
    if (marketIds.length) {
      const { data: mrows } = await supabase.from('listing_markets').select('id,name').in('id', marketIds);
      for (const m of (mrows || []) as { id: string; name: string | null }[]) {
        marketLabelBy.set(m.id, m.name || m.id);
      }
    }
    setRows(
      list.map((r) => ({
        ...r,
        vendor_name: r.vendor_id ? nameBy.get(r.vendor_id) || null : null,
        market_label: r.listing_market_id ? marketLabelBy.get(r.listing_market_id) ?? null : null,
      }))
    );
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeAdminBlob = useCallback((key: string) => {
    setAdminBlobByKey((prev) => {
      const u = prev[key];
      if (u) URL.revokeObjectURL(u);
      return { ...prev, [key]: null };
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(adminBlobByKeyRef.current).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, []);

  const onAdminFitOpenChange = useCallback((open: boolean) => {
    setAdminFitOpen(open);
    if (!open) {
      setAdminFitSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAdminFitForKey(null);
      setAdminFitFileName('');
    }
  }, []);

  const openAdminFitForPlacement = useCallback((key: string, file: File) => {
    setAdminFitForKey(key);
    setAdminFitFileName(file.name);
    setAdminFitSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAdminFitOpen(true);
  }, []);

  const startAdminPickForPlacement = useCallback((key: string) => {
    setAdminPlacement(key);
    setAdminCreativeFormat(placementDefaultCreativeFormat(key));
    adminPickKeyRef.current = key;
    adminFileInputRef.current?.click();
  }, []);

  const onAdminFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      const key = adminPickKeyRef.current ?? adminPlacement;
      e.target.value = '';
      adminPickKeyRef.current = null;
      if (!f || !key) return;
      openAdminFitForPlacement(key, f);
    },
    [adminPlacement, openAdminFitForPlacement]
  );

  const rowLabel = (row: Row) =>
    bannerKind(row) === 'admin' ? 'Platform spotlight' : row.vendor_name || row.vendor_id || 'Vendor';

  const selectedPlacementMeta = useMemo(() => placementMeta(adminPlacement), [adminPlacement]);

  const approve = async (row: Row) => {
    setBusyId(row.id);
    try {
      const pk = row.placement_key ?? 'homepage_hero';
      if (row.vendor_id != null && bannerKind(row) === 'vendor') {
        let archQ = supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('vendor_id', row.vendor_id)
          .eq('placement_key', pk)
          .eq('status', 'active');
        archQ =
          row.listing_market_id != null ? archQ.eq('listing_market_id', row.listing_market_id) : archQ.is('listing_market_id', null);
        const { error: arch } = await archQ;
        if (arch) throw arch;
      }
      const { data: orderRows, error: orderErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('sort_order')
        .eq('placement_key', pk)
        .eq('status', 'active');
      if (orderErr) throw orderErr;
      const nums = (orderRows ?? []).map((r: { sort_order: number | null }) => r.sort_order ?? 0);
      const nextSort = nums.length > 0 ? Math.max(...nums) + 1 : 0;
      const { error: approveErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({
          status: 'active',
          admin_note: null,
          sort_order: nextSort,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (approveErr) throw approveErr;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.approve',
        summary: `Approved marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { placement_key: row.placement_key },
      });
      toast({
        title: 'Banner is live',
        description: `Live in “${placementLabel(row.placement_key ?? 'homepage_hero')}” (rotation uses tree slots when applicable).`,
      });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Approve failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: Row) => {
    const note = window.prompt('Optional note to store with rejection (internal):') ?? '';
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({
          status: 'rejected',
          admin_note: note.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.reject',
        summary: `Rejected marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
      });
      toast({ title: 'Banner rejected' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Reject failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (row: Row) => {
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.archive',
        summary: `Archived marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
      });
      toast({ title: 'Slide unpublished' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Archive failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const republish = async (row: Row) => {
    setBusyId(row.id);
    try {
      const pk = row.placement_key ?? 'homepage_hero';
      if (row.vendor_id != null && bannerKind(row) === 'vendor') {
        let archQ = supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('vendor_id', row.vendor_id)
          .eq('placement_key', pk)
          .eq('status', 'active');
        archQ =
          row.listing_market_id != null ? archQ.eq('listing_market_id', row.listing_market_id) : archQ.is('listing_market_id', null);
        const { error: arch } = await archQ;
        if (arch) throw arch;
      }
      const { data: orderRows, error: orderErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('sort_order')
        .eq('placement_key', pk)
        .eq('status', 'active');
      if (orderErr) throw orderErr;
      const nums = (orderRows ?? []).map((r: { sort_order: number | null }) => r.sort_order ?? 0);
      const nextSort = nums.length > 0 ? Math.max(...nums) + 1 : 0;
      const { error: approveErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({
          status: 'active',
          admin_note: null,
          sort_order: nextSort,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (approveErr) throw approveErr;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.republish',
        summary: `Republished marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
      });
      toast({
        title: 'Slide republished',
        description: `Live again in “${placementLabel(row.placement_key ?? 'homepage_hero')}”.`,
      });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Republish failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const updatePlacement = async (row: Row, placement_key: string) => {
    const prev = row.placement_key ?? 'homepage_hero';
    if (placement_key === prev) return;
    setBusyId(row.id);
    try {
      const { data: orderRows, error: orderErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('sort_order')
        .eq('placement_key', placement_key)
        .eq('status', 'active');
      if (orderErr) throw orderErr;
      const nums = (orderRows ?? []).map((r: { sort_order: number | null }) => r.sort_order ?? 0);
      const nextSort = nums.length > 0 ? Math.max(...nums) + 1 : 0;
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({
          placement_key,
          sort_order: nextSort,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.placement',
        summary: `Updated slide ${row.id} placement → ${placement_key}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { placement_key },
      });
      toast({ title: 'Placement updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Could not move slide',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const updateCreativeFormat = async (row: Row, creative_format: MarketingBannerCreativeFormat) => {
    const prev = creativeFormatForRow(row);
    if (creative_format === prev) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({ creative_format, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.creative_format',
        summary: `Updated slide ${row.id} creative format`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { creative_format },
      });
      toast({ title: 'Creative size updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Could not update creative size',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const updateListingMarket = async (row: Row, marketKey: string) => {
    const listing_market_id = marketKey === LISTING_MARKET_NONE ? null : marketKey;
    const prev = row.listing_market_id ?? null;
    if (listing_market_id === prev) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({ listing_market_id, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.listing_market',
        summary: `Updated slide ${row.id} listing market`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { listing_market_id },
      });
      toast({ title: 'Market targeting updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Could not update market',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const updateLinkUrl = async (row: Row, raw: string): Promise<boolean> => {
    const trimmed = raw.trim();
    const link_url = trimmed ? normalizeBannerLinkUrl(trimmed) : null;
    const prevTrim = (row.link_url ?? '').trim();
    const prevNorm = prevTrim ? normalizeBannerLinkUrl(prevTrim) : null;
    if (link_url === prevNorm) return true;

    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({ link_url, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.link_url',
        summary: `Updated click-through URL on marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { placement_key: row.placement_key },
      });
      toast({ title: 'Link updated' });
      await load();
      onQueueChanged?.();
      return true;
    } catch (e: unknown) {
      toast({
        title: 'Could not update link',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: Row) => {
    if (!window.confirm('Permanently delete this banner row? This cannot be undone.')) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase.from(MARKETING_BANNER_SLIDES_TABLE).delete().eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.delete',
        summary: `Deleted marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
      });
      toast({ title: 'Banner deleted' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Delete failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const replaceImage = async (row: Row, file: File) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    setBusyId(row.id);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      if (!isMarketingBannerImageUrlAllowedForSave(up.url)) {
        throw new Error(marketingBannerImageUrlSaveErrorMessage());
      }
      const { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .update({ image_url: up.url, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.image_replace',
        summary: `Replaced image on marketing banner slide ${row.id}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
      });
      toast({ title: 'Image updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Replace failed',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reorderLiveBanner = async (row: Row, delta: -1 | 1) => {
    const pk = row.placement_key ?? 'homepage_hero';
    const peers = rows
      .filter((r) => r.status === 'active' && (r.placement_key ?? 'homepage_hero') === pk)
      .sort(compareBannerCarouselOrder);
    const idx = peers.findIndex((p) => p.id === row.id);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= peers.length) return;
    const order = [...peers];
    const tmp = order[idx];
    order[idx] = order[j];
    order[j] = tmp;
    setBusyId(row.id);
    try {
      for (let i = 0; i < order.length; i++) {
        const { error } = await supabase
          .from(MARKETING_BANNER_SLIDES_TABLE)
          .update({ sort_order: i, updated_at: new Date().toISOString() })
          .eq('id', order[i].id);
        if (error) throw error;
      }
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.sort_order',
        summary: `Reordered marketing slides for placement ${pk}`,
        resourceType: 'marketing_banner_slide',
        resourceId: row.id,
        metadata: { placement_key: pk },
      });
      toast({ title: 'Carousel order updated' });
      await load();
      onQueueChanged?.();
    } catch (e: unknown) {
      toast({
        title: 'Could not reorder',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const submitAdminBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    const link = adminLink.trim();
    const file = adminFileByKey[adminPlacement];
    if (!file) {
      toast({ title: 'Choose an image for this placement', variant: 'destructive' });
      return;
    }
    if (!link) {
      toast({ title: 'Link URL required', description: 'Platform banners need a click-through URL.', variant: 'destructive' });
      return;
    }
    setAdminSubmitting(true);
    try {
      const up = await uploadVendorMediaFile(user.id, file);
      if ('error' in up) throw new Error(up.error);
      if (!isMarketingBannerImageUrlAllowedForSave(up.url)) {
        throw new Error(marketingBannerImageUrlSaveErrorMessage());
      }
      const { data: orderRows, error: orderErr } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .select('sort_order')
        .eq('placement_key', adminPlacement)
        .eq('status', 'active');
      if (orderErr) throw orderErr;
      const nums = (orderRows ?? []).map((r: { sort_order: number | null }) => r.sort_order ?? 0);
      const nextSort = nums.length > 0 ? Math.max(...nums) + 1 : 0;
      const baseInsert = {
        vendor_id: null as null,
        image_url: up.url,
        link_url: normalizeBannerLinkUrl(link),
        placement_key: adminPlacement,
        status: 'active' as const,
        sort_order: nextSort,
        listing_market_id: adminListingMarketId === LISTING_MARKET_NONE ? null : adminListingMarketId,
      };
      const safeCreativeFormat = normalizeMarketingBannerCreativeFormat(adminCreativeFormat);
      let { error } = await supabase
        .from(MARKETING_BANNER_SLIDES_TABLE)
        .insert({ ...baseInsert, creative_format: safeCreativeFormat });
      if (error && isMissingCreativeFormatColumnError(error)) {
        ({ error } = await supabase.from(MARKETING_BANNER_SLIDES_TABLE).insert(baseInsert));
        if (!error) setSlideSchemaMode('no_creative_format');
      }
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'banner.slide.admin_create',
        summary: `Published platform banner for placement ${adminPlacement}`,
        resourceType: 'marketing_banner_slide',
        resourceId: adminPlacement,
        metadata: { placement_key: adminPlacement },
      });
      toast({
        title: 'Slide live',
        description: `Shown in “${placementLabel(adminPlacement)}”.`,
      });
      revokeAdminBlob(adminPlacement);
      setAdminFileByKey((prev) => ({ ...prev, [adminPlacement]: null }));
      setAdminLink('');
      await load();
      onQueueChanged?.();
    } catch (err: unknown) {
      toast({
        title: 'Add failed',
        description: formatSupabaseError(err),
        variant: 'destructive',
      });
    } finally {
      setAdminSubmitting(false);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const live = rows.filter((r) => r.status === 'active');

  const pendingFiltered = useMemo(
    () => pending.filter((r) => bannerAdminRowMatchesPageTab(bannerPageTab, r.placement_key)),
    [pending, bannerPageTab]
  );
  const liveFiltered = useMemo(
    () => live.filter((r) => bannerAdminRowMatchesPageTab(bannerPageTab, r.placement_key)),
    [live, bannerPageTab]
  );
  const archivedFiltered = useMemo(
    () =>
      rows.filter(
        (r) => r.status === 'archived' && bannerAdminRowMatchesPageTab(bannerPageTab, r.placement_key)
      ),
    [rows, bannerPageTab]
  );

  const bannerTabCounts = useMemo(() => {
    const out = {} as Record<BannerAdminPageTabId, number>;
    for (const tab of BANNER_ADMIN_PAGE_TAB_ORDER) {
      if (tab.id === 'all') {
        out[tab.id] = rows.length;
      } else {
        out[tab.id] = rows.filter((r) => bannerAdminRowMatchesPageTab(tab.id, r.placement_key)).length;
      }
    }
    return out;
  }, [rows]);

  const liveByPlacement = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of liveFiltered) {
      const k = (r.placement_key as string) || 'homepage_hero';
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
    for (const [k, arr] of Array.from(m.entries())) {
      arr.sort(compareBannerCarouselOrder);
      m.set(k, arr);
    }
    return m;
  }, [liveFiltered]);

  useEffect(() => {
    if (bannerPageTab === 'all' || bannerPageTab === 'other') return;
    if (bannerAdminPageTabIncludesPlacementKey(bannerPageTab, adminPlacement)) return;
    const first = PLATFORM_AD_PLACEMENTS.find((p) => bannerAdminPageTabIncludesPlacementKey(bannerPageTab, p.key));
    if (first) {
      setAdminPlacement(first.key);
      setAdminCreativeFormat(placementDefaultCreativeFormat(first.key));
    }
  }, [bannerPageTab, adminPlacement]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <VendorImageFitDialog
        open={recropRow != null}
        onOpenChange={(open) => {
          if (!open) setRecropRow(null);
        }}
        imageSrc={recropRow ? resolvedSiteBannerImageUrl(recropRow.image_url) : null}
        aspect={recropRow ? cropAspectRatioForFormat(creativeFormatForRow(recropRow)) : 1}
        title="Recrop banner"
        description="Reframe this slide for its creative size. Uploads a new image file; the click-through link and placement stay the same."
        maxOutputLongEdge={2600}
        outputBaseName={recropRow ? `banner-${recropRow.id}` : 'banner'}
        onApply={async (outFile) => {
          const target = recropRow;
          if (!target) return;
          await replaceImage(target, outFile);
          setRecropRow(null);
        }}
      />
      {slideSchemaMode === 'no_creative_format' ? (
        <Card className="border-yellow-800/40 bg-yellow-950/20 p-3 text-sm text-yellow-100/90">
          This project’s database does not have the <code className="text-yellow-200/90">creative_format</code> column on{' '}
          <code className="text-yellow-200/90">marketing_banner_slides</code>. Slides use the default banner format until
          you apply migration{' '}
          <code className="text-yellow-200/90">0168_marketing_banner_slides_creative_format.sql</code> (then reload).
        </Card>
      ) : null}
      <Card className="border-amber-900/30 bg-amber-950/10 p-4 text-sm text-amber-100/90">
        Each row is one slide. Assign a <strong className="text-white">placement</strong> (page slot) and a{' '}
        <strong className="text-white">listing market</strong> (the metro we infer from the shopper’s saved 5-digit ZIP).
        When a metro has <strong className="text-white">any</strong> live slide for that placement and market, shoppers in
        that metro see <strong className="text-white">only</strong> those slides — global rows are skipped for that
        placement until you archive every market-specific slide there.{' '}
        <strong className="text-white">Global (all markets)</strong> rows are used when the shopper’s ZIP does not map to
        a market, or when that metro has no targeted slides yet. One <strong className="text-white">live</strong> vendor
        creative per placement per market (or one global). Replace images anytime; use <strong className="text-white">Recrop</strong> to reframe the current
        art, and <strong className="text-white">Up / Down</strong> on live slides to change carousel order within that
        placement. <strong className="text-white">Creative:</strong> export{' '}
        <strong className="text-white">1235×338</strong> (≈<strong className="text-white">3.65:1</strong> wide banner); live
        slots keep that aspect on all screen sizes — center important text and logos.
      </Card>

      <AdminSmokersClubBannersCharts rows={rows.filter((r) => r.status !== 'archived')} />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Manage by page</h2>
        <p className="max-w-3xl text-sm text-zinc-500">
          Use tabs to focus on one site area. Counts include pending, live, and unpublished slides whose placement
          belongs to that page. <span className="text-zinc-400">Other</span> is for legacy or custom placement keys not in
          the standard list.
        </p>
        <Tabs
          value={bannerPageTab}
          onValueChange={(v) => setBannerPageTab(v as BannerAdminPageTabId)}
          className="w-full min-w-0"
        >
          <div className="min-w-0 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            <TabsList className="inline-flex h-auto min-h-10 w-max min-w-0 flex-wrap justify-start gap-1 rounded-lg border border-white/[0.08] bg-zinc-900/90 p-1">
              {BANNER_ADMIN_PAGE_TAB_ORDER.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="shrink-0 gap-1 rounded-md px-3 py-2 text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white sm:text-sm"
                >
                  {tab.label}
                  <span className="tabular-nums text-zinc-500">({bannerTabCounts[tab.id]})</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {bannerPageTab !== 'other' ? (
        <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <ImagePlus className="h-5 w-5 text-brand-lime" />
          Add sponsored slide (admin)
        </h2>
        <Card className="border-green-900/25 bg-gray-950/80 p-4">
          <VendorImageFitDialog
            open={adminFitOpen}
            onOpenChange={onAdminFitOpenChange}
            imageSrc={adminFitSrc}
            aspect={cropAspectRatioForFormat(adminCreativeFormat)}
            title="Position banner art"
            description="Crop to 1235×338 (≈3.65:1), matching live banner slots. Keep logos and text centered. Drag and zoom, then apply."
            maxOutputLongEdge={2600}
            outputBaseName={adminFitFileName}
            onApply={(outFile) => {
              const key = adminFitForKey;
              if (!key) return;
              revokeAdminBlob(key);
              const url = URL.createObjectURL(outFile);
              setAdminBlobByKey((prev) => ({ ...prev, [key]: url }));
              setAdminFileByKey((prev) => ({ ...prev, [key]: outFile }));
              setAdminPlacement(key);
            }}
          />
          <input
            ref={adminFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAdminFileInputChange}
          />
          <p className="mb-4 text-sm text-zinc-400">
            Click a <strong className="text-zinc-200">placement</strong> to select it, then <strong className="text-zinc-200">Add photo</strong> on that card.
            Each slot can keep its own draft preview; publishing uses the <strong className="text-zinc-200">selected</strong> slot’s image
            and the form below.
          </p>
          <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PLATFORM_AD_PLACEMENTS.filter((p) => bannerAdminPageTabIncludesPlacementKey(bannerPageTab, p.key)).map((p) => {
              const selected = adminPlacement === p.key;
              const preview = adminBlobByKey[p.key] ?? null;
              const hasFile = Boolean(adminFileByKey[p.key]);
              return (
                <article
                  key={p.key}
                  className={cn(
                    'min-w-0 rounded-xl border border-white/[0.08] bg-black/30 p-3 transition',
                    selected && 'ring-2 ring-brand-lime/70 ring-offset-2 ring-offset-zinc-950'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPlacement(p.key);
                      setAdminCreativeFormat(placementDefaultCreativeFormat(p.key));
                    }}
                    className="w-full text-left"
                  >
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                      <h4 className="min-w-0 break-words text-xs font-semibold leading-snug text-zinc-200">{p.label}</h4>
                      {selected ? (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-brand-lime">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className={cn('relative w-full overflow-hidden bg-background', MARKETING_BANNER_SLOT_ASPECT_CLASS)}>
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className="h-full w-full object-cover object-center" />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] leading-snug text-zinc-600">
                            No photo for this slot
                          </div>
                        )}
                      </div>
                    </div>
                    {hasFile ? (
                      <p className="mt-1.5 text-[10px] text-green-400/90">Draft image ready</p>
                    ) : null}
                  </button>
                  <div className="mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 bg-zinc-800 text-xs text-white hover:bg-zinc-700"
                      onClick={() => startAdminPickForPlacement(p.key)}
                    >
                      <ImagePlus className="mr-1 h-3.5 w-3.5" />
                      Add photo
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          <form className="space-y-4 border-t border-white/10 pt-6" onSubmit={submitAdminBanner}>
            <div>
              <Label className="text-gray-300">Click-through URL (required)</Label>
              <Input
                value={adminLink}
                onChange={(e) => setAdminLink(e.target.value)}
                placeholder="https://… or /deals"
                className="mt-1 border-green-900/40 bg-gray-950 text-white placeholder:text-gray-600"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Site pages: use a path like <code className="text-gray-400">/discover</code> or{' '}
                <code className="text-gray-400">deals</code> (we add the leading /). External links need{' '}
                <code className="text-gray-400">https://</code>.
              </p>
            </div>
            <div>
              <Label className="text-gray-300">Creative format</Label>
              <Select
                value={adminCreativeFormat}
                onValueChange={(v) => setAdminCreativeFormat(v as MarketingBannerCreativeFormat)}
                disabled={slideSchemaMode !== 'full'}
              >
                <SelectTrigger className="mt-1 border-green-900/40 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={BANNER_PRESET_SELECT_CONTENT_CLASS}>
                  {MARKETING_BANNER_CREATIVE_FORMAT_IDS.map((id) => {
                    const m = MARKETING_BANNER_CREATIVE_FORMAT_META[id];
                    return (
                      <SelectItem key={id} value={id} textValue={`${m.label} ${m.sizeLabel}`} className="items-start py-2">
                        <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                          <span className="font-medium">{m.label}</span>
                          <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                            {m.sizeLabel}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Placement (must match selected card)</Label>
              <Select
                value={adminPlacement}
                onValueChange={(v) => {
                  setAdminPlacement(v);
                  setAdminCreativeFormat(placementDefaultCreativeFormat(v));
                }}
              >
                <SelectTrigger className="mt-1 border-green-900/40 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
                  {PLATFORM_AD_PLACEMENTS.map((pl) => (
                    <SelectItem
                      key={pl.key}
                      value={pl.key}
                      textValue={pl.label}
                      className="items-start py-2"
                    >
                      <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                        <span className="font-medium">{pl.label}</span>
                        <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                          {pl.sizeMobile}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Listing market (from shopper ZIP)</Label>
              <p className="mt-1 text-xs text-zinc-500">
                We resolve the shopper’s saved 5-digit ZIP to one metro. Slides tied to that market only show for matching
                ZIPs; pick “All markets” for a slide that should appear in every area (or as backup).
              </p>
              <Select value={adminListingMarketId} onValueChange={setAdminListingMarketId}>
                <SelectTrigger className="mt-1 border-green-900/40 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
                  <SelectItem value={LISTING_MARKET_NONE} textValue="All markets — global fallback">
                    <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                      <span className="font-medium">All markets (global fallback)</span>
                      <span className="text-[11px] text-muted-foreground break-words">
                        Shown when a ZIP’s metro has no targeted slides
                      </span>
                    </span>
                  </SelectItem>
                  {listingMarkets.map((m) => (
                    <SelectItem key={m.id} value={m.id} textValue={m.name}>
                      <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[11px] text-muted-foreground break-words">{m.slug}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlacementMeta ? (
              <div className="max-w-3xl space-y-3 text-xs leading-relaxed text-zinc-400">
                <PlacementDimensionsBlock placement={selectedPlacementMeta} />
                <p className="break-words">
                  <span className="font-medium text-zinc-300">Specs:</span> {selectedPlacementMeta.ratioCreative}{' '}
                  Default for this slot:{' '}
                  <span className="text-brand-lime">
                    {MARKETING_BANNER_CREATIVE_FORMAT_META[placementDefaultCreativeFormat(adminPlacement)].label} (
                    {MARKETING_BANNER_CREATIVE_FORMAT_META[placementDefaultCreativeFormat(adminPlacement)].sizeLabel})
                  </span>
                  . You can pick another format above for this slide (mostly changes max width).
                </p>
              </div>
            ) : null}
            <p className="text-sm text-zinc-500">
              Publishing: <span className="text-zinc-200">{placementLabel(adminPlacement)}</span>
              {adminFileByKey[adminPlacement] ? (
                <span className="text-green-400"> — image ready</span>
              ) : (
                <span className="text-amber-200/90"> — add a photo on that card first</span>
              )}
            </p>
            <Button
              type="submit"
              disabled={adminSubmitting || !adminFileByKey[adminPlacement]}
              className="bg-green-600 hover:bg-green-700"
            >
              {adminSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish platform banner'}
            </Button>
          </form>
        </Card>
      </section>
      ) : (
        <Card className="border-zinc-800/60 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          Publishing new platform banners uses a standard placement slot. Switch to{' '}
          <strong className="text-zinc-200">All pages</strong> or a specific page tab to add slides. You can still review
          legacy slides under <strong className="text-zinc-200">Pending</strong>, <strong className="text-zinc-200">Live</strong>, and{' '}
          <strong className="text-zinc-200">Unpublished</strong> below.
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Pending review ({pendingFiltered.length})</h2>
        {pendingFiltered.length === 0 ? (
          <p className="text-gray-500">No pending banners for this page.</p>
        ) : (
          <ul className="space-y-6">
            {pendingFiltered.map((row) => (
              <li key={row.id}>
                <Card className="min-w-0 overflow-visible border-green-900/25 bg-gray-950/80 p-4">
                  <div className="flex flex-col gap-4">
                    <div
                      className={cn(
                        'relative w-full max-w-3xl shrink-0 self-start overflow-hidden rounded-xl bg-background',
                        marketingBannerViewportClassName(creativeFormatForRow(row))
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{rowLabel(row)}</p>
                        {bannerKind(row) === 'admin' && (
                          <Badge className="bg-violet-700/40 text-white">Platform</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Creative:{' '}
                        {MARKETING_BANNER_CREATIVE_FORMAT_META[creativeFormatForRow(row)].label} —{' '}
                        {MARKETING_BANNER_CREATIVE_FORMAT_META[creativeFormatForRow(row)].sizeLabel}
                      </p>
                      <div className="mt-2 flex max-w-full flex-col gap-1.5 sm:max-w-xl sm:flex-row sm:items-start sm:gap-3">
                        <span className="shrink-0 pt-1.5 text-xs text-gray-500">Placement</span>
                        <div className="min-w-0 w-full sm:flex-1">
                          <Select
                            value={row.placement_key ?? 'homepage_hero'}
                            onValueChange={(v) => void updatePlacement(row, v)}
                            disabled={busyId === row.id}
                          >
                            <SelectTrigger className="h-8 w-full min-w-0 border-green-900/40 bg-gray-950 text-xs text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
                              {PLATFORM_AD_PLACEMENTS.map((p) => (
                                <SelectItem
                                  key={p.key}
                                  value={p.key}
                                  textValue={p.label}
                                  className="items-start py-2"
                                >
                                  <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                                    <span className="font-medium">{p.label}</span>
                                    <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                                      {p.sizeMobile}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <CreativeFormatSelectBlock
                        row={row}
                        busyId={busyId}
                        creativeFormatEditable={slideSchemaMode === 'full'}
                        onValueChange={(r, f) => void updateCreativeFormat(r, f)}
                      />
                      <ListingMarketSelectBlock
                        row={row}
                        markets={listingMarkets}
                        busyId={busyId}
                        onValueChange={(r, mk) => void updateListingMarket(r, mk)}
                      />
                      <BannerLinkEditBlock row={row} busyId={busyId} onSave={updateLinkUrl} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          ref={(el) => {
                            replaceInputRefs.current[row.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void replaceImage(row, f);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/20"
                          disabled={busyId === row.id}
                          onClick={() => replaceInputRefs.current[row.id]?.click()}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          Replace image
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/20"
                          disabled={busyId === row.id}
                          onClick={() => setRecropRow(row)}
                        >
                          <Crop className="mr-1 h-4 w-4" />
                          Recrop
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={busyId === row.id}
                          onClick={() => approve(row)}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-1 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === row.id}
                          onClick={() => reject(row)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                          disabled={busyId === row.id}
                          onClick={() => deleteRow(row)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 min-w-0 border-t border-white/10 pt-4">
                    <BannerPlacementPreviews
                      imageUrl={row.image_url}
                      emphasizePlacementKey={row.placement_key ?? 'homepage_hero'}
                      title="Preview on every placement"
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Live slides ({liveFiltered.length})</h2>
        {liveFiltered.length === 0 ? (
          <p className="text-gray-500">None for this page.</p>
        ) : (
          <div className="space-y-10">
            {PLATFORM_AD_PLACEMENTS.filter((placement) =>
              bannerAdminPageTabIncludesPlacementKey(bannerPageTab, placement.key)
            ).map((placement) => {
              const group = liveByPlacement.get(placement.key) ?? [];
              if (group.length === 0) return null;
              return (
                <div key={placement.key}>
                  <h3 className="mb-1 text-sm font-semibold text-white">{placement.label}</h3>
                  <p className="mb-2 max-w-3xl text-xs leading-relaxed break-words text-gray-500">{placement.hint}</p>
                  <PlacementDimensionsBlock placement={placement} />
                  <ul className="space-y-4">
                    {group.map((row) => (
                      <li key={row.id} className="min-w-0">
                        <Card className="flex min-w-0 flex-col gap-4 overflow-visible border-green-800/30 bg-gray-950/60 p-4">
                          <div className="flex min-w-0 flex-col gap-4">
                          <div
                            className={cn(
                        'relative w-full max-w-3xl shrink-0 self-start overflow-hidden rounded-xl bg-background',
                        marketingBannerViewportClassName(creativeFormatForRow(row))
                      )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="w-fit bg-green-700/40">Live</Badge>
                              {bannerKind(row) === 'admin' && (
                                <Badge className="bg-violet-700/40 text-white">Platform</Badge>
                              )}
                              <p className="font-medium text-white">{rowLabel(row)}</p>
                            </div>
                            <div className="mt-2 flex max-w-full flex-col gap-1.5 sm:max-w-xl sm:flex-row sm:items-start sm:gap-3">
                              <span className="shrink-0 pt-1.5 text-xs text-gray-500">Placement</span>
                              <div className="min-w-0 w-full sm:flex-1">
                                <Select
                                  value={row.placement_key ?? 'homepage_hero'}
                                  onValueChange={(v) => void updatePlacement(row, v)}
                                  disabled={busyId === row.id}
                                >
                                  <SelectTrigger className="h-8 w-full min-w-0 border-green-900/40 bg-gray-950 text-xs text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
                                    {PLATFORM_AD_PLACEMENTS.map((p) => (
                                      <SelectItem
                                        key={p.key}
                                        value={p.key}
                                        textValue={p.label}
                                        className="items-start py-2"
                                      >
                                        <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                                          <span className="font-medium">{p.label}</span>
                                          <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                                            {p.sizeMobile}
                                          </span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <CreativeFormatSelectBlock
                              row={row}
                              busyId={busyId}
                              creativeFormatEditable={slideSchemaMode === 'full'}
                              onValueChange={(r, f) => void updateCreativeFormat(r, f)}
                            />
                            <ListingMarketSelectBlock
                              row={row}
                              markets={listingMarkets}
                              busyId={busyId}
                              onValueChange={(r, mk) => void updateListingMarket(r, mk)}
                            />
                            <BannerLinkEditBlock row={row} busyId={busyId} onSave={updateLinkUrl} />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <input
                                ref={(el) => {
                                  replaceInputRefs.current[`live-${row.id}`] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = '';
                                  if (f) void replaceImage(row, f);
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() => replaceInputRefs.current[`live-${row.id}`]?.click()}
                              >
                                <Upload className="mr-1 h-4 w-4" />
                                Replace image
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() => setRecropRow(row)}
                              >
                                <Crop className="mr-1 h-4 w-4" />
                                Recrop
                              </Button>
                              {(() => {
                                const pk = row.placement_key ?? 'homepage_hero';
                                const ordered = rows
                                  .filter(
                                    (r) =>
                                      r.status === 'active' && (r.placement_key ?? 'homepage_hero') === pk
                                  )
                                  .sort(compareBannerCarouselOrder);
                                const idx = ordered.findIndex((r) => r.id === row.id);
                                if (ordered.length < 2) return null;
                                return (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      title="Earlier in carousel"
                                      disabled={busyId === row.id || idx <= 0}
                                      onClick={() => void reorderLiveBanner(row, -1)}
                                    >
                                      <ArrowUp className="mr-1 h-4 w-4" />
                                      Up
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      title="Later in carousel"
                                      disabled={busyId === row.id || idx < 0 || idx >= ordered.length - 1}
                                      onClick={() => void reorderLiveBanner(row, 1)}
                                    >
                                      <ArrowDown className="mr-1 h-4 w-4" />
                                      Down
                                    </Button>
                                  </>
                                );
                              })()}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() => archive(row)}
                              >
                                Unpublish
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                                disabled={busyId === row.id}
                                onClick={() => deleteRow(row)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          </div>
                          <Collapsible className="w-full min-w-0 min-h-0 border-t border-white/10 pt-2">
                            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-md py-2 text-left text-xs text-zinc-400 outline-none ring-brand-lime/40 transition hover:bg-white/5 hover:text-white focus-visible:ring-2">
                              <span>All placement previews</span>
                              <ChevronDown
                                className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
                                aria-hidden
                              />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="min-w-0 overflow-visible pt-3 focus-visible:outline-none">
                              <PlacementPreviewsInScrollShell
                                imageUrl={row.image_url}
                                emphasizePlacementKey={row.placement_key ?? 'homepage_hero'}
                                title="How this slide fits other surfaces"
                              />
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {Array.from(liveByPlacement.keys())
              .filter((k) => !PLATFORM_AD_PLACEMENTS.some((p) => p.key === k))
              .map((k) => {
                const group = liveByPlacement.get(k) ?? [];
                if (group.length === 0) return null;
                return (
                  <div key={k}>
                    <h3 className="mb-1 text-sm font-semibold text-amber-200/95">{placementLabel(k)}</h3>
                    <p className="mb-3 text-xs text-gray-500">Custom or legacy placement key</p>
                    <ul className="space-y-4">
                      {group.map((row) => (
                        <li key={row.id} className="min-w-0">
                          <Card className="flex min-w-0 flex-col gap-4 overflow-visible border-amber-900/30 bg-gray-950/60 p-4">
                            <div className="flex min-w-0 flex-col gap-4">
                            <div
                              className={cn(
                        'relative w-full max-w-3xl shrink-0 self-start overflow-hidden rounded-xl bg-background',
                        marketingBannerViewportClassName(creativeFormatForRow(row))
                      )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{rowLabel(row)}</p>
                              <div className="mt-2 flex max-w-full flex-col gap-1.5 sm:max-w-xl sm:flex-row sm:items-start sm:gap-3">
                                <span className="shrink-0 pt-1.5 text-xs text-gray-500">Placement</span>
                                <div className="min-w-0 w-full sm:flex-1">
                                  <Select
                                    value={row.placement_key ?? 'homepage_hero'}
                                    onValueChange={(v) => void updatePlacement(row, v)}
                                    disabled={busyId === row.id}
                                  >
                                    <SelectTrigger className="h-8 w-full min-w-0 border-green-900/40 bg-gray-950 text-xs text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={PLACEMENT_SELECT_CONTENT_CLASS}>
                                      {PLATFORM_AD_PLACEMENTS.map((p) => (
                                        <SelectItem
                                          key={p.key}
                                          value={p.key}
                                          textValue={p.label}
                                          className="items-start py-2"
                                        >
                                          <span className="flex min-w-0 max-w-full flex-col gap-0.5 text-left">
                                            <span className="font-medium">{p.label}</span>
                                            <span className="text-[11px] font-normal leading-snug text-muted-foreground break-words">
                                              {p.sizeMobile}
                                            </span>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <CreativeFormatSelectBlock
                                row={row}
                                busyId={busyId}
                                creativeFormatEditable={slideSchemaMode === 'full'}
                                onValueChange={(r, f) => void updateCreativeFormat(r, f)}
                              />
                              <ListingMarketSelectBlock
                                row={row}
                                markets={listingMarkets}
                                busyId={busyId}
                                onValueChange={(r, mk) => void updateListingMarket(r, mk)}
                              />
                              <BannerLinkEditBlock row={row} busyId={busyId} onSave={updateLinkUrl} />
                              <div className="mt-3 flex flex-wrap gap-2">
                                <input
                                  ref={(el) => {
                                    replaceInputRefs.current[`live-${row.id}`] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void replaceImage(row, f);
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === row.id}
                                  onClick={() => replaceInputRefs.current[`live-${row.id}`]?.click()}
                                >
                                  <Upload className="mr-1 h-4 w-4" />
                                  Replace image
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === row.id}
                                  onClick={() => setRecropRow(row)}
                                >
                                  <Crop className="mr-1 h-4 w-4" />
                                  Recrop
                                </Button>
                                {(() => {
                                  const pk = row.placement_key ?? 'homepage_hero';
                                  const ordered = rows
                                    .filter(
                                      (r) =>
                                        r.status === 'active' && (r.placement_key ?? 'homepage_hero') === pk
                                    )
                                    .sort(compareBannerCarouselOrder);
                                  const idx = ordered.findIndex((r) => r.id === row.id);
                                  if (ordered.length < 2) return null;
                                  return (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        title="Earlier in carousel"
                                        disabled={busyId === row.id || idx <= 0}
                                        onClick={() => void reorderLiveBanner(row, -1)}
                                      >
                                        <ArrowUp className="mr-1 h-4 w-4" />
                                        Up
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        title="Later in carousel"
                                        disabled={busyId === row.id || idx < 0 || idx >= ordered.length - 1}
                                        onClick={() => void reorderLiveBanner(row, 1)}
                                      >
                                        <ArrowDown className="mr-1 h-4 w-4" />
                                        Down
                                      </Button>
                                    </>
                                  );
                                })()}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === row.id}
                                  onClick={() => archive(row)}
                                >
                                  Unpublish
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                                  disabled={busyId === row.id}
                                  onClick={() => deleteRow(row)}
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            </div>
                            <Collapsible className="w-full min-w-0 min-h-0 border-t border-white/10 pt-2">
                              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-md py-2 text-left text-xs text-zinc-400 outline-none ring-brand-lime/40 transition hover:bg-white/5 hover:text-white focus-visible:ring-2">
                                <span>All placement previews</span>
                                <ChevronDown
                                  className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
                                  aria-hidden
                                />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="min-w-0 overflow-visible pt-3 focus-visible:outline-none">
                                <PlacementPreviewsInScrollShell
                                  imageUrl={row.image_url}
                                  emphasizePlacementKey={row.placement_key ?? 'homepage_hero'}
                                  title="How this slide fits other surfaces"
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Unpublished ({archivedFiltered.length})</h2>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-zinc-500">
          Slides you removed with Unpublish stay here. Use Republish to make one live again. For vendor slides, any
          other live creative for the same placement is archived first (same rule as Approve).
        </p>
        {archivedFiltered.length === 0 ? (
          <p className="text-gray-500">None for this page.</p>
        ) : (
          <ul className="space-y-4">
            {archivedFiltered.map((row) => (
              <li key={row.id}>
                <Card className="flex flex-col gap-3 border-white/10 bg-zinc-950/80 p-4 sm:flex-row sm:items-start">
                  <div
                    className={cn(
                      'relative mx-auto shrink-0 overflow-hidden rounded-xl bg-background sm:mx-0',
                      marketingBannerViewportClassName(creativeFormatForRow(row))
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="w-fit bg-zinc-700/50 text-zinc-200">Unpublished</Badge>
                      {bannerKind(row) === 'admin' ? (
                        <Badge className="bg-violet-700/40 text-white">Platform</Badge>
                      ) : null}
                      <p className="font-medium text-white">{rowLabel(row)}</p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {placementLabel(row.placement_key ?? 'homepage_hero')} ·{' '}
                      {MARKETING_BANNER_CREATIVE_FORMAT_META[creativeFormatForRow(row)].label} (
                      {MARKETING_BANNER_CREATIVE_FORMAT_META[creativeFormatForRow(row)].sizeLabel})
                      {(row.updated_at || row.created_at) && (
                        <>
                          {' '}
                          · updated{' '}
                          {new Date(row.updated_at || row.created_at).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </>
                      )}
                    </p>
                    <BannerLinkEditBlock row={row} busyId={busyId} onSave={updateLinkUrl} />
                    <ListingMarketSelectBlock
                      row={row}
                      markets={listingMarkets}
                      busyId={busyId}
                      onValueChange={(r, mk) => void updateListingMarket(r, mk)}
                    />
                    <CreativeFormatSelectBlock
                      row={row}
                      busyId={busyId}
                      creativeFormatEditable={slideSchemaMode === 'full'}
                      onValueChange={(r, f) => void updateCreativeFormat(r, f)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => setRecropRow(row)}
                      >
                        <Crop className="mr-1 h-4 w-4" />
                        Recrop
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={busyId === row.id}
                        onClick={() => void republish(row)}
                      >
                        {busyId === row.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-4 w-4" />
                        )}
                        Republish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                        disabled={busyId === row.id}
                        onClick={() => deleteRow(row)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
