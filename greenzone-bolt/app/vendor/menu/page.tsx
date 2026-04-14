'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import VendorNav from '@/components/vendor/VendorNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useVendorAnalyticsScope } from '@/hooks/useVendorAnalyticsScope';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Grid2x2 as Grid,
  List,
  Package,
  Loader2,
  Link2,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TreehouseCatalogVerifiedBadge } from '@/components/brand/TreehouseCatalogVerifiedBadge';
import { StrainHeroImage } from '@/components/strains/StrainHeroImage';
import { menuThumbImgClassName, menuThumbImgClassNameFixed } from '@/lib/strainProductImage';
import { ProductBrandCardChip } from '@/components/product/ProductThumbnailBrandTab';
import { resolveMenuBrandLabel } from '@/lib/productBrandLabel';
import { SITE_IMAGE_SLOTS } from '@/lib/siteImageSlots';
import { VendorSkuCardFrame } from '@/components/vendor/VendorSkuCardFrame';
import { resolveSkuCardTheme } from '@/lib/vendorSkuCardTheme';
import { menuSkuTitleStyle } from '@/lib/menuTextColor';
import { useToast } from '@/hooks/use-toast';
import { pickMenuProfileId } from '@/lib/vendorMenuMerge';
import { cn } from '@/lib/utils';
import { VendorMenuCsvImportPanel } from '@/components/vendor/VendorMenuCsvImportPanel';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ProductRow = {
  id: string;
  vendor_id?: string;
  name: string;
  category: string;
  price_cents: number;
  is_featured?: boolean | null;
  inventory_count?: number;
  in_stock: boolean;
  images: string[];
  catalog_product_id?: string | null;
  strain_id?: string | null;
  strains?: { slug: string; image_url: string | null } | null;
  brand_id?: string | null;
  brand_display_name?: string | null;
  brands?: { name: string } | null;
  menu_text_color?: string | null;
};

