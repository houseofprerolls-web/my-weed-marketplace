'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import type { AdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';
import { cn } from '@/lib/utils';

type VendorListRow = Record<string, unknown>;

function vendorDisplayName(v: VendorListRow, vendorsSchema: boolean): string {
  if (vendorsSchema) return String(v.name ?? '').trim() || '—';
  return String(v.business_name ?? '').trim() || '—';
}

type BillingVendorPickerProps = {
  vendorId: string;
  onVendorIdChange: (id: string) => void;
  /** Called when the admin picks a row so the parent can show “billing for …”. */
  onDispensaryChosen?: (info: { id: string; displayName: string }) => void;
  disabled?: boolean;
  /** Shown when `disabled` (edit mode). */
  disabledSummary?: string;
  region: AdminWorkspaceRegion;
};

export function BillingVendorPicker({
  vendorId,
  onVendorIdChange,
  onDispensaryChosen,
  disabled,
  disabledSummary,
  region,
}: BillingVendorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorsSchema, setVendorsSchema] = useState(true);
  const [rows, setRows] = useState<VendorListRow[]>([]);
  const [ownerEmailByUserId, setOwnerEmailByUserId] = useState<Record<string, string>>({});
  const [includeUnclaimed, setIncludeUnclaimed] = useState(false);

  const fetchVendors = useCallback(
    async (q: string, owner: 'linked' | 'all') => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const params = new URLSearchParams({
          q,
          pageSize: '35',
          page: '0',
          owner,
          region,
        });
        const res = await fetch(`/api/admin/vendors-list?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json().catch(() => ({}))) as {
          vendors?: unknown;
          vendorsSchema?: boolean;
          ownerEmailByUserId?: Record<string, string>;
        };
        if (!res.ok) return;
        setVendorsSchema(j.vendorsSchema !== false);
        const raw = j.vendors;
        const list = Array.isArray(raw) ? raw : [];
        const byId = new Map<string, VendorListRow>();
        for (const v of list) {
          if (!v || typeof v !== 'object') continue;
          const row = v as VendorListRow;
          const id = String(row.id ?? '').trim();
          if (id) byId.set(id, row);
        }
        setRows(Array.from(byId.values()));
        const emails = j.ownerEmailByUserId;
        setOwnerEmailByUserId(emails && typeof emails === 'object' && !Array.isArray(emails) ? emails : {});
      } catch (e) {
        console.error('BillingVendorPicker fetch', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [region]
  );

  useEffect(() => {
    if (disabled || !open) return;
    const t = window.setTimeout(() => {
      void fetchVendors(search.trim(), includeUnclaimed ? 'all' : 'linked');
    }, 280);
    return () => window.clearTimeout(t);
  }, [search, disabled, open, fetchVendors, includeUnclaimed]);

  const selectedRow = useMemo(() => rows.find((v) => String(v.id) === vendorId), [rows, vendorId]);

  const selectedLabel = useMemo(() => {
    if (!vendorId.trim()) return null;
    if (selectedRow) {
      const name = vendorDisplayName(selectedRow, vendorsSchema);
      const uid = String(selectedRow.user_id ?? '').trim();
      const em = uid ? ownerEmailByUserId[uid] : '';
      return em ? `${name} · ${em}` : name;
    }
    return `${vendorId.slice(0, 8)}…`;
  }, [vendorId, selectedRow, vendorsSchema, ownerEmailByUserId]);

  if (disabled) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
        {disabledSummary || vendorId || '—'}
        <p className="mt-1 text-xs text-zinc-500">Vendor cannot be changed when editing an account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) void fetchVendors(search.trim(), includeUnclaimed ? 'all' : 'linked');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-10 w-full justify-between border-zinc-700 bg-zinc-950 font-normal text-zinc-100 hover:bg-zinc-900"
          >
            <span className="truncate text-left">{selectedLabel || 'Search dispensaries by name, slug, or email…'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,440px)] p-0" align="start">
          <Command shouldFilter={false} className="bg-zinc-950">
            <CommandInput
              placeholder="Type to search…"
              className="h-10 border-zinc-800"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-6 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No dispensaries match. Try another term or include unclaimed.</CommandEmpty>
                  <CommandGroup heading="Dispensaries">
                    {rows.filter((v) => String(v.id ?? '').trim()).map((v) => {
                      const id = String(v.id ?? '').trim();
                      const name = vendorDisplayName(v, vendorsSchema);
                      const uid = String(v.user_id ?? '').trim();
                      const em = uid ? ownerEmailByUserId[uid] : '';
                      const sub = em ? `Owner: ${em}` : uid ? 'Owner linked' : 'No owner linked';
                      return (
                        <CommandItem
                          key={id}
                          value={id}
                          keywords={[name, id, em].filter(Boolean)}
                          onSelect={() => {
                            onVendorIdChange(id);
                            onDispensaryChosen?.({ id, displayName: name });
                            setOpen(false);
                          }}
                          className="text-zinc-200 aria-selected:bg-zinc-800"
                        >
                          <Check
                            className={cn('mr-2 h-4 w-4 shrink-0', vendorId === id ? 'opacity-100' : 'opacity-0')}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {name}
                            <span className="block truncate text-xs text-zinc-500">{sub}</span>
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          className="rounded border-zinc-600"
          checked={includeUnclaimed}
          onChange={(e) => setIncludeUnclaimed(e.target.checked)}
        />
        Include shops without a linked owner (directory-only)
      </label>
    </div>
  );
}

type BrandRow = { id: string; name: string; slug: string; manager_count: number };
type ManagerRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

type BillingBrandProfilePickerProps = {
  profileId: string;
  onProfileIdChange: (id: string) => void;
  onBrandLabelHint?: (label: string) => void;
};

export function BillingBrandProfilePicker({
  profileId,
  onProfileIdChange,
  onBrandLabelHint,
}: BillingBrandProfilePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandRow | null>(null);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managers, setManagers] = useState<ManagerRow[]>([]);

  const fetchBrands = useCallback(async (q: string) => {
    try {
      setLoadingBrands(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/admin/platform-billing/brand-links?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as { brands?: unknown; error?: string };
      if (!res.ok) return;
      const raw = j.brands;
      const list = Array.isArray(raw) ? raw : [];
      const seen = new Set<string>();
      const next: BrandRow[] = [];
      for (const b of list) {
        if (!b || typeof b !== 'object') continue;
        const row = b as Record<string, unknown>;
        const id = String(row.id ?? '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        next.push({
          id,
          name: String(row.name ?? '—'),
          slug: String(row.slug ?? ''),
          manager_count: Math.max(0, Math.floor(Number(row.manager_count) || 0)),
        });
      }
      setBrands(next);
    } catch (e) {
      console.error('BillingBrandProfilePicker fetch', e);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void fetchBrands(search);
    }, 240);
    return () => window.clearTimeout(t);
  }, [search, fetchBrands, open]);

  const loadManagers = useCallback(
    async (brand: BrandRow) => {
      try {
        setLoadingManagers(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/admin/platform-billing/brand-links?brand_id=${encodeURIComponent(brand.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json().catch(() => ({}))) as { managers?: unknown; error?: string };
        if (!res.ok) return;
        const rawM = j.managers;
        const list = Array.isArray(rawM) ? rawM : [];
        const normalized: ManagerRow[] = list
          .filter((m): m is Record<string, unknown> => m != null && typeof m === 'object')
          .map((m) => ({
            user_id: String(m.user_id ?? '').trim(),
            email: typeof m.email === 'string' ? m.email : null,
            full_name: typeof m.full_name === 'string' ? m.full_name : null,
            created_at: typeof m.created_at === 'string' ? m.created_at : '',
          }))
          .filter((m) => m.user_id.length > 0);
        setManagers(normalized);
        if (normalized.length === 1) {
          const u = normalized[0].user_id;
          onProfileIdChange(u);
          const hint =
            normalized[0].email || (u.length >= 8 ? `${u.slice(0, 8)}…` : u);
          onBrandLabelHint?.(`${brand.name} (${hint})`);
        } else {
          onProfileIdChange('');
          onBrandLabelHint?.(brand.name);
        }
      } catch (e) {
        console.error('BillingBrandProfilePicker loadManagers', e);
        setManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    },
    [onProfileIdChange, onBrandLabelHint]
  );

  const onSelectBrand = (b: BrandRow) => {
    setSelectedBrand(b);
    setOpen(false);
    void loadManagers(b);
  };

  const clearBrand = () => {
    setSelectedBrand(null);
    setManagers([]);
    onProfileIdChange('');
  };

  const managerSummary = (m: ManagerRow) => {
    const n = m.full_name?.trim();
    const e = m.email?.trim();
    const uid = m.user_id?.trim() ?? '';
    if (n && e) return `${n} · ${e}`;
    if (e) return e;
    if (n) return n;
    return uid.length >= 8 ? `${uid.slice(0, 8)}…` : uid || '—';
  };

  const selectedManagerLabel = useMemo(() => {
    if (!profileId) return null;
    const m = managers.find((x) => x.user_id === profileId);
    if (m) return managerSummary(m);
    return `${profileId.slice(0, 8)}…`;
  }, [profileId, managers]);

  return (
    <div className="space-y-3">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) void fetchBrands(search);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-10 w-full justify-between border-zinc-700 bg-zinc-950 font-normal text-zinc-100 hover:bg-zinc-900"
          >
            <span className="truncate text-left">
              {selectedBrand ? `${selectedBrand.name} (${selectedBrand.slug})` : 'Choose a brand…'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,440px)] p-0" align="start">
          <Command shouldFilter={false} className="bg-zinc-950">
            <CommandInput
              placeholder="Search brands…"
              className="h-10 border-zinc-800"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64">
              {loadingBrands ? (
                <div className="flex items-center gap-2 px-3 py-6 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No verified brands match.</CommandEmpty>
                  <CommandGroup heading="Brands">
                    {brands.map((b) => (
                      <CommandItem
                        key={b.id}
                        value={b.id}
                        keywords={[b.name, b.slug, b.id].filter(Boolean)}
                        onSelect={() => onSelectBrand(b)}
                        className="text-zinc-200 aria-selected:bg-zinc-800"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {b.name}
                          <span className="block text-xs text-zinc-500">
                            {b.manager_count} page manager{b.manager_count === 1 ? '' : 's'}
                            {b.manager_count === 0 ? ' — assign one under Brand pages first' : ''}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedBrand ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="ghost" className="h-8 text-zinc-400" onClick={() => clearBrand()}>
            Clear brand
          </Button>
          {loadingManagers ? (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading managers…
            </span>
          ) : null}
        </div>
      ) : null}

      {selectedBrand && managers.length > 1 ? (
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Billable user (brand page manager)</Label>
          <select
            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
            value={profileId}
            onChange={(e) => {
              const uid = e.target.value;
              onProfileIdChange(uid);
              const m = managers.find((x) => x.user_id === uid);
              if (m) {
                onBrandLabelHint?.(
                  `${selectedBrand.name} (${m.email || (m.user_id.length >= 8 ? `${m.user_id.slice(0, 8)}…` : m.user_id)})`
                );
              }
            }}
          >
            <option value="">Select manager…</option>
            {managers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {managerSummary(m)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectedBrand && !loadingManagers && managers.length === 0 ? (
        <p className="text-xs text-amber-200/90">
          This brand has no page managers yet. Add one in Admin → Brand pages, or use profile UUID (advanced).
        </p>
      ) : null}

      {selectedBrand && managers.length === 1 ? (
        <p className="text-xs text-zinc-500">
          Linked profile: <span className="text-zinc-300">{selectedManagerLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
