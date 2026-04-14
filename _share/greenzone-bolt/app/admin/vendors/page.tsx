'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { extractZip5 } from '@/lib/zipUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  Clock,
  FileBadge,
  ImageIcon,
  Loader2,
  MapPin,
  Trash2,
  UtensilsCrossed,
  UserRound,
  UserRoundX,
} from 'lucide-react';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import { fetchAllSupabasePages, SUPABASE_LIST_PAGE_SIZE } from '@/lib/supabasePaginate';

const DAYS = [
  { d: 0, label: 'Sunday' },
  { d: 1, label: 'Monday' },
  { d: 2, label: 'Tuesday' },
  { d: 3, label: 'Wednesday' },
  { d: 4, label: 'Thursday' },
  { d: 5, label: 'Friday' },
  { d: 6, label: 'Saturday' },
];

type VendorRow = {
  id: string;
  business_name: string;
  user_id: string;
  logo_url: string | null;
  cover_photo_url: string | null;
  is_approved: boolean;
  approval_status: string;
  is_live?: boolean;
  profile_views: number | null;
  listing_views: number | null;
  deal_clicks: number | null;
  phone_clicks: number | null;
  direction_clicks: number | null;
  website_clicks: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  total_products: number | null;
  /** CannaHub `vendors.smokers_club_eligible` */
  smokers_club_eligible?: boolean;
  /** CannaHub — public menu + online ordering when true */
  online_menu_enabled?: boolean;
  zip?: string | null;
  offers_delivery?: boolean;
  offers_storefront?: boolean;
  /** Filled from `profiles` for admins — login email for linked owner */
  owner_email?: string | null;
};

type HourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

type LicenseRow = {
  id: string;
  license_number: string;
  license_type: string;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  verification_status: string;
};

function toTimeInput(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function fromTimeInput(t: string): string | null {
  if (!t) return null;
  return `${t}:00`;
}

function mapDbRowToVendorRow(v: Record<string, unknown>): VendorRow {
  if (isVendorsSchema()) {
    return {
      id: v.id as string,
      business_name: String(v.name ?? ''),
      user_id: String(v.user_id ?? ''),
      logo_url: (v.logo_url as string | null) ?? null,
      cover_photo_url: (v.banner_url as string | null) ?? null,
      is_approved: v.license_status === 'approved',
      approval_status: String(v.license_status ?? ''),
      is_live: v.is_live !== false,
      profile_views: null,
      listing_views: null,
      deal_clicks: null,
      phone_clicks: null,
      direction_clicks: null,
      website_clicks: null,
      average_rating: null,
      total_reviews: null,
      total_products: null,
      smokers_club_eligible: v.smokers_club_eligible === true,
      online_menu_enabled: vendorRowPublicMenuEnabled(v),
      offers_delivery: v.offers_delivery === true,
      offers_storefront: v.offers_storefront === true,
      zip: (v.zip as string | null) ?? null,
      owner_email: null,
    };
  }
  return {
    id: v.id as string,
    business_name: String(v.business_name ?? ''),
    user_id: String(v.user_id ?? ''),
    logo_url: (v.logo_url as string | null) ?? null,
    cover_photo_url: (v.cover_photo_url as string | null) ?? null,
    is_approved: v.is_approved === true,
    approval_status: String(v.approval_status ?? ''),
    is_live: v.is_live !== false,
    profile_views: (v.profile_views as number | null) ?? null,
    listing_views: (v.listing_views as number | null) ?? null,
    deal_clicks: (v.deal_clicks as number | null) ?? null,
    phone_clicks: (v.phone_clicks as number | null) ?? null,
    direction_clicks: (v.direction_clicks as number | null) ?? null,
    website_clicks: (v.website_clicks as number | null) ?? null,
    average_rating: (v.average_rating as number | null) ?? null,
    total_reviews: (v.total_reviews as number | null) ?? null,
    total_products: (v.total_products as number | null) ?? null,
    smokers_club_eligible: false,
    online_menu_enabled: true,
    offers_delivery: true,
    offers_storefront: true,
    zip: null,
    owner_email: null,
  };
}

async function fetchOwnerEmailsForUserIds(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(
    new Set(userIds.map((id) => id.trim()).filter((id) => id.length > 0))
  );
  const chunkSize = 80;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('profiles').select('id, email').in('id', slice);
    if (error) {
      console.warn('Could not load profile emails for vendor owners:', error);
      continue;
    }
    for (const row of data || []) {
      const r = row as { id: string; email: string | null };
      if (r.id && r.email) map.set(r.id, r.email);
    }
  }
  return map;
}