export default function MenuManagerPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, ownedVendors, loading: vLoading, vendorsMode, isAdminManagingOtherVendor, mayEnterVendorShell } =
    useVendorBusiness({
      adminMenuVendorId,
    });
  const {
    analyticsScope,
    setAnalyticsScope,
    effectiveVendorIds,
    dashboardTitle,
    analyticsSubtitle,
    showScopePicker,
  } = useVendorAnalyticsScope(vendor, ownedVendors);
  const menuVendorQuery = adminMenuVendorId
    ? `?vendor=${encodeURIComponent(adminMenuVendorId)}`
    : '';
  const menuSkuCardTheme = useMemo(
    () =>
      resolveSkuCardTheme(
        vendor
          ? {
              preset: vendor.sku_card_preset,
              backgroundUrl: vendor.sku_card_background_url,
              overlayOpacity: vendor.sku_card_overlay_opacity,
            }
          : null
      ),
    [vendor]
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [costMap, setCostMap] = useState<Record<string, number>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const [menuProfileIdByVendor, setMenuProfileIdByVendor] = useState<Record<string, string>>({});
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const hiddenProductIdsRef = useRef(hiddenProductIds);
  hiddenProductIdsRef.current = hiddenProductIds;
  const selectedProductIdsRef = useRef(selectedProductIds);
  selectedProductIdsRef.current = selectedProductIds;

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of ownedVendors) {
      m.set(v.id, v.name);
    }
    return m;
  }, [ownedVendors]);

  const scopeVendorIds = useMemo(() => {
    const ids = effectiveVendorIds.filter(Boolean);
    if (ids.length > 0) return ids;
    return vendor?.id ? [vendor.id] : [];
  }, [effectiveVendorIds, vendor?.id]);
  const viewingAllLocations = scopeVendorIds.length > 1;

  const ownedVendorStateKey = useMemo(
    () => ownedVendors.map((v) => `${v.id}:${v.state ?? ''}`).join('|'),
    [ownedVendors]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vendorsMode || scopeVendorIds.length === 0) {
        setMenuProfileIdByVendor({});
        setHiddenProductIds(new Set());
        setVisibilityLoading(false);
        return;
      }
      setVisibilityLoading(true);
      try {
        const { data: profiles, error: pErr } = await supabase
          .from('vendor_menu_profiles')
          .select('id,vendor_id,is_master,region_key')
          .in('vendor_id', scopeVendorIds);
        if (cancelled) return;
        if (pErr) {
          console.error(pErr);
          setMenuProfileIdByVendor({});
          setHiddenProductIds(new Set());
          return;
        }
        const rows = (profiles || []) as {
          id: string;
          vendor_id: string;
          is_master: boolean;
          region_key: string;
        }[];
        const next: Record<string, string> = {};
        for (const vid of scopeVendorIds) {
          const vProf = rows.filter((p) => p.vendor_id === vid);
          const st = ownedVendors.find((o) => o.id === vid)?.state ?? null;
          let pid = pickMenuProfileId(vProf, st);
          if (!pid && vProf.length) {
            pid = vProf.find((p) => p.is_master)?.id ?? vProf[0].id;
          }
          if (pid) next[vid] = pid;
        }
        setMenuProfileIdByVendor(next);
        const profileIds = Array.from(new Set(Object.values(next)));
        if (profileIds.length === 0) {
          setHiddenProductIds(new Set());
          return;
        }
        const { data: hid, error: hErr } = await supabase
          .from('vendor_menu_profile_hidden_products')
          .select('product_id')
          .in('profile_id', profileIds);
        if (cancelled) return;
        if (hErr) {
          console.error(hErr);
          setHiddenProductIds(new Set());
          return;
        }
        setHiddenProductIds(
          new Set((hid || []).map((r) => String((r as { product_id: string }).product_id)))
        );
      } finally {
        if (!cancelled) setVisibilityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsMode, scopeVendorIds.join('|'), ownedVendorStateKey]);

  /** Creates a default store menu profile when none exists (manual catalogs don’t require POS). */
  const ensureVendorMenuProfileId = useCallback(
    async (vendorId: string): Promise<string | null> => {
      const cached = menuProfileIdByVendor[vendorId];
      if (cached) return cached;
      const { data: existing, error: selErr } = await supabase
        .from('vendor_menu_profiles')
        .select('id,region_key,is_master')
        .eq('vendor_id', vendorId);
      if (selErr) {
        toast({
          title: 'Could not load menu profile',
          description: selErr.message,
          variant: 'destructive',
        });
        return null;
      }
      const rows = (existing || []) as { id: string; region_key: string; is_master: boolean }[];
      const st = ownedVendors.find((o) => o.id === vendorId)?.state ?? null;
      let pid = rows.length ? pickMenuProfileId(rows, st) : null;
      if (!pid && rows.length) {
        pid = rows.find((p) => p.is_master)?.id ?? rows[0].id;
      }
      if (pid) {
        setMenuProfileIdByVendor((prev) => ({ ...prev, [vendorId]: pid! }));
        return pid;
      }
      const { data: ins, error: insErr } = await supabase
        .from('vendor_menu_profiles')
        .insert({
          vendor_id: vendorId,
          region_key: 'DEFAULT',
          label: 'Store menu',
          is_master: true,
        })
        .select('id')
        .single();
      if (!insErr && ins?.id) {
        setMenuProfileIdByVendor((prev) => ({ ...prev, [vendorId]: ins.id }));
        return ins.id;
      }
      if (insErr && (insErr as { code?: string }).code === '23505') {
        const { data: again } = await supabase
          .from('vendor_menu_profiles')
          .select('id,region_key,is_master')
          .eq('vendor_id', vendorId);
        const ar = (again || []) as { id: string; region_key: string; is_master: boolean }[];
        let aid = ar.length ? pickMenuProfileId(ar, st) : null;
        if (!aid && ar.length) aid = ar.find((p) => p.is_master)?.id ?? ar[0].id;
        if (aid) {
          setMenuProfileIdByVendor((prev) => ({ ...prev, [vendorId]: aid! }));
          return aid;
        }
      }
      toast({
        title: 'Could not create menu profile',
        description: insErr?.message ?? 'Try again or contact support.',
        variant: 'destructive',
      });
      return null;
    },
    [menuProfileIdByVendor, ownedVendors, toast]
  );

  const toggleProductHidden = useCallback(
    async (product: ProductRow) => {
      const vid = product.vendor_id;
      if (!vid) {
        toast({
          title: 'Cannot update visibility',
          description: 'This product is missing store information.',
          variant: 'destructive',
        });
        return;
      }
      if (visibilityLoading) {
        toast({
          title: 'One moment',
          description: 'Still loading menu visibility for this scope.',
        });
        return;
      }
      let profileId = menuProfileIdByVendor[vid];
      if (!profileId) {
        const ensured = await ensureVendorMenuProfileId(vid);
        if (!ensured) return;
        profileId = ensured;
      }
      const hide = !hiddenProductIdsRef.current.has(product.id);
      setTogglingProductId(product.id);
      try {
        if (hide) {
          const { error } = await supabase
            .from('vendor_menu_profile_hidden_products')
            .insert({ profile_id: profileId, product_id: product.id });
          const code = (error as { code?: string } | null)?.code;
          if (error && code !== '23505') {
            toast({ title: 'Could not hide', description: error.message, variant: 'destructive' });
            return;
          }
          setHiddenProductIds((s) => new Set(s).add(product.id));
        } else {
          const { error } = await supabase
            .from('vendor_menu_profile_hidden_products')
            .delete()
            .eq('profile_id', profileId)
            .eq('product_id', product.id);
          if (error) {
            toast({ title: 'Could not show product', description: error.message, variant: 'destructive' });
            return;
          }
          setHiddenProductIds((s) => {
            const n = new Set(s);
            n.delete(product.id);
            return n;
          });
        }
      } finally {
        setTogglingProductId(null);
      }
    },
    [menuProfileIdByVendor, ensureVendorMenuProfileId, toast, visibilityLoading]
  );

  const confirmDeleteProduct = useCallback(async () => {
    const target = productToDelete;
    if (!target) return;
    const { id, name, vendor_id: vid } = target;
    setDeletingProductId(id);
    try {
      let q = supabase.from('products').delete().eq('id', id);
      if (vid) q = q.eq('vendor_id', vid);
      const { error } = await q;
      if (error) {
        toast({
          title: 'Could not delete',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setCostMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setHiddenProductIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      setProductToDelete(null);
      toast({
        title: 'Product removed',
        description: `${name} was deleted from your menu.`,
      });
    } finally {
      setDeletingProductId(null);
    }
  }, [productToDelete, toast]);

  const loadProducts = useCallback(async () => {
    if (!vendorsMode || scopeVendorIds.length === 0) {
      setProducts([]);
      setCostMap({});
      setProductLoadError(null);
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    setProductLoadError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setProducts([]);
      setCostMap({});
      setProductLoadError('Session expired — sign in again, then reload this page.');
      toast({
        title: 'Sign in required',
        description: 'Your session is missing. Sign in again to load menu products.',
        variant: 'destructive',
      });
      setLoadingProducts(false);
      return;
    }

    const skuCap = 1600;
    const skuPageSize = 1000;

    /** One vendor per query avoids PostgREST/RLS edge cases with `.in('vendor_id', many)`. */
    const loadVendorPages = async (vendorId: string, select: string) => {
      const out: ProductRow[] = [];
      let from = 0;
      while (out.length < skuCap) {
        const to = from + skuPageSize - 1;
        const { data, error } = await supabase
          .from('products')
          .select(select)
          .eq('vendor_id', vendorId)
          .order('name')
          .range(from, to);
        if (error) return { rows: [] as ProductRow[], error };
        const chunk = (data || []) as unknown as ProductRow[];
        out.push(...chunk);
        if (chunk.length < skuPageSize) break;
        from += skuPageSize;
      }
      return { rows: out.slice(0, skuCap), error: null as null };
    };

    const loadWithSelect = async (select: string) => {
      const parts = await Promise.all(scopeVendorIds.map((vid) => loadVendorPages(vid, select)));
      const err = parts.find((p) => p.error);
      if (err?.error) return { rows: [] as ProductRow[], error: err.error };
      const merged = parts.flatMap((p) => p.rows);
      merged.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
      );
      return { rows: merged.slice(0, skuCap), error: null };
    };

    const productSelectAttempts = [
      'id,vendor_id,name,category,price_cents,in_stock,images',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id,strain_id,brand_id,brand_display_name,menu_text_color',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id,strain_id,brand_id,brand_display_name',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id,strain_id',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,strain_id,brand_id,brand_display_name',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,strain_id',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id,brand_id,brand_display_name',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id',
      'id,vendor_id,name,category,price_cents,inventory_count,in_stock,is_featured,images',
      'id,name,category,price_cents,inventory_count,in_stock,is_featured,images,catalog_product_id,strain_id,brand_id,brand_display_name,menu_text_color',
    ];

    let rows: ProductRow[] = [];
    let loadErr: { message?: string } | null = null;
    for (const select of productSelectAttempts) {
      const attempt = await loadWithSelect(select);
      if (!attempt.error) {
        rows = attempt.rows;
        loadErr = null;
        break;
      }
      loadErr = attempt.error;
      const msg = String(attempt.error.message || '');
      if (
        !/vendor_id|catalog_product_id|strain_id|brand_id|brand_display_name|is_featured|menu_text_color|inventory_count|column|does not exist/i.test(
          msg
        )
      ) {
        break;
      }
    }

    if (loadErr) {
      console.error(loadErr);
      const msg = String(loadErr.message || 'Could not load products');
      setProductLoadError(msg);
      toast({ title: 'Could not load menu', description: msg, variant: 'destructive' });
      setProducts([]);
      setCostMap({});
      setLoadingProducts(false);
      return;
    }

    const strainIds = Array.from(
      new Set(rows.map((r) => r.strain_id).filter((id): id is string => Boolean(id)))
    );
    let enriched: ProductRow[] = rows;
    if (strainIds.length) {
      const { data: stRows, error: stErr } = await supabase
        .from('strains')
        .select('id,slug,image_url')
        .in('id', strainIds);
      if (!stErr && stRows?.length) {
        const m = new Map<string, { slug: string; image_url: string | null }>();
        for (const s of stRows as { id: string; slug: string; image_url: string | null }[]) {
          m.set(s.id, { slug: s.slug, image_url: s.image_url });
        }
        enriched = rows.map((r) => {
          const se = r.strain_id ? m.get(r.strain_id) : undefined;
          return se ? { ...r, strains: se } : { ...r, strains: null };
        });
      }
    }

    const brandIds = Array.from(
      new Set(enriched.map((r) => r.brand_id).filter((id): id is string => Boolean(id)))
    );
    if (brandIds.length) {
      const { data: bRows, error: bErr } = await supabase
        .from('brands')
        .select('id,name')
        .in('id', brandIds);
      if (!bErr && bRows?.length) {
        const bm = new Map<string, string>();
        for (const b of bRows as { id: string; name: string }[]) {
          bm.set(b.id, b.name);
        }
        enriched = enriched.map((r) => ({
          ...r,
          brands: r.brand_id && bm.has(r.brand_id) ? { name: bm.get(r.brand_id)! } : null,
        }));
      }
    }

    setProducts(enriched);
    setProductLoadError(null);
    const ids = rows.map((p) => p.id);
    if (ids.length) {
      const { data: costs, error: cErr } = await supabase
        .from('product_unit_costs')
        .select('product_id, unit_cost_cents')
        .in('product_id', ids);
      if (!cErr && costs) {
        const m: Record<string, number> = {};
        for (const r of costs as { product_id: string; unit_cost_cents: number }[]) {
          m[r.product_id] = r.unit_cost_cents;
        }
        setCostMap(m);
      } else {
        setCostMap({});
      }
    } else {
      setCostMap({});
    }
    setLoadingProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast() is stable enough; omit to avoid re-fetch loops
  }, [vendorsMode, scopeVendorIds.join('|')]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => String(p.name ?? '').toLowerCase().includes(q));
  }, [products, searchQuery]);

  const toggleSelectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const bulkSetHiddenForSelection = useCallback(
    async (hide: boolean) => {
      const sel = selectedProductIdsRef.current;
      const targets = filtered.filter((p) => sel.has(p.id) && p.vendor_id);
      if (targets.length === 0) {
        toast({
          title: 'Nothing to update',
          description: 'Select one or more products (with a store) first.',
          variant: 'destructive',
        });
        return;
      }
      if (visibilityLoading) {
        toast({ title: 'One moment', description: 'Still loading menu visibility.' });
        return;
      }
      setBulkActionBusy(true);
      try {
        const byVendor = new Map<string, string[]>();
        for (const p of targets) {
          const vid = p.vendor_id!;
          const arr = byVendor.get(vid) ?? [];
          arr.push(p.id);
          byVendor.set(vid, arr);
        }
        const hiddenNext = new Set(hiddenProductIdsRef.current);
        for (const [vid, pids] of Array.from(byVendor.entries())) {
          const profileId = await ensureVendorMenuProfileId(vid);
          if (!profileId) continue;
          if (hide) {
            const rows = pids.map((product_id) => ({ profile_id: profileId, product_id }));
            const { error } = await supabase
              .from('vendor_menu_profile_hidden_products')
              .upsert(rows, { onConflict: 'profile_id,product_id' });
            if (error) {
              for (const product_id of pids) {
                const { error: e2 } = await supabase
                  .from('vendor_menu_profile_hidden_products')
                  .insert({ profile_id: profileId, product_id });
                if (e2 && (e2 as { code?: string }).code !== '23505') {
                  toast({
                    title: 'Could not hide some items',
                    description: e2.message,
                    variant: 'destructive',
                  });
                }
              }
            }
            pids.forEach((id) => hiddenNext.add(id));
          } else {
            const { error } = await supabase
              .from('vendor_menu_profile_hidden_products')
              .delete()
              .eq('profile_id', profileId)
              .in('product_id', pids);
            if (error) {
              toast({
                title: 'Could not show some items',
                description: error.message,
                variant: 'destructive',
              });
            }
            pids.forEach((id) => hiddenNext.delete(id));
          }
        }
        setHiddenProductIds(hiddenNext);
        setSelectedProductIds(new Set());
        toast({
          title: hide ? 'Hidden from public menu' : 'Shown on public menu',
          description: `${targets.length} product(s) updated.`,
        });
      } finally {
        setBulkActionBusy(false);
      }
    },
    [filtered, ensureVendorMenuProfileId, toast, visibilityLoading]
  );

  const runBulkDelete = useCallback(async () => {
    const sel = selectedProductIdsRef.current;
    const targets = filtered.filter((p) => sel.has(p.id));
    if (targets.length === 0) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkActionBusy(true);
    try {
      const removedIds = new Set<string>();
      let lastErr: string | null = null;
      for (const p of targets) {
        let q = supabase.from('products').delete().eq('id', p.id);
        if (p.vendor_id) q = q.eq('vendor_id', p.vendor_id);
        const { error } = await q;
        if (error) {
          lastErr = error.message;
          continue;
        }
        removedIds.add(p.id);
      }
      if (removedIds.size > 0) {
        setProducts((prev) => prev.filter((p) => !removedIds.has(p.id)));
        setCostMap((prev) => {
          const next = { ...prev };
          removedIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
        setHiddenProductIds((s) => {
          const next = new Set(s);
          removedIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      setSelectedProductIds(new Set());
      setBulkDeleteOpen(false);
      if (lastErr && removedIds.size === 0) {
        toast({ title: 'Delete failed', description: lastErr, variant: 'destructive' });
      } else if (lastErr) {
        toast({
          title: 'Some items not deleted',
          description: `${removedIds.size} removed. ${lastErr}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Products removed',
          description: `${removedIds.size} product(s) deleted from your catalog.`,
        });
      }
    } finally {
      setBulkActionBusy(false);
    }
  }, [filtered, toast]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="border-green-900/30 bg-gray-900 p-6">Sign in with a linked dispensary account to manage your menu.</Card>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <Card className="max-w-md border-green-900/30 bg-gray-900 p-6 text-center">
          Menu tools require <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <VendorNav />
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-8">
          <Card className="max-w-lg border-green-900/30 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No dispensary linked to your login.</p>
          </Card>
        </div>
      </div>
    );
  }

  const withMargin = (p: ProductRow) => {
    const cost = costMap[p.id] ?? 0;
    const margin = p.price_cents - cost;
    return { cost, margin };
  };

  const selectedOnFiltered = filtered.filter((p) => selectedProductIds.has(p.id));
  const selectionCount = selectedOnFiltered.length;
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedProductIds.has(p.id));
  const someFilteredSelected =
    filtered.some((p) => selectedProductIds.has(p.id)) && !allFilteredSelected;

  const bulkSelectionToolbar = (
    <Card className="border-green-900/30 bg-gray-950/80 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              id="menu-select-all-filtered"
              checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
              onCheckedChange={(v) => {
                if (v === true) {
                  setSelectedProductIds(new Set(filtered.map((p) => p.id)));
                } else {
                  setSelectedProductIds(new Set());
                }
              }}
              disabled={filtered.length === 0 || loadingProducts}
            />
            <label htmlFor="menu-select-all-filtered" className="cursor-pointer text-sm text-gray-300">
              Select all on this list ({filtered.length})
            </label>
          </div>
          <span className="text-sm text-gray-500">
            {selectionCount > 0 ? (
              <span className="text-brand-lime">{selectionCount} selected</span>
            ) : (
              'Select SKUs for bulk hide, show, or delete'
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-green-600/35"
            disabled={selectionCount === 0 || bulkActionBusy || visibilityLoading}
            onClick={() => void bulkSetHiddenForSelection(true)}
          >
            {bulkActionBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <EyeOff className="mr-1.5 h-3.5 w-3.5" />}
            Hide from menu
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-green-600/35"
            disabled={selectionCount === 0 || bulkActionBusy || visibilityLoading}
            onClick={() => void bulkSetHiddenForSelection(false)}
          >
            {bulkActionBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
            Show on menu
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="bg-red-900/50 hover:bg-red-900/70"
            disabled={selectionCount === 0 || bulkActionBusy}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete selected
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <VendorNav />

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8">
            {isAdminManagingOtherVendor && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95">
                <span className="font-semibold text-amber-200">Admin mode:</span> you are editing{' '}
                <span className="font-medium text-white">{vendor.name}</span>’s menu (not your own store). Changes save
                to this vendor’s catalog.
              </div>
            )}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="mb-2 text-3xl font-bold">Menu — {dashboardTitle}</h1>
                <p className="text-gray-400">
                  {viewingAllLocations
                    ? 'Products from every linked location in the scope below (matches dashboard product counts).'
                    : 'Products, photos, and unit cost for margins'}
                </p>
                {analyticsSubtitle ? <p className="mt-1 text-sm text-gray-500">{analyticsSubtitle}</p> : null}
                {showScopePicker ? (
                  <div className="mt-4 max-w-md space-y-2">
                    <Label htmlFor="menu-scope" className="text-gray-400">
                      Menu scope
                    </Label>
                    <Select value={analyticsScope} onValueChange={(v) => setAnalyticsScope(v as 'all' | string)}>
                      <SelectTrigger id="menu-scope" className="border-green-900/40 bg-gray-950 text-white">
                        <SelectValue placeholder="Choose location" />
                      </SelectTrigger>
                      <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                        <SelectItem value="all">All linked locations (combined catalog)</SelectItem>
                        {ownedVendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} · {[v.city, v.state].filter(Boolean).join(', ') || v.zip || 'Area TBD'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Use the same scope as the dashboard overview so SKU counts line up with{' '}
                      <span className="text-gray-400">Manage menu</span>.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-3">
                <Link href={`/vendor/menu/categories${menuVendorQuery}`}>
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    Categories (legacy UI)
                  </Button>
                </Link>
                <Link href={`/vendor/menu/sources${menuVendorQuery}`}>
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect POS
                  </Button>
                </Link>
                <Link href={`/vendor/menu/catalog${menuVendorQuery}`}>
                  <Button variant="outline" className="border-green-600/30 text-green-400 hover:bg-green-600/10">
                    Brand catalog
                  </Button>
                </Link>
                <Link href={`/vendor/menu/product/new${menuVendorQuery}`}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add product
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">In stock</p>
                <p className="text-2xl font-bold">{products.filter((p) => p.in_stock).length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Tracked COGS</p>
                <p className="text-2xl font-bold">{Object.keys(costMap).length}</p>
              </Card>
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <p className="text-sm text-gray-400">Store</p>
                <p className="truncate text-lg font-semibold text-green-400">
                  {viewingAllLocations ? `${scopeVendorIds.length} locations` : vendor.slug}
                </p>
              </Card>
            </div>

            {vendor?.id ? (
              <VendorMenuCsvImportPanel
                defaultVendorId={
                  scopeVendorIds.length === 1
                    ? scopeVendorIds[0]!
                    : analyticsScope !== 'all'
                      ? analyticsScope
                      : vendor.id
                }
                ownedVendors={ownedVendors.map((v) => ({ id: v.id, name: v.name }))}
                multiLocation={viewingAllLocations}
                onImported={() => void loadProducts()}
              />
            ) : null}
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="border border-green-900/20 bg-gray-900/50">
              <TabsTrigger value="products">All products</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              {bulkSelectionToolbar}
              <Card className="border-green-900/20 bg-gray-900/50 p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-green-900/20 bg-gray-800/50 pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-green-600' : 'border-green-600/30'}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {loadingProducts ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
                </div>
              ) : filtered.length === 0 ? (
                <Card className="border-green-900/20 bg-gray-900/50 p-12 text-center text-gray-400">
                  {productLoadError ? (
                    <div className="space-y-2">
                      <p className="font-medium text-red-300">Could not load products</p>
                      <p className="text-sm text-gray-400">{productLoadError}</p>
                    </div>
                  ) : products.length === 0 ? (
                    'No products in this scope yet. Add one with photos and your cost per unit, or switch location above.'
                  ) : (
                    'No products match your search.'
                  )}
                </Card>
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3'
                      : 'space-y-3'
                  }
                >
                  {filtered.map((product) => {
                    const productImg =
                      product.images?.[0] && String(product.images[0]).trim()
                        ? String(product.images[0]).trim()
                        : null;
                    const placeholderImg = SITE_IMAGE_SLOTS.productPlaceholder;
                    const img = productImg || placeholderImg;
                    const strainRow = product.strains;
                    const brandTab = resolveMenuBrandLabel({
                      linkedBrandName: product.brands?.name,
                      brandDisplayName: product.brand_display_name,
                      storeName: vendor.name,
                    });
                    const { cost, margin } = withMargin(product);
                    const skuTitleStyle = menuSkuTitleStyle(product.menu_text_color);
                    const editHref = `/vendor/menu/product/${product.id}${menuVendorQuery}`;
                    const isHidden = hiddenProductIds.has(product.id);
                    const canToggleHide = Boolean(product.vendor_id);
                    const hideBusy = togglingProductId === product.id;
                    return (
                      <VendorSkuCardFrame
                        key={product.id}
                        theme={menuSkuCardTheme}
                        className="group h-full overflow-hidden transition-colors hover:border-green-600/30"
                      >
                        <div
                          className="absolute left-2 top-2 z-[35] flex items-center rounded-md bg-black/70 p-0.5 ring-1 ring-green-900/50"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={() => toggleSelectProduct(product.id)}
                            aria-label={`Select ${product.name}`}
                            className="border-white/40 data-[state=checked]:border-brand-lime"
                          />
                        </div>
                        <Link
                          href={editHref}
                          className="min-w-0 flex-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                        >
                          {viewMode === 'grid' ? (
                            <>
                              <div className="flex gap-2.5 p-2 sm:gap-3 sm:p-2.5">
                                <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-gray-950 sm:h-[5rem] sm:w-[5rem]">
                                  {product.catalog_product_id ? (
                                    <TreehouseCatalogVerifiedBadge className="absolute left-0.5 top-0.5 z-[2] scale-90" />
                                  ) : null}
                                  {productImg || strainRow?.slug ? (
                                    <StrainHeroImage
                                      preferredUrl={productImg}
                                      slug={strainRow?.slug ?? ''}
                                      imageUrl={strainRow?.image_url}
                                      alt=""
                                      maxCandidates={6}
                                      className="h-full w-full"
                                      imgClassName={`${menuThumbImgClassName(productImg)} transition duration-300 group-hover:scale-105`}
                                      placeholder={
                                        <img
                                          src={placeholderImg}
                                          alt=""
                                          className={`${menuThumbImgClassName(productImg)} transition duration-300 group-hover:scale-105`}
                                        />
                                      }
                                    />
                                  ) : (
                                    <img
                                      src={img}
                                      alt=""
                                      className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                  )}
                                  <div
                                    className={`absolute right-0.5 top-0.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                                      product.in_stock ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
                                    }`}
                                  >
                                    {product.in_stock ? 'Stock' : 'Out'}
                                  </div>
                                </div>
                                <div className="flex min-h-[4.5rem] min-w-0 flex-1 flex-col justify-between gap-1 sm:min-h-[5rem]">
                                  <div>
                                    <div className="mb-0.5 flex flex-wrap items-center gap-1">
                                      {viewingAllLocations && product.vendor_id ? (
                                        <Badge
                                          variant="outline"
                                          className="max-w-[40%] shrink truncate border-sky-600/40 px-1.5 py-0 text-[9px] text-sky-300"
                                          title={vendorNameById.get(product.vendor_id) ?? undefined}
                                        >
                                          {vendorNameById.get(product.vendor_id) ?? 'Location'}
                                        </Badge>
                                      ) : null}
                                      <ProductBrandCardChip label={brandTab} className="max-w-full" />
                                      <Badge
                                        variant="outline"
                                        className="border-green-600/30 px-1.5 py-0 text-[9px] text-green-400"
                                      >
                                        {product.category}
                                      </Badge>
                                      {product.is_featured ? (
                                        <Badge className="border border-amber-500/50 bg-amber-500/90 px-1.5 py-0 text-[8px] text-black">
                                          Featured
                                        </Badge>
                                      ) : null}
                                      {isHidden ? (
                                        <Badge
                                          variant="outline"
                                          className="border-gray-500/50 px-1.5 py-0 text-[8px] text-gray-300"
                                        >
                                          Hidden
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <h3
                                      className={`line-clamp-2 text-sm font-semibold leading-snug${skuTitleStyle ? '' : ' text-white'}`}
                                      style={skuTitleStyle}
                                    >
                                      {product.name}
                                    </h3>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-green-400">
                                      ${(product.price_cents / 100).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                      Cost ${(cost / 100).toFixed(2)} · Mgn ${(margin / 100).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-4 p-4">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded">
                                {product.catalog_product_id ? (
                                  <TreehouseCatalogVerifiedBadge className="absolute left-0.5 top-0.5 z-[2]" />
                                ) : null}
                                {productImg || strainRow?.slug ? (
                                  <StrainHeroImage
                                    preferredUrl={productImg}
                                    slug={strainRow?.slug ?? ''}
                                    imageUrl={strainRow?.image_url}
                                    alt=""
                                    maxCandidates={6}
                                    className="h-20 w-20"
                                    imgClassName={menuThumbImgClassNameFixed(productImg)}
                                    placeholder={
                                      <img
                                        src={placeholderImg}
                                        alt=""
                                        className={`${menuThumbImgClassNameFixed(productImg)} rounded`}
                                      />
                                    }
                                  />
                                ) : (
                                  <img src={img} alt="" className="h-20 w-20 rounded object-cover" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {viewingAllLocations && product.vendor_id ? (
                                  <Badge
                                    variant="outline"
                                    className="mb-1 max-w-full justify-center truncate border-sky-600/40 py-0 text-[10px] text-sky-300"
                                  >
                                    {vendorNameById.get(product.vendor_id) ?? 'Location'}
                                  </Badge>
                                ) : null}
                                <ProductBrandCardChip label={brandTab} className="mb-1 max-w-full" />
                                <h3
                                  className={`font-semibold${skuTitleStyle ? '' : ' text-white'}`}
                                  style={skuTitleStyle}
                                >
                                  {product.name}
                                </h3>
                                {product.is_featured ? (
                                  <Badge className="mt-1 border border-amber-500/50 bg-amber-500/90 text-[10px] text-black">
                                    Featured
                                  </Badge>
                                ) : null}
                                {isHidden ? (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 border-gray-500/50 text-[10px] text-gray-300"
                                  >
                                    Hidden on menu
                                  </Badge>
                                ) : null}
                                <p className="text-sm text-gray-400">{product.category}</p>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                  <span>${(product.price_cents / 100).toFixed(2)}</span>
                                  <span className="text-gray-500">
                                    COGS ${(cost / 100).toFixed(2)} · Margin ${(margin / 100).toFixed(2)}
                                  </span>
                                  <span className="text-gray-500">Qty {product.inventory_count ?? 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Link>
                        <div className="relative z-10 flex shrink-0 flex-wrap gap-2 border-t border-green-900/25 bg-black/30 px-2 py-2">
                          <Button
                            asChild
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-green-600/35 text-green-300 hover:bg-green-600/10"
                          >
                            <Link href={editHref}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-busy={hideBusy}
                            aria-disabled={hideBusy || visibilityLoading || !canToggleHide}
                            title={
                              !product.vendor_id
                                ? 'Missing store on this row.'
                                : visibilityLoading
                                  ? 'Loading visibility…'
                                  : 'Hide or show on the public menu'
                            }
                            className={cn(
                              'border-green-600/35 text-gray-200 hover:bg-green-600/10',
                              (hideBusy || visibilityLoading || !canToggleHide) && 'opacity-60'
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (hideBusy) return;
                              void toggleProductHidden(product);
                            }}
                          >
                            {hideBusy || visibilityLoading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : isHidden ? (
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {isHidden ? 'Show' : 'Hide'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={Boolean(deletingProductId)}
                            className="border-red-900/40 text-red-400 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </VendorSkuCardFrame>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              {bulkSelectionToolbar}
              <Card className="border-green-900/20 bg-gray-900/50 p-6">
                <Package className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <h3 className="mb-4 text-center text-lg font-semibold">Stock levels</h3>
                <div className="space-y-2">
                  {filtered.map((p) => {
                    const invTitleStyle = menuSkuTitleStyle(p.menu_text_color);
                    const invEditHref = `/vendor/menu/product/${p.id}${menuVendorQuery}`;
                    const invHidden = hiddenProductIds.has(p.id);
                    const invCanHide = Boolean(p.vendor_id);
                    const invHideBusy = togglingProductId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-green-900/20 px-3 py-2"
                      >
                        <div
                          className="flex shrink-0 items-center"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedProductIds.has(p.id)}
                            onCheckedChange={() => toggleSelectProduct(p.id)}
                            aria-label={`Select ${p.name}`}
                            className="border-white/40 data-[state=checked]:border-brand-lime"
                          />
                        </div>
                        <span
                          className={`min-w-0 flex-1 truncate${invTitleStyle ? '' : ' text-white'}`}
                          style={invTitleStyle}
                        >
                          {p.name}
                          {invHidden ? (
                            <span className="ml-2 text-xs text-gray-500">(hidden)</span>
                          ) : null}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="tabular-nums text-gray-400">{p.inventory_count ?? 0}</span>
                          <Button
                            asChild
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-green-400 hover:bg-green-600/10 hover:text-green-300"
                          >
                            <Link href={invEditHref}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {p.name}</span>
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-busy={invHideBusy}
                            aria-disabled={invHideBusy || visibilityLoading || !invCanHide}
                            className={cn(
                              'h-8 px-2 text-gray-300 hover:bg-green-600/10',
                              (invHideBusy || visibilityLoading || !invCanHide) && 'opacity-60'
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (invHideBusy) return;
                              void toggleProductHidden(p);
                            }}
                          >
                            {invHideBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : invHidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                            <span className="sr-only">
                              {invHidden ? 'Show on menu' : 'Hide from menu'}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={Boolean(deletingProductId)}
                            className="h-8 px-2 text-red-400 hover:bg-red-950/30 hover:text-red-300 disabled:opacity-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProductToDelete(p);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {p.name}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingProductId) setProductToDelete(null);
        }}
      >
        <AlertDialogContent className="border-green-900/35 bg-gray-950 text-white sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {productToDelete ? (
                <>
                  This permanently removes{' '}
                  <span className="font-medium text-gray-200">{productToDelete.name}</span>
                  {viewingAllLocations && productToDelete.vendor_id ? (
                    <>
                      {' '}
                      from{' '}
                      <span className="font-medium text-gray-200">
                        {vendorNameById.get(productToDelete.vendor_id) ?? 'this location'}
                      </span>
                    </>
                  ) : null}{' '}
                  from your catalog. Shoppers will no longer see it. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(deletingProductId)}
              className="border-green-900/40 bg-gray-900 text-white hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deletingProductId)}
              className="bg-red-700 hover:bg-red-800"
              onClick={() => void confirmDeleteProduct()}
            >
              {deletingProductId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete product'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkActionBusy) setBulkDeleteOpen(false);
        }}
      >
        <AlertDialogContent className="border-green-900/35 bg-gray-950 text-white sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectionCount} product(s)?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This permanently removes the selected SKUs from your catalog. Shoppers will no longer see them. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={bulkActionBusy}
              className="border-green-900/40 bg-gray-900 text-white hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkActionBusy}
              className="bg-red-700 hover:bg-red-800"
              onClick={() => void runBulkDelete()}
            >
              {bulkActionBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete all selected'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