export default function AdminVendorsPage() {
  const searchParams = useSearchParams();
  const vendorFromUrl = searchParams.get('vendor');

  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'linked' | 'unclaimed'>('all');
  const [activeTab, setActiveTab] = useState<'analytics' | 'areas' | 'profile' | 'license' | 'hours'>('analytics');

  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [vendorZip, setVendorZip] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [listingMarkets, setListingMarkets] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [marketApproved, setMarketApproved] = useState<Record<string, boolean>>({});

  const [hours, setHours] = useState<HourRow[]>(() =>
    DAYS.map(({ d }) => ({
      day_of_week: d,
      open_time: null,
      close_time: null,
      is_closed: true,
    }))
  );

  const [license, setLicense] = useState<Partial<LicenseRow>>({
    license_number: '',
    license_type: 'retail',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    document_url: '',
    verification_status: 'pending',
  });
  const [licenseId, setLicenseId] = useState<string | null>(null);

  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [orderRevenue, setOrderRevenue] = useState<number | null>(null);

  const [markerQuotas, setMarkerQuotas] = useState<{ id: string; region_key: string; max_markers: number }[]>([]);
  const [quotaRegion, setQuotaRegion] = useState('CA');
  const [quotaMaxMarkers, setQuotaMaxMarkers] = useState('2');

  const selected = vendors.find((v) => v.id === selectedId);

  const { linkedOwnerCount, unclaimedCount } = useMemo(() => {
    let linked = 0;
    let unclaimed = 0;
    for (const v of vendors) {
      if (v.user_id.trim().length > 0) linked++;
      else unclaimed++;
    }
    return { linkedOwnerCount: linked, unclaimedCount: unclaimed };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const zipDigits = q.replace(/\D/g, '');

    let list = vendors;
    if (ownerFilter === 'linked') list = list.filter((v) => v.user_id.trim().length > 0);
    if (ownerFilter === 'unclaimed') list = list.filter((v) => v.user_id.trim().length === 0);

    if (!q) return list;

    return list.filter((v) => {
      if (v.business_name.toLowerCase().includes(q)) return true;
      const z = (v.zip || '').replace(/\D/g, '');
      if (zipDigits.length >= 3 && z.includes(zipDigits)) return true;
      const uid = v.user_id.trim().toLowerCase();
      if (uid) {
        const qNoHyphen = q.replace(/-/g, '');
        const uidNoHyphen = uid.replace(/-/g, '');
        if (uid.includes(q) || (qNoHyphen.length >= 6 && uidNoHyphen.includes(qNoHyphen))) return true;
      }
      const em = (v.owner_email || '').toLowerCase();
      if (em && em.includes(q)) return true;
      return false;
    });
  }, [vendors, searchQuery, ownerFilter]);

  const loadVendors = useCallback(async () => {
    setLoadingList(true);

    let data: Record<string, unknown>[] | null = null;
    let error: { message: string } | null = null;

    if (isVendorsSchema()) {
      const { rows, error: pgErr, truncated } = await fetchAllSupabasePages<Record<string, unknown>>(
        async (from, to) => {
          const pageRes = await supabase
            .from('vendors')
            .select(
              'id, user_id, name, logo_url, banner_url, is_live, license_status, verified, smokers_club_eligible, online_menu_enabled, offers_delivery, offers_storefront, zip'
            )
            .order('name')
            .range(from, to);
          return {
            data: (pageRes.data || []) as Record<string, unknown>[],
            error: pageRes.error,
          };
        }
      );
      error = pgErr;
      data = pgErr ? null : rows;
      if (truncated && rows.length > 0) {
        toast({
          title: 'Vendor list hit fetch limit',
          description: `Loaded ${rows.length.toLocaleString()} rows. If shops are missing, increase SUPABASE_LIST_MAX_PAGES or filter in SQL.`,
          variant: 'destructive',
        });
      }
    } else {
      const { rows, error: pgErr, truncated } = await fetchAllSupabasePages<Record<string, unknown>>(
        async (from, to) => {
          const pageRes = await supabase
            .from('vendor_profiles')
            .select(
              'id, business_name, user_id, logo_url, cover_photo_url, is_approved, approval_status, is_live, profile_views, listing_views, deal_clicks, phone_clicks, direction_clicks, website_clicks, average_rating, total_reviews, total_products'
            )
            .order('business_name')
            .range(from, to);
          return {
            data: (pageRes.data || []) as Record<string, unknown>[],
            error: pageRes.error,
          };
        }
      );
      error = pgErr;
      data = pgErr ? null : rows;
      if (truncated && rows.length > 0) {
        toast({
          title: 'Vendor list hit fetch limit',
          description: `Loaded ${rows.length.toLocaleString()} profile rows.`,
          variant: 'destructive',
        });
      }
    }

    if (error) {
      console.error(error);
      toast({ title: 'Could not load vendors', description: error.message, variant: 'destructive' });
      setVendors([]);
    } else {
      const list = (data || []).map((row) => mapDbRowToVendorRow(row as Record<string, unknown>));
      const emailByUserId = await fetchOwnerEmailsForUserIds(list.map((v) => v.user_id));
      const enriched = list.map((v) => {
        const uid = v.user_id.trim();
        return {
          ...v,
          owner_email: uid ? emailByUserId.get(uid) ?? null : null,
        };
      });
      setVendors(enriched);
      setSelectedId((prev) => (prev && enriched.some((x) => x.id === prev) ? prev : enriched[0]?.id || ''));
    }
    setLoadingList(false);
  }, [toast]);

  const loadVendorDetail = useCallback(
    async (vendorId: string) => {
      if (!vendorId) return;

      const table = isVendorsSchema() ? 'vendors' : 'vendor_profiles';
      const { data: v, error: vErr } = await supabase.from(table).select('*').eq('id', vendorId).single();

      if (vErr || !v) {
        console.error(vErr);
        return;
      }

      const raw = v as Record<string, unknown>;
      const full = mapDbRowToVendorRow(raw);
      setLogoUrl(full.logo_url || '');
      setCoverUrl(full.cover_photo_url || '');
      setIsLive(full.is_live !== false);
      if (isVendorsSchema()) {
        setVendorZip(String(raw.zip ?? ''));
        setContactEmail(String(raw.contact_email ?? '').trim());
      } else {
        setVendorZip('');
        setContactEmail('');
      }
      setVendors((prev) =>
        prev.map((row) =>
          row.id === vendorId ? { ...row, ...full, owner_email: row.owner_email } : row
        )
      );

      const ordersAmountCol = isVendorsSchema() ? 'total_cents' : 'total';
      const [{ data: hData }, { data: lData }, countRes, totalsRes] = await Promise.all([
        supabase.from('vendor_hours').select('*').eq('vendor_id', vendorId).order('day_of_week'),
        supabase.from('business_licenses').select('*').eq('vendor_id', vendorId).limit(1).maybeSingle(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId),
        supabase.from('orders').select(ordersAmountCol).eq('vendor_id', vendorId),
      ]);

      const byDay = new Map<number, HourRow>();
      (hData as HourRow[] | null)?.forEach((r) => byDay.set(r.day_of_week, r));
      setHours(
        DAYS.map(({ d }) => {
          const row = byDay.get(d);
          return (
            row || {
              day_of_week: d,
              open_time: null,
              close_time: null,
              is_closed: true,
            }
          );
        })
      );

      if (lData) {
        const L = lData as LicenseRow;
        setLicenseId(L.id);
        setLicense({
          license_number: L.license_number,
          license_type: L.license_type,
          issuing_authority: L.issuing_authority || '',
          issue_date: L.issue_date || '',
          expiry_date: L.expiry_date || '',
          document_url: L.document_url || '',
          verification_status: L.verification_status,
        });
      } else if (isVendorsSchema() && raw.license_number) {
        setLicenseId(null);
        setLicense({
          license_number: String(raw.license_number),
          license_type: 'retail',
          issuing_authority: '',
          issue_date: '',
          expiry_date: '',
          document_url: '',
          verification_status: 'pending',
        });
      } else {
        setLicenseId(null);
        setLicense({
          license_number: '',
          license_type: 'retail',
          issuing_authority: '',
          issue_date: '',
          expiry_date: '',
          document_url: '',
          verification_status: 'pending',
        });
      }

      setOrderCount(countRes.count ?? 0);
      const tRows = totalsRes.data as Record<string, number>[] | null;
      setOrderRevenue(
        tRows?.reduce((s, r) => {
          if (isVendorsSchema()) {
            return s + Number(r.total_cents ?? 0) / 100;
          }
          return s + Number(r.total ?? 0);
        }, 0) ?? 0
      );
    },
    []
  );

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadVendors();
    }
  }, [authLoading, isAdmin, loadVendors]);

  useEffect(() => {
    if (!vendorFromUrl || !vendors.length) return;
    if (vendors.some((v) => v.id === vendorFromUrl)) {
      setSelectedId(vendorFromUrl);
    }
  }, [vendorFromUrl, vendors]);

  useEffect(() => {
    if (selectedId) {
      loadVendorDetail(selectedId);
    }
  }, [selectedId, loadVendorDetail]);

  useEffect(() => {
    if (!selectedId || !isVendorsSchema()) {
      setListingMarkets([]);
      setMarketApproved({});
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: mk }, { data: ops }] = await Promise.all([
        supabase.from('listing_markets').select('id,name,slug').order('sort_order'),
        supabase.from('vendor_market_operations').select('market_id,approved').eq('vendor_id', selectedId),
      ]);
      if (cancelled) return;
      setListingMarkets((mk || []) as { id: string; name: string; slug: string }[]);
      const ap: Record<string, boolean> = {};
      for (const row of (ops || []) as { market_id: string; approved: boolean }[]) {
        ap[row.market_id] = row.approved === true;
      }
      setMarketApproved(ap);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !isVendorsSchema()) {
      setMarkerQuotas([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('vendor_region_marker_quotas')
        .select('id, region_key, max_markers')
        .eq('vendor_id', selectedId)
        .order('region_key');
      if (cancelled) return;
      if (error) {
        console.warn('marker quotas:', error);
        setMarkerQuotas([]);
        return;
      }
      setMarkerQuotas((data || []) as { id: string; region_key: string; max_markers: number }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function saveMarkerQuota() {
    if (!selectedId || !isVendorsSchema()) return;
    const maxM = Math.min(99, Math.max(1, parseInt(quotaMaxMarkers, 10) || 1));
    const reg = quotaRegion.trim().toUpperCase().slice(0, 8);
    if (!reg) {
      toast({ title: 'Pick a region code', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('vendor_region_marker_quotas').upsert(
        {
          vendor_id: selectedId,
          region_key: reg,
          max_markers: maxM,
        },
        { onConflict: 'vendor_id,region_key' }
      );
      if (error) {
        toast({ title: 'Could not save quota', description: formatSupabaseError(error), variant: 'destructive' });
        return;
      }
      toast({ title: 'Marker quota saved', description: `${reg}: up to ${maxM} extra pins` });
      const { data } = await supabase
        .from('vendor_region_marker_quotas')
        .select('id, region_key, max_markers')
        .eq('vendor_id', selectedId)
        .order('region_key');
      setMarkerQuotas((data || []) as { id: string; region_key: string; max_markers: number }[]);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMarkerQuota(id: string) {
    setSaving(true);
    try {
      const { error } = await supabase.from('vendor_region_marker_quotas').delete().eq('id', id);
      if (error) {
        toast({ title: 'Could not delete', description: formatSupabaseError(error), variant: 'destructive' });
        return;
      }
      setMarkerQuotas((prev) => prev.filter((q) => q.id !== id));
      toast({ title: 'Quota removed', description: 'Default limit (1 per region) applies again.' });
    } finally {
      setSaving(false);
    }
  }

  function formatSupabaseError(err: { message?: string; hint?: string; code?: string; details?: string } | null) {
    if (!err) return 'Unknown error';
    return [err.message, err.details, err.hint].filter(Boolean).join(' — ') || err.code || 'Unknown error';
  }

  async function setMarketApproval(marketId: string, approved: boolean) {
    if (!selectedId || !isVendorsSchema()) return;
    setSaving(true);
    try {
      const { data: existing, error: selErr } = await supabase
        .from('vendor_market_operations')
        .select('id')
        .eq('vendor_id', selectedId)
        .eq('market_id', marketId)
        .maybeSingle();

      if (selErr) {
        toast({
          title: 'Could not load market row',
          description: formatSupabaseError(selErr),
          variant: 'destructive',
        });
        return;
      }

      if (existing?.id) {
        const { error } = await supabase
          .from('vendor_market_operations')
          .update({ approved })
          .eq('id', existing.id);
        if (error) {
          toast({
            title: 'Could not update market',
            description: formatSupabaseError(error),
            variant: 'destructive',
          });
          return;
        }
      } else {
        const { error: insErr } = await supabase.from('vendor_market_operations').insert({
          vendor_id: selectedId,
          market_id: marketId,
          approved,
        });
        if (insErr?.code === '23505') {
          const { error: upAfterDup } = await supabase
            .from('vendor_market_operations')
            .update({ approved })
            .eq('vendor_id', selectedId)
            .eq('market_id', marketId);
          if (upAfterDup) {
            toast({
              title: 'Could not update market',
              description: formatSupabaseError(upAfterDup),
              variant: 'destructive',
            });
            return;
          }
        } else if (insErr) {
          toast({
            title: 'Could not add market',
            description: formatSupabaseError(insErr),
            variant: 'destructive',
          });
          return;
        }
      }

      setMarketApproved((prev) => ({ ...prev, [marketId]: approved }));
      toast({
        title: approved ? 'Market enabled' : 'Market disabled',
        description: approved
          ? marketplaceCopy.adminMarketApprovedDescription
          : 'Removed from this zone until turned on again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!selectedId) return;
    setSaving(true);
    const table = isVendorsSchema() ? 'vendors' : 'vendor_profiles';
    const zipDigits = vendorZip.replace(/\D/g, '').slice(0, 5);
    if (isVendorsSchema() && zipDigits.length !== 5) {
      toast({
        title: 'ZIP required',
        description: 'Enter a 5-digit US ZIP so operating areas and Smokers Club mapping work.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    const payload = isVendorsSchema()
      ? {
          logo_url: logoUrl || null,
          banner_url: coverUrl || null,
          is_live: isLive,
          zip: zipDigits,
          contact_email: contactEmail.trim() || null,
        }
      : {
          logo_url: logoUrl || null,
          cover_photo_url: coverUrl || null,
          is_live: isLive,
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from(table).update(payload).eq('id', selectedId);

    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Vendor profile updated' });
    loadVendors();
  }

  async function saveLicense() {
    if (!selectedId) return;
    setSaving(true);
    const payload = {
      vendor_id: selectedId,
      license_number: license.license_number || 'TBD',
      license_type: license.license_type || 'retail',
      issuing_authority: license.issuing_authority || null,
      issue_date: license.issue_date || null,
      expiry_date: license.expiry_date || null,
      document_url: license.document_url || null,
      verification_status: license.verification_status || 'pending',
      updated_at: new Date().toISOString(),
    };

    let error;
    if (licenseId) {
      const res = await supabase.from('business_licenses').update(payload).eq('id', licenseId);
      error = res.error;
    } else {
      const res = await supabase.from('business_licenses').insert(payload).select('id').single();
      error = res.error;
      if (!error && res.data?.id) setLicenseId(res.data.id);
    }

    setSaving(false);
    if (error) {
      toast({ title: 'License save failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (isVendorsSchema() && license.license_number) {
      await supabase
        .from('vendors')
        .update({ license_number: license.license_number })
        .eq('id', selectedId);
    }
    toast({ title: 'License saved' });
  }

  async function saveHours() {
    if (!selectedId) return;
    setSaving(true);
    const rows = hours.map((h) => ({
      vendor_id: selectedId,
      day_of_week: h.day_of_week,
      open_time: h.is_closed ? null : fromTimeInput(toTimeInput(h.open_time) || '09:00'),
      close_time: h.is_closed ? null : fromTimeInput(toTimeInput(h.close_time) || '17:00'),
      is_closed: h.is_closed,
    }));

    const { error } = await supabase.from('vendor_hours').upsert(rows, {
      onConflict: 'vendor_id,day_of_week',
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Hours save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Hours saved' });
  }

  async function setVendorLive(vendorId: string, nextLive: boolean) {
    setSaving(true);
    try {
      if (isVendorsSchema()) {
        const { error } = await supabase
          .from('vendors')
          .update({ is_live: nextLive })
          .eq('id', vendorId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_profiles')
          .update({ is_live: nextLive })
          .eq('id', vendorId);
        if (error) throw error;
      }

      setVendors((prev) => prev.map((row) => (row.id === vendorId ? { ...row, is_live: nextLive } : row)));
      if (vendorId === selectedId) setIsLive(nextLive);

      toast({ title: nextLive ? 'Vendor is now live' : 'Vendor is now hidden' });
    } catch (e: any) {
      toast({ title: 'Live toggle failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorSmokersClub(vendorId: string, nextEligible: boolean) {
    if (!isVendorsSchema()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ smokers_club_eligible: nextEligible })
        .eq('id', vendorId);
      if (error) throw error;
      setVendors((prev) =>
        prev.map((row) => (row.id === vendorId ? { ...row, smokers_club_eligible: nextEligible } : row))
      );
      toast({
        title: nextEligible ? 'Smokers Club eligible' : 'Removed from Smokers Club',
        description: nextEligible
          ? 'Shop can be placed on the treehouse and appears in admin slot pickers.'
          : 'Shop is excluded from Smokers Club until turned on again.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Smokers Club toggle failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorOnlineMenu(vendorId: string, nextEnabled: boolean) {
    if (!isVendorsSchema()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ online_menu_enabled: nextEnabled })
        .eq('id', vendorId);
      if (error) throw error;
      setVendors((prev) =>
        prev.map((row) => (row.id === vendorId ? { ...row, online_menu_enabled: nextEnabled } : row))
      );
      toast({
        title: nextEnabled ? 'Online menu on' : 'Online menu off',
        description: nextEnabled
          ? 'Customers see the product menu and can check out on the site.'
          : 'Listing shows contact info only; cart and checkout are disabled for this shop.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Menu toggle failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorLanes(
    vendorId: string,
    nextOffersDelivery: boolean,
    nextOffersStorefront: boolean
  ) {
    if (!isVendorsSchema()) return;
    if (!nextOffersDelivery && !nextOffersStorefront) {
      toast({
        title: 'Select a lane',
        description: 'A live vendor must be delivery and/or storefront.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          offers_delivery: nextOffersDelivery,
          offers_storefront: nextOffersStorefront,
        })
        .eq('id', vendorId);
      if (error) throw error;

      setVendors((prev) =>
        prev.map((row) =>
          row.id === vendorId
            ? { ...row, offers_delivery: nextOffersDelivery, offers_storefront: nextOffersStorefront }
            : row
        )
      );

      toast({ title: 'Lane options updated' });
    } catch (e: unknown) {
      toast({
        title: 'Lane update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loadingList) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="max-w-md border-red-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-white">Access denied</h1>
          <p className="text-gray-400">Admin tools are only available to platform administrators.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-brand-red/25 bg-gradient-to-b from-red-950/40 to-black">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-2 text-sm text-brand-lime-soft hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin home
          </Link>
          <h1 className="text-3xl font-bold md:text-4xl">Vendor control</h1>
          <p className="mt-2 max-w-2xl text-gray-400">{marketplaceCopy.adminVendorPageLead}</p>
          {isVendorsSchema() && (
            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              <span className="text-gray-400">{linkedOwnerCount} linked</span> (shop has a login owner) ·{' '}
              <span className="text-amber-200/80">{unclaimedCount} unclaimed</span> (no user yet — link in{' '}
              <Link href="/admin/dispensaries" className="text-brand-lime-soft underline hover:text-white">
                Dispensary admin
              </Link>
              ).
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-gray-300">Search shops &amp; owners</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-gray-800 bg-gray-950 text-white"
                placeholder="Name, owner email, user UUID, or ZIP…"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:pb-0.5">
              <Button
                type="button"
                variant={ownerFilter === 'all' ? 'default' : 'outline'}
                className={
                  ownerFilter === 'all'
                    ? 'bg-brand-red hover:bg-brand-red-deep'
                    : 'border-brand-red/40 text-white hover:bg-brand-red/10'
                }
                onClick={() => setOwnerFilter('all')}
              >
                All
              </Button>
              <Button
                type="button"
                variant={ownerFilter === 'linked' ? 'default' : 'outline'}
                className={
                  ownerFilter === 'linked'
                    ? 'bg-brand-red hover:bg-brand-red-deep'
                    : 'border-brand-red/40 text-white hover:bg-brand-red/10'
                }
                onClick={() => setOwnerFilter('linked')}
              >
                <UserRound className="mr-1.5 h-4 w-4" />
                Linked owner
              </Button>
              <Button
                type="button"
                variant={ownerFilter === 'unclaimed' ? 'default' : 'outline'}
                className={
                  ownerFilter === 'unclaimed'
                    ? 'bg-amber-700 hover:bg-amber-800'
                    : 'border-amber-600/50 text-amber-100 hover:bg-amber-950/50'
                }
                onClick={() => setOwnerFilter('unclaimed')}
              >
                <UserRoundX className="mr-1.5 h-4 w-4" />
                Unclaimed
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {isVendorsSchema() && (
                <Button
                  asChild
                  variant="outline"
                  className="border-brand-lime/40 text-brand-lime-soft hover:bg-brand-lime/10"
                >
                  <Link href="/admin/dispensaries">Link user to shop</Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="border-brand-red/40 text-white hover:bg-brand-red/10"
                onClick={() => loadVendors()}
                disabled={loadingList}
              >
                Refresh list
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {!selectedId || !selected ? (
          <p className="text-gray-500">No vendors in database yet.</p>
        ) : (
          <>
            <div className="mt-2">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-400">
                  Showing {filteredVendors.length} vendor{filteredVendors.length === 1 ? '' : 's'}
                  {vendors.length > 0 && (
                    <span className="text-gray-500">
                      {' '}
                      · {vendors.length} loaded from database
                      {vendors.length >= SUPABASE_LIST_PAGE_SIZE ? ' (loaded via multi-page fetch)' : ''}
                    </span>
                  )}
                </p>
                {!isVendorsSchema() && (
                  <p className="text-xs text-amber-200/90">
                    Smokers Club toggles use <code className="text-amber-100">public.vendors</code>. Set{' '}
                    <code className="text-amber-100">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code> in{' '}
                    <code className="text-amber-100">.env.local</code> and restart the dev server.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map((v) => {
                  const isSelected = v.id === selectedId;
                  const isChecked = v.is_live !== false;
                  return (
                    <Card
                      key={v.id}
                      className={`relative overflow-hidden border-gray-800 bg-gray-950/40 p-4 transition-all ${
                        isSelected ? 'ring-1 ring-brand-red/60' : 'hover:ring-1 hover:ring-brand-red/20'
                      }`}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 z-0"
                        aria-label={`Select ${v.business_name}`}
                        onClick={() => setSelectedId(v.id)}
                      />

                      <div className="relative z-10 flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
                          {v.logo_url ? (
                            <img src={v.logo_url} alt={v.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <BarChart3 className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-white truncate">{v.business_name}</p>
                            {v.user_id.trim().length > 0 ? (
                              <Badge className="shrink-0 border-green-600/40 bg-green-950/60 text-green-300">
                                Linked
                              </Badge>
                            ) : (
                              <Badge className="shrink-0 border-amber-600/40 bg-amber-950/40 text-amber-200">
                                Unclaimed
                              </Badge>
                            )}
                          </div>
                          {v.user_id.trim().length > 0 ? (
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                              {v.owner_email ? (
                                <p className="truncate text-gray-400" title={v.owner_email}>
                                  {v.owner_email}
                                </p>
                              ) : null}
                              <p className="truncate font-mono text-[11px] text-gray-500" title={v.user_id}>
                                {v.user_id}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-amber-200/80">No owner login — use Dispensary admin to link</p>
                          )}
                          {isVendorsSchema() && !extractZip5(v.zip || '') && (
                            <p className="mt-1 text-xs text-amber-400">ZIP required — set in Live & photos</p>
                          )}
                          <div
                            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Live</span>
                              <Switch checked={isChecked} onCheckedChange={(next) => setVendorLive(v.id, next)} />
                            </div>
                            {isVendorsSchema() && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Smokers Club</span>
                                <Switch
                                  checked={v.smokers_club_eligible === true}
                                  onCheckedChange={(next) => setVendorSmokersClub(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {isVendorsSchema() && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Online menu</span>
                                <Switch
                                  checked={v.online_menu_enabled !== false}
                                  onCheckedChange={(next) => setVendorOnlineMenu(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {isVendorsSchema() && (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Delivery</span>
                                  <Switch
                                    checked={v.offers_delivery === true}
                                    onCheckedChange={(next) =>
                                      setVendorLanes(
                                        v.id,
                                        next,
                                        v.offers_storefront === true
                                      )
                                    }
                                    disabled={saving}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Storefront</span>
                                  <Switch
                                    checked={v.offers_storefront === true}
                                    onCheckedChange={(next) =>
                                      setVendorLanes(
                                        v.id,
                                        v.offers_delivery === true,
                                        next
                                      )
                                    }
                                    disabled={saving}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-800 text-white hover:bg-white/5 h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedId(v.id);
                            setActiveTab('analytics');
                          }}
                          disabled={saving}
                        >
                          Analytics
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-800 text-white hover:bg-white/5 h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedId(v.id);
                            setActiveTab('profile');
                          }}
                          disabled={saving}
                        >
                          Photos
                        </Button>
                        {isVendorsSchema() && (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-brand-lime/35 text-brand-lime-soft hover:bg-brand-lime/10 h-8 px-3 text-xs"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/vendor/menu?vendor=${encodeURIComponent(v.id)}`}>
                              <UtensilsCrossed className="mr-1 inline h-3.5 w-3.5" />
                              Menu
                            </Link>
                          </Button>
                        )}
                        {isVendorsSchema() && (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-800 text-white hover:bg-white/5 h-8 px-3 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedId(v.id);
                              setActiveTab('areas');
                            }}
                            disabled={saving}
                          >
                            Areas
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-800 text-white hover:bg-white/5 h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedId(v.id);
                            setActiveTab('license');
                          }}
                          disabled={saving}
                        >
                          License
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-800 text-white hover:bg-white/5 h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedId(v.id);
                            setActiveTab('hours');
                          }}
                          disabled={saving}
                        >
                          Hours
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
            <TabsList className="flex w-full flex-wrap border border-brand-red/20 bg-gray-950/80">
              <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-red/30">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
              {isVendorsSchema() && (
                <TabsTrigger value="areas" className="data-[state=active]:bg-brand-red/30">
                  <MapPin className="mr-2 h-4 w-4" />
                  Areas
                </TabsTrigger>
              )}
              <TabsTrigger value="profile" className="data-[state=active]:bg-brand-red/30">
                <ImageIcon className="mr-2 h-4 w-4" />
                Live & photos
              </TabsTrigger>
              <TabsTrigger value="license" className="data-[state=active]:bg-brand-red/30">
                <FileBadge className="mr-2 h-4 w-4" />
                License
              </TabsTrigger>
              <TabsTrigger value="hours" className="data-[state=active]:bg-brand-red/30">
                <Clock className="mr-2 h-4 w-4" />
                Hours
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <Card className="border-brand-red/20 bg-gray-950/50 p-6">
                <div className="mb-6 flex items-center gap-2 text-brand-lime-soft">
                  <Building2 className="h-5 w-5" />
                  <span className="text-lg font-semibold">{selected.business_name}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-sm text-gray-400">{selected.approval_status}</span>
                </div>

                <div className="mb-6 rounded-xl border border-gray-800 bg-black/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Shop owner (login)</p>
                  {selected.user_id.trim().length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {selected.owner_email ? (
                        <p className="text-sm font-medium text-white">{selected.owner_email}</p>
                      ) : (
                        <p className="text-sm text-gray-500">No email on profile (check Supabase Auth user).</p>
                      )}
                      <p className="break-all font-mono text-xs text-gray-400">{selected.user_id}</p>
                      <p className="text-xs text-gray-500">
                        This account can open the vendor dashboard for this dispensary.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-amber-200/90">
                        Unclaimed — no login linked. The shop may be directory-only until you attach an owner.
                      </p>
                      {isVendorsSchema() ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="mt-3 border-amber-600/50 text-amber-100 hover:bg-amber-950/50"
                        >
                          <Link href="/admin/dispensaries">Link a user in Dispensary admin</Link>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Orders (all time)', value: orderCount ?? '—' },
                    { label: 'Order total ($)', value: orderRevenue != null ? orderRevenue.toFixed(2) : '—' },
                    { label: 'Profile views', value: selected.profile_views ?? 0 },
                    { label: 'Listing views', value: selected.listing_views ?? 0 },
                    { label: 'Deal clicks', value: selected.deal_clicks ?? 0 },
                    { label: 'Phone clicks', value: selected.phone_clicks ?? 0 },
                    { label: 'Direction clicks', value: selected.direction_clicks ?? 0 },
                    { label: 'Website clicks', value: selected.website_clicks ?? 0 },
                    { label: 'Avg rating', value: selected.average_rating ?? '—' },
                    { label: 'Reviews', value: selected.total_reviews ?? 0 },
                    { label: 'Products', value: selected.total_products ?? 0 },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border border-gray-800 bg-black/40 px-4 py-3"
                    >
                      <div className="text-xs uppercase tracking-wide text-gray-500">{m.label}</div>
                      <div className="mt-1 text-2xl font-bold text-white">{m.value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {isVendorsSchema() && (
              <TabsContent value="areas" className="space-y-6">
                <Card className="border-brand-red/20 bg-gray-950/50 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Operating areas</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Turn zones on so this shop can be used in Smokers Club and regional placements for that market.
                      Saving a valid ZIP creates a <span className="text-gray-300">pending</span> row for the matching
                      zone — you still approve it here. Multiple zones are allowed.
                    </p>
                  </div>
                  <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                    {listingMarkets.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{m.name}</p>
                          <p className="truncate text-xs text-gray-500">{m.slug}</p>
                        </div>
                        <Switch
                          checked={marketApproved[m.id] === true}
                          onCheckedChange={(next) => setMarketApproval(m.id, next)}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border-brand-red/20 bg-gray-950/50 p-6">
                  <div className="mb-4 flex flex-wrap items-start gap-2">
                    <MapPin className="mt-0.5 h-5 w-5 text-brand-red" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">Map marker quotas (per state)</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Vendors can add multiple pins in <code className="text-gray-300">vendor_locations</code> per
                        region. Without a row here, the default is <span className="text-white">1</span> extra marker per
                        state. Set higher caps for busy delivery zones.
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap items-end gap-3">
                    <div>
                      <Label className="text-gray-400">State / region code</Label>
                      <Select value={quotaRegion} onValueChange={setQuotaRegion}>
                        <SelectTrigger className="mt-1 w-[200px] border-gray-800 bg-black text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 border-gray-800 bg-gray-950 text-white">
                          {US_STATE_OPTIONS.map((s) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400">Max extra markers</Label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={quotaMaxMarkers}
                        onChange={(e) => setQuotaMaxMarkers(e.target.value)}
                        className="mt-1 w-[120px] border-gray-800 bg-black text-white"
                      />
                    </div>
                    <Button
                      type="button"
                      className="bg-brand-red hover:bg-brand-red-deep"
                      disabled={saving || !selectedId}
                      onClick={saveMarkerQuota}
                    >
                      Save quota
                    </Button>
                  </div>
                  {markerQuotas.length === 0 ? (
                    <p className="text-sm text-gray-500">No custom quotas — default 1 per state applies.</p>
                  ) : (
                    <ul className="space-y-2">
                      {markerQuotas.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black/40 px-3 py-2"
                        >
                          <span className="font-mono text-white">{q.region_key}</span>
                          <span className="text-sm text-gray-400">up to {q.max_markers} markers</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-gray-300"
                            disabled={saving}
                            onClick={() => deleteMarkerQuota(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </TabsContent>
            )}

            <TabsContent value="profile">
              <Card className="space-y-6 border-brand-red/20 bg-gray-950/50 p-6">
                {isVendorsSchema() && (
                  <div className="space-y-2">
                    <Label htmlFor="vendor-zip" className="text-white">
                      Store ZIP (required)
                    </Label>
                    <Input
                      id="vendor-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={10}
                      value={vendorZip}
                      onChange={(e) => setVendorZip(e.target.value)}
                      className="border-gray-800 bg-black text-white"
                      placeholder="90210"
                    />
                    <p className="text-xs text-gray-500">
                      5-digit ZIP maps a default market row (pending) via migration 0026. Approve zones in the Areas tab.
                    </p>
                  </div>
                )}
                {isVendorsSchema() && (
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-white">
                      Public contact email (optional)
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="border-gray-800 bg-black text-white"
                      placeholder="orders@dispensary.com"
                    />
                    <p className="text-xs text-gray-500">
                      Shown on the listing when online menu is off. Save with Live &amp; photos below.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-white">Live on marketplace</Label>
                    <p className="text-sm text-gray-500">
                      When off, this vendor is hidden from Discover, Map, and strain product lists (still approved).
                    </p>
                  </div>
                  <Switch checked={isLive} onCheckedChange={setIsLive} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo image URL</Label>
                  <Input
                    id="logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="border-gray-800 bg-black text-white"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover">Cover photo URL</Label>
                  <Input
                    id="cover"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="border-gray-800 bg-black text-white"
                    placeholder="https://..."
                  />
                </div>
                <Button
                  className="bg-brand-red hover:bg-brand-red-deep"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save live & photos'}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="license">
              <Card className="space-y-4 border-brand-red/20 bg-gray-950/50 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cannabis license number (LIC)</Label>
                    <Input
                      value={license.license_number || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, license_number: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                      placeholder="State cannabis regulatory license / LIC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>License type</Label>
                    <Input
                      value={license.license_type || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, license_type: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing authority</Label>
                    <Input
                      value={license.issuing_authority || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, issuing_authority: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verification status</Label>
                    <Select
                      value={license.verification_status || 'pending'}
                      onValueChange={(v: string) => setLicense((p) => ({ ...p, verification_status: v }))}
                    >
                      <SelectTrigger className="border-gray-800 bg-black text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-950 text-white">
                        {['pending', 'verified', 'rejected', 'expired'].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue date</Label>
                    <Input
                      type="date"
                      value={license.issue_date?.slice(0, 10) || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, issue_date: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={license.expiry_date?.slice(0, 10) || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, expiry_date: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Document URL</Label>
                    <Input
                      value={license.document_url || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, document_url: e.target.value }))}
                      className="border-gray-800 bg-black text-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <Button
                  className="bg-brand-red hover:bg-brand-red-deep"
                  onClick={saveLicense}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save license'}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="hours">
              <Card className="space-y-4 border-brand-red/20 bg-gray-950/50 p-6">
                <p className="text-sm text-gray-400">
                  Uses <code className="text-brand-lime-soft">vendor_hours</code> (one row per day).
                </p>
                <div className="space-y-4">
                  {DAYS.map(({ d, label }) => {
                    const row = hours.find((h) => h.day_of_week === d)!;
                    const idx = hours.findIndex((h) => h.day_of_week === d);
                    return (
                      <div
                        key={d}
                        className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-black/40 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="w-32 font-medium text-white">{label}</div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!row.is_closed}
                            onCheckedChange={(on) => {
                              const next = [...hours];
                              next[idx] = { ...row, is_closed: !on };
                              setHours(next);
                            }}
                          />
                          <span className="text-sm text-gray-400">{row.is_closed ? 'Closed' : 'Open'}</span>
                        </div>
                        {!row.is_closed && (
                          <div className="flex flex-1 flex-wrap gap-3">
                            <Input
                              type="time"
                              value={toTimeInput(row.open_time)}
                              onChange={(e) => {
                                const next = [...hours];
                                next[idx] = { ...row, open_time: fromTimeInput(e.target.value) };
                                setHours(next);
                              }}
                              className="w-36 border-gray-800 bg-black text-white"
                            />
                            <span className="self-center text-gray-500">to</span>
                            <Input
                              type="time"
                              value={toTimeInput(row.close_time)}
                              onChange={(e) => {
                                const next = [...hours];
                                next[idx] = { ...row, close_time: fromTimeInput(e.target.value) };
                                setHours(next);
                              }}
                              className="w-36 border-gray-800 bg-black text-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  className="bg-brand-red hover:bg-brand-red-deep"
                  onClick={saveHours}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save hours'}
                </Button>
              </Card>
            </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
