'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logAdminAuditEvent } from '@/lib/adminAuditLog';
import { supabase } from '@/lib/supabase';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { useAdminWorkspaceRegion } from '@/contexts/AdminRegionContext';
import { marketplaceCopy } from '@/lib/marketplaceCopy';
import { listingHrefForVendor } from '@/lib/listingPath';
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
  Award,
  BarChart3,
  Building2,
  Clock,
  FileBadge,
  ImageIcon,
  Loader2,
  MapPin,
  Search,
  Trash2,
  UtensilsCrossed,
  UserRound,
  UserRoundX,
  UserX,
} from 'lucide-react';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import {
  adminVendorPublicServiceModeBadgeClassName,
  adminVendorPublicServiceModeBadges,
  normalizeAdminVendorServiceMode,
  type AdminVendorServiceMode,
} from '@/lib/vendorStorefrontDelivery';
import {
  fetchPendingServiceModeRequestsForAdmin,
  type AdminServiceModeRequestListRow,
} from '@/lib/vendorServiceModeRequest';
import {
  mapboxGeocodeAddress,
  mapboxTokenForGeocode,
  vendorProfileGeocodeQuery,
} from '@/lib/mapGeocode';

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
  /** CannaHub `vendors.map_visible_override` */
  map_visible_override?: boolean;
  /** CannaHub — public menu + online ordering when true */
  online_menu_enabled?: boolean;
  zip?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  offers_delivery?: boolean;
  offers_storefront?: boolean;
  allow_both_storefront_and_delivery?: boolean;
  /** CannaHub `vendors.admin_service_mode` */
  admin_service_mode?: AdminVendorServiceMode | string | null;
  /** When true, address edits do not re-derive public lanes unless admins unlock or change overrides. */
  service_mode_locked?: boolean;
  /** Filled from `profiles` for admins — login email for linked owner */
  owner_email?: string | null;
  /** Smokers Club tree card backdrop */
  smokers_club_tab_background_url?: string | null;
  /** CannaHub `vendors.slug` */
  slug?: string | null;
  /** Admin: allow vendor deal editor to use clock times + daily windows */
  deal_datetime_scheduling_enabled?: boolean;
  /** Admin cap on extra map rows (`vendor_locations`). */
  extra_map_pins_allowed?: number;
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

function mapDbRowToVendorRow(v: Record<string, unknown>, useVendorsTable: boolean): VendorRow {
  if (useVendorsTable) {
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
      map_visible_override: v.map_visible_override === true,
      online_menu_enabled: vendorRowPublicMenuEnabled(v),
      address: (v.address as string | null) ?? null,
      city: (v.city as string | null) ?? null,
      state: (v.state as string | null) ?? null,
      offers_delivery: v.offers_delivery === true,
      offers_storefront: v.offers_storefront === true,
      allow_both_storefront_and_delivery: v.allow_both_storefront_and_delivery === true,
      admin_service_mode: normalizeAdminVendorServiceMode(v.admin_service_mode),
      service_mode_locked: v.service_mode_locked !== false,
      zip: (v.zip as string | null) ?? null,
      owner_email: null,
      slug: (v.slug as string | null) ?? null,
      deal_datetime_scheduling_enabled: v.deal_datetime_scheduling_enabled === true,
      extra_map_pins_allowed:
        typeof v.extra_map_pins_allowed === 'number' && Number.isFinite(v.extra_map_pins_allowed)
          ? Math.max(0, Math.min(500, Math.floor(v.extra_map_pins_allowed)))
          : 0,
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
    map_visible_override: false,
    online_menu_enabled: true,
    address: null,
    city: null,
    state: null,
    admin_service_mode: 'auto',
    service_mode_locked: true,
    offers_delivery: true,
    offers_storefront: true,
    zip: null,
    owner_email: null,
    slug: (v.slug as string | null) ?? null,
    deal_datetime_scheduling_enabled: false,
    extra_map_pins_allowed: 0,
  };
}

export default function AdminVendorsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const vendorFromUrl = searchParams.get('vendor');
  const licenseExpiringSoonUrl = searchParams.get('licenseExpiringSoon') === '1';

  const clearLicenseExpiringSoonFilter = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('licenseExpiringSoon');
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [pathname, router, searchParams]);

  const { loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const vendorsSchema = useVendorsSchema();
  const { region: workspaceRegion } = useAdminWorkspaceRegion();

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'linked' | 'unclaimed'>('all');
  /** When `smokers_only`, list only `smokers_club_eligible` shops (CannaHub vendors schema). */
  const [clubListFilter, setClubListFilter] = useState<'all' | 'smokers_only'>('all');
  const [activeTab, setActiveTab] = useState<'analytics' | 'areas' | 'profile' | 'license' | 'hours'>('analytics');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(60);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [clubTabBgUrl, setClubTabBgUrl] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [vendorZip, setVendorZip] = useState('');
  const [vendorStreet, setVendorStreet] = useState('');
  const [vendorCity, setVendorCity] = useState('');
  const [vendorState, setVendorState] = useState('');
  const [storedMapPoint, setStoredMapPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [syncingMapPin, setSyncingMapPin] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [listingMarkets, setListingMarkets] = useState<
    { id: string; name: string; slug: string; region_key?: string | null }[]
  >([]);
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
  const [feedShadowbanned, setFeedShadowbanned] = useState(false);
  const [savingShadowban, setSavingShadowban] = useState(false);
  const [unlinkingOwner, setUnlinkingOwner] = useState(false);

  const [serviceModeQueue, setServiceModeQueue] = useState<AdminServiceModeRequestListRow[]>([]);
  const [extraLocationRowCount, setExtraLocationRowCount] = useState(0);
  const [extraPinsAllowedDraft, setExtraPinsAllowedDraft] = useState('0');

  const selected = vendors.find((v) => v.id === selectedId);

  useEffect(() => {
    if (!selected) {
      setExtraPinsAllowedDraft('0');
      return;
    }
    const v =
      typeof selected.extra_map_pins_allowed === 'number' && Number.isFinite(selected.extra_map_pins_allowed)
        ? selected.extra_map_pins_allowed
        : 0;
    setExtraPinsAllowedDraft(String(v));
  }, [selected?.id, selected?.extra_map_pins_allowed]);

  const { linkedOwnerCount, unclaimedCount } = useMemo(() => {
    let linked = 0;
    let unclaimed = 0;
    for (const v of vendors) {
      if (v.user_id.trim().length > 0) linked++;
      else unclaimed++;
    }
    return { linkedOwnerCount: linked, unclaimedCount: unclaimed };
  }, [vendors]);

  const filteredVendors = vendors;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 280);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, ownerFilter, clubListFilter, workspaceRegion, licenseExpiringSoonUrl]);

  const loadVendors = useCallback(async () => {
    setLoadingList(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({
          title: 'Sign in required',
          description: 'Sign in again, then refresh vendor admin.',
          variant: 'destructive',
        });
        setVendors([]);
        return;
      }

      const u = new URL('/api/admin/vendors-list', window.location.origin);
      u.searchParams.set('q', debouncedSearch);
      u.searchParams.set('owner', ownerFilter);
      u.searchParams.set('club', clubListFilter);
      u.searchParams.set('page', String(page));
      u.searchParams.set('pageSize', String(pageSize));
      u.searchParams.set('region', workspaceRegion);
      if (licenseExpiringSoonUrl) u.searchParams.set('licenseExpiringSoon', '1');

      const res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        vendors?: Record<string, unknown>[];
        vendorsSchema?: boolean;
        ownerEmailByUserId?: Record<string, string>;
        page?: number;
        pageSize?: number;
        totalCount?: number;
      };

      if (!res.ok) {
        console.error(j.error || res.statusText);
        toast({
          title: 'Could not load vendors',
          description: typeof j.error === 'string' ? j.error : res.statusText,
          variant: 'destructive',
        });
        setVendors([]);
        return;
      }

      const rows = j.vendors || [];
      const schemaFlag = j.vendorsSchema === true;

      const emailMap = new Map<string, string>(Object.entries(j.ownerEmailByUserId || {}));
      const list = rows.map((row) => mapDbRowToVendorRow(row, schemaFlag));
      const enriched = list.map((v) => {
        const uid = v.user_id.trim();
        return {
          ...v,
          owner_email: uid ? emailMap.get(uid) ?? null : null,
        };
      });
      setVendors(enriched);
      setTotalCount(typeof j.totalCount === 'number' ? j.totalCount : enriched.length);
      setSelectedId((prev) => (prev && enriched.some((x) => x.id === prev) ? prev : enriched[0]?.id || ''));
      if (schemaFlag) {
        try {
          setServiceModeQueue(await fetchPendingServiceModeRequestsForAdmin());
        } catch {
          setServiceModeQueue([]);
        }
      } else {
        setServiceModeQueue([]);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load vendors',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setVendors([]);
    } finally {
      setLoadingList(false);
    }
  }, [toast, debouncedSearch, ownerFilter, clubListFilter, page, pageSize, workspaceRegion, licenseExpiringSoonUrl]);

  const loadVendorDetail = useCallback(
    async (vendorId: string) => {
      if (!vendorId) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      let raw: Record<string, unknown> | null = null;
      let schemaForRow = vendorsSchema;
      let mapPointFromApi: { lat: number; lng: number } | null = null;

      if (token) {
        const res = await fetch(
          `/api/admin/vendor-record?vendor_id=${encodeURIComponent(vendorId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const j = (await res.json().catch(() => ({}))) as {
          vendor?: Record<string, unknown>;
          vendorsSchema?: boolean;
          map_point?: unknown;
        };
        if (res.ok && j.vendor && typeof j.vendor === 'object') {
          raw = j.vendor;
          if (typeof j.vendorsSchema === 'boolean') schemaForRow = j.vendorsSchema;
          const mp = j.map_point;
          if (mp && typeof mp === 'object' && !Array.isArray(mp)) {
            const o = mp as Record<string, unknown>;
            const plat = Number(o.lat);
            const plng = Number(o.lng);
            if (Number.isFinite(plat) && Number.isFinite(plng)) {
              mapPointFromApi = { lat: plat, lng: plng };
            }
          }
        }
      }

      if (!raw) {
        const table = vendorsSchema ? 'vendors' : 'vendor_profiles';
        const { data: v, error: vErr } = await supabase.from(table).select('*').eq('id', vendorId).single();
        if (vErr || !v) {
          console.error(vErr);
          return;
        }
        raw = v as Record<string, unknown>;
        schemaForRow = vendorsSchema;
      }

      const full = mapDbRowToVendorRow(raw, schemaForRow);
      setLogoUrl(full.logo_url || '');
      setCoverUrl(full.cover_photo_url || '');
      setClubTabBgUrl(
        schemaForRow
          ? String((raw as Record<string, unknown>).smokers_club_tab_background_url ?? '').trim()
          : ''
      );
      setIsLive(full.is_live !== false);
      if (schemaForRow) {
        setVendorZip(String(raw.zip ?? ''));
        setContactEmail(String(raw.contact_email ?? '').trim());
        setVendorStreet(String(raw.address ?? '').trim());
        setVendorCity(String(raw.city ?? '').trim());
        setVendorState(String(raw.state ?? '').trim().slice(0, 2).toUpperCase());
        setStoredMapPoint(mapPointFromApi);
      } else {
        setVendorZip('');
        setContactEmail('');
        setVendorStreet('');
        setVendorCity('');
        setVendorState('');
        setStoredMapPoint(null);
      }
      setVendors((prev) =>
        prev.map((row) =>
          row.id === vendorId ? { ...row, ...full, owner_email: row.owner_email } : row
        )
      );

      const ordersAmountCol = schemaForRow ? 'total_cents' : 'total';
      const [{ data: hData }, { data: lData }, countRes, totalsRes] = await Promise.all([
        supabase.from('vendor_hours').select('*').eq('vendor_id', vendorId).order('day_of_week'),
        supabase.from('business_licenses').select('*').eq('vendor_id', vendorId).limit(1).maybeSingle(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', vendorId),
        supabase.from('orders').select(ordersAmountCol).eq('vendor_id', vendorId),
      ]);
      let locCount = 0;
      if (schemaForRow) {
        const { count } = await supabase
          .from('vendor_locations')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId);
        locCount = count ?? 0;
      }
      setExtraLocationRowCount(locCount);

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
      } else if (schemaForRow && raw.license_number) {
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
          if (schemaForRow) {
            return s + Number(r.total_cents ?? 0) / 100;
          }
          return s + Number(r.total ?? 0);
        }, 0) ?? 0
      );
    },
    [vendorsSchema]
  );

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadVendors();
    }
  }, [authLoading, isAdmin, loadVendors]);

  const vendorListUrlKey = searchParams.toString();
  useEffect(() => {
    const sp = new URLSearchParams(vendorListUrlKey);
    const wantSmokersOnly = sp.get('smokersClub') === '1' || sp.get('filter') === 'smokers-club';
    setClubListFilter(wantSmokersOnly ? 'smokers_only' : 'all');
    if (sp.get('tab') === 'areas' && vendorsSchema) {
      setActiveTab('areas');
    }
  }, [vendorListUrlKey, vendorsSchema]);

  useEffect(() => {
    if (!vendorFromUrl || !vendors.length) return;
    if (vendors.some((v) => v.id === vendorFromUrl)) {
      setSelectedId(vendorFromUrl);
    }
  }, [vendorFromUrl, vendors]);

  useEffect(() => {
    if (filteredVendors.length === 0) {
      if (selectedId) setSelectedId('');
      return;
    }
    if (!filteredVendors.some((v) => v.id === selectedId)) {
      setSelectedId(filteredVendors[0].id);
    }
  }, [filteredVendors, selectedId]);

  // When a vendor is selected via URL but isn't in the current page, jump search to it.
  useEffect(() => {
    if (!vendorFromUrl) return;
    if (vendors.some((v) => v.id === vendorFromUrl)) return;
    // Only do this when user isn't actively searching.
    if (searchQuery.trim()) return;
    setSearchQuery(vendorFromUrl);
  }, [vendorFromUrl, vendors, searchQuery]);

  useEffect(() => {
    if (selectedId) {
      loadVendorDetail(selectedId);
    }
  }, [selectedId, loadVendorDetail]);

  useEffect(() => {
    if (!selectedId || !vendorsSchema) {
      setListingMarkets([]);
      setMarketApproved({});
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: mk }, { data: ops }] = await Promise.all([
        supabase.from('listing_markets').select('id,name,slug,region_key').order('sort_order'),
        supabase.from('vendor_market_operations').select('market_id,approved').eq('vendor_id', selectedId),
      ]);
      if (cancelled) return;
      setListingMarkets(
        (mk || []) as { id: string; name: string; slug: string; region_key?: string | null }[]
      );
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
    const ownerId = selected?.user_id?.trim() || '';
    if (!ownerId) {
      setFeedShadowbanned(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('feed_shadowbanned')
        .eq('id', ownerId)
        .maybeSingle();
      if (cancelled) return;
      setFeedShadowbanned(data?.feed_shadowbanned === true);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.user_id]);

  async function setOwnerFeedShadowban(next: boolean) {
    const ownerId = selected?.user_id?.trim() || '';
    if (!ownerId) return;
    setSavingShadowban(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/admin/feed-shadowban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: ownerId, shadowbanned: next }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not update shadowban', description: j.error || res.statusText, variant: 'destructive' });
        return;
      }
      setFeedShadowbanned(next);
      toast({
        title: next ? 'Feed shadowban enabled' : 'Feed shadowban removed',
        description: next
          ? 'This user can still post comments, but only they and admins will see them.'
          : 'User feed comments are visible normally again.',
      });
    } finally {
      setSavingShadowban(false);
    }
  }

  async function handleUnlinkShopOwner(vendorId: string) {
    if (
      !window.confirm(
        'Remove the linked owner from this shop? The row becomes unclaimed and all vendor team members for this shop lose dashboard access. Former owners/staff become customers unless they still own or work at another shop.'
      )
    ) {
      return;
    }
    setUnlinkingOwner(true);
    try {
      const { error } = await supabase.rpc('admin_unlink_vendor_user', { p_vendor_id: vendorId });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.unlink_owner',
        summary: `Unlinked owner from vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
      });
      toast({
        title: 'Owner unlinked',
        description: 'Link a different user from Dispensary admin, or leave the shop directory-only.',
      });
      await loadVendors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Unlink failed', description: msg, variant: 'destructive' });
    } finally {
      setUnlinkingOwner(false);
    }
  }

  function formatSupabaseError(err: { message?: string; hint?: string; code?: string; details?: string } | null) {
    if (!err) return 'Unknown error';
    return [err.message, err.details, err.hint].filter(Boolean).join(' — ') || err.code || 'Unknown error';
  }

  async function setMarketApproval(marketId: string, approved: boolean) {
    if (!selectedId || !vendorsSchema) return;
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
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.market_operations.set',
        summary: `${approved ? 'Enabled' : 'Disabled'} market ${marketId} for vendor ${selectedId}`,
        resourceType: 'vendor',
        resourceId: selectedId,
        metadata: { market_id: marketId, approved },
      });
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

  async function commitVendorMapPoint(lat: number, lng: number): Promise<boolean> {
    if (!selectedId) return false;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast({
        title: 'Sign in required',
        description: 'Sign in again to update the map pin.',
        variant: 'destructive',
      });
      return false;
    }
    const res = await fetch('/api/admin/vendor-set-map-point', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vendor_id: selectedId, lat, lng }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast({
        title: 'Could not update map pin',
        description: j.error ?? res.statusText,
        variant: 'destructive',
      });
      return false;
    }
    setStoredMapPoint({ lat, lng });
    toast({
      title: 'Map pin updated',
      description: 'Discover and map distances now use this location.',
    });
    return true;
  }

  async function syncMapPinFromFullAddress() {
    if (!selectedId) return;
    const token = mapboxTokenForGeocode();
    if (!token) {
      toast({
        title: 'Mapbox token missing',
        description: 'Set NEXT_PUBLIC_MAPBOX_TOKEN to geocode the storefront address.',
        variant: 'destructive',
      });
      return;
    }
    const q = vendorProfileGeocodeQuery({
      address: vendorStreet,
      city: vendorCity,
      state: vendorState,
      zip: vendorZip,
    });
    if (!q) {
      toast({
        title: 'Need location fields',
        description: 'Enter at least city, state, and ZIP (or a street address).',
        variant: 'destructive',
      });
      return;
    }
    setSyncingMapPin(true);
    try {
      const pt = await mapboxGeocodeAddress(q, token);
      if (!pt) {
        toast({
          title: 'Geocode failed',
          description: 'Mapbox did not return coordinates for this address.',
          variant: 'destructive',
        });
        return;
      }
      await commitVendorMapPoint(pt.lat, pt.lng);
    } finally {
      setSyncingMapPin(false);
    }
  }

  async function syncMapPinFromZipOnly() {
    if (!selectedId) return;
    const zipDigits = vendorZip.replace(/\D/g, '').slice(0, 5);
    if (zipDigits.length !== 5) {
      toast({
        title: 'ZIP required',
        description: 'Enter a 5-digit ZIP before setting the pin from ZIP.',
        variant: 'destructive',
      });
      return;
    }
    const token = mapboxTokenForGeocode();
    if (!token) {
      toast({
        title: 'Mapbox token missing',
        description: 'Set NEXT_PUBLIC_MAPBOX_TOKEN to geocode the ZIP.',
        variant: 'destructive',
      });
      return;
    }
    setSyncingMapPin(true);
    try {
      const pt = await mapboxGeocodeAddress(`${zipDigits} United States`, token);
      if (!pt) {
        toast({
          title: 'Geocode failed',
          description: 'Mapbox did not return a point for this ZIP.',
          variant: 'destructive',
        });
        return;
      }
      await commitVendorMapPoint(pt.lat, pt.lng);
    } finally {
      setSyncingMapPin(false);
    }
  }

  async function saveProfile() {
    if (!selectedId) return;
    setSaving(true);
    const table = vendorsSchema ? 'vendors' : 'vendor_profiles';
    const zipDigits = vendorZip.replace(/\D/g, '').slice(0, 5);
    if (vendorsSchema && zipDigits.length !== 5) {
      toast({
        title: 'ZIP required',
        description: 'Enter a 5-digit US ZIP so operating areas and Smokers Club mapping work.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    const state2 = vendorState.replace(/\s/g, '').slice(0, 2).toUpperCase();

    const payload = vendorsSchema
      ? {
          logo_url: logoUrl || null,
          banner_url: coverUrl || null,
          smokers_club_tab_background_url: clubTabBgUrl.trim() || null,
          is_live: isLive,
          zip: zipDigits,
          address: vendorStreet.trim() || null,
          city: vendorCity.trim() || null,
          state: state2 || null,
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
    await logAdminAuditEvent(supabase, {
      actionKey: 'vendor.profile.update',
      summary: `Updated vendor profile ${selectedId} (${table})`,
      resourceType: table,
      resourceId: selectedId,
    });
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
    if (vendorsSchema && license.license_number) {
      await supabase
        .from('vendors')
        .update({ license_number: license.license_number })
        .eq('id', selectedId);
    }
    await logAdminAuditEvent(supabase, {
      actionKey: 'vendor.license.save',
      summary: `Saved business license for vendor ${selectedId}`,
      resourceType: 'business_license',
      resourceId: licenseId || selectedId,
      metadata: { vendor_id: selectedId },
    });
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
    await logAdminAuditEvent(supabase, {
      actionKey: 'vendor.hours.save',
      summary: `Updated vendor hours for ${selectedId}`,
      resourceType: 'vendor',
      resourceId: selectedId,
    });
    toast({ title: 'Hours saved' });
  }

  async function setVendorLive(vendorId: string, nextLive: boolean) {
    setSaving(true);
    try {
      if (vendorsSchema) {
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

      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.is_live',
        summary: `${nextLive ? 'Set live' : 'Set hidden'} vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { is_live: nextLive },
      });
      toast({ title: nextLive ? 'Vendor is now live' : 'Vendor is now hidden' });
    } catch (e: any) {
      toast({ title: 'Live toggle failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorSmokersClub(vendorId: string, nextEligible: boolean) {
    if (!vendorsSchema) return;
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
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.smokers_club_eligible',
        summary: `${nextEligible ? 'Smokers Club on' : 'Smokers Club off'} for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { smokers_club_eligible: nextEligible },
      });
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

  async function setVendorMapVisible(vendorId: string, nextVisible: boolean) {
    if (!vendorsSchema) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ map_visible_override: nextVisible })
        .eq('id', vendorId);
      if (error) throw error;
      setVendors((prev) =>
        prev.map((row) => (row.id === vendorId ? { ...row, map_visible_override: nextVisible } : row))
      );
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.map_visible_override',
        summary: `${nextVisible ? 'Map on' : 'Map off'} for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { map_visible_override: nextVisible },
      });
      toast({
        title: nextVisible ? 'Map marker enabled' : 'Map marker hidden',
        description: nextVisible
          ? 'This shop now appears on customer maps even outside Smokers Club placements.'
          : 'This shop is hidden on map unless it is in Smokers Club placements.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Map visibility toggle failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorDealDatetimeScheduling(vendorId: string, nextEnabled: boolean) {
    if (!vendorsSchema) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ deal_datetime_scheduling_enabled: nextEnabled })
        .eq('id', vendorId);
      if (error) throw error;
      setVendors((prev) =>
        prev.map((row) =>
          row.id === vendorId ? { ...row, deal_datetime_scheduling_enabled: nextEnabled } : row
        )
      );
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.deal_datetime_scheduling_enabled',
        summary: `${nextEnabled ? 'Enabled' : 'Disabled'} precise deal scheduling for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { deal_datetime_scheduling_enabled: nextEnabled },
      });
      toast({
        title: nextEnabled ? 'Deal time scheduling on' : 'Deal time scheduling off',
        description: nextEnabled
          ? 'This shop can add optional start/end clock times and daily hour windows on top of deal dates.'
          : 'This shop still picks deal dates; clock times and daily windows are hidden and full Pacific days are used.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorOnlineMenu(vendorId: string, nextEnabled: boolean) {
    if (!vendorsSchema) return;
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
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.online_menu_enabled',
        summary: `${nextEnabled ? 'Online menu on' : 'Online menu off'} for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { online_menu_enabled: nextEnabled },
      });
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

  async function saveExtraMapPinsAllowed() {
    if (!vendorsSchema || !selectedId) return;
    const parsed = Number.parseInt(extraPinsAllowedDraft.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast({
        title: 'Invalid number',
        description: 'Enter a whole number between 0 and 500.',
        variant: 'destructive',
      });
      return;
    }
    const floor = extraLocationRowCount;
    const next = Math.min(500, Math.max(floor, parsed));
    if (next !== parsed) {
      toast({
        title: 'Adjusted allowance',
        description:
          parsed < floor
            ? `Cannot go below current extra pin count (${floor}). Delete pins on the vendor map first.`
            : `Clamped to maximum 500.`,
      });
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ extra_map_pins_allowed: next })
        .eq('id', selectedId);
      if (error) throw error;
      setVendors((prev) =>
        prev.map((row) => (row.id === selectedId ? { ...row, extra_map_pins_allowed: next } : row))
      );
      setExtraPinsAllowedDraft(String(next));
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.extra_map_pins_allowed',
        summary: `Set extra map pin allowance to ${next} for vendor ${selectedId}`,
        resourceType: 'vendor',
        resourceId: selectedId,
        metadata: { extra_map_pins_allowed: next, extra_location_row_count: extraLocationRowCount },
      });
      toast({
        title: 'Pin allowance saved',
        description:
          next === 0
            ? 'Vendor cannot add extra map pins until you raise this number.'
            : `Vendor may have up to ${next} rows in vendor_locations (currently ${extraLocationRowCount}).`,
      });
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorAdminServiceMode(vendorId: string, mode: AdminVendorServiceMode) {
    if (!vendorsSchema) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update({ admin_service_mode: mode })
        .eq('id', vendorId)
        .select(
          'offers_delivery, offers_storefront, admin_service_mode, allow_both_storefront_and_delivery, service_mode_locked'
        )
        .single();
      if (error) throw error;
      const row = data as {
        offers_delivery?: boolean;
        offers_storefront?: boolean;
        admin_service_mode?: string | null;
        allow_both_storefront_and_delivery?: boolean;
        service_mode_locked?: boolean;
      };
      setVendors((prev) =>
        prev.map((r) =>
          r.id === vendorId
            ? {
                ...r,
                admin_service_mode: normalizeAdminVendorServiceMode(row.admin_service_mode),
                offers_delivery: row.offers_delivery === true,
                offers_storefront: row.offers_storefront === true,
                allow_both_storefront_and_delivery: row.allow_both_storefront_and_delivery === true,
                service_mode_locked: row.service_mode_locked !== false,
              }
            : r
        )
      );
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.admin_service_mode',
        summary: `Set admin service mode to ${mode} for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { admin_service_mode: mode },
      });
      toast({ title: 'Service mode updated', description: 'Public delivery vs storefront flags were refreshed.' });
      try {
        setServiceModeQueue(await fetchPendingServiceModeRequestsForAdmin());
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorAllowBothLanes(vendorId: string, allowBoth: boolean) {
    if (!vendorsSchema) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        allow_both_storefront_and_delivery: allowBoth,
      };
      if (allowBoth) {
        patch.offers_delivery = true;
        patch.offers_storefront = true;
      }
      const { data, error } = await supabase
        .from('vendors')
        .update(patch)
        .eq('id', vendorId)
        .select(
          'offers_delivery, offers_storefront, allow_both_storefront_and_delivery, admin_service_mode, service_mode_locked'
        )
        .single();
      if (error) throw error;
      const row = data as {
        offers_delivery?: boolean;
        offers_storefront?: boolean;
        allow_both_storefront_and_delivery?: boolean;
        admin_service_mode?: string | null;
        service_mode_locked?: boolean;
      };
      setVendors((prev) =>
        prev.map((r) =>
          r.id === vendorId
            ? {
                ...r,
                offers_delivery: row.offers_delivery === true,
                offers_storefront: row.offers_storefront === true,
                allow_both_storefront_and_delivery: row.allow_both_storefront_and_delivery === true,
                admin_service_mode: normalizeAdminVendorServiceMode(row.admin_service_mode),
                service_mode_locked: row.service_mode_locked !== false,
              }
            : r
        )
      );
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.allow_both_lanes',
        summary: `${allowBoth ? 'Enabled' : 'Disabled'} both lanes for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { allow_both_storefront_and_delivery: allowBoth },
      });
      toast({
        title: allowBoth ? 'Dual lane on' : 'Dual lane off',
        description: allowBoth
          ? 'This shop is listed for delivery and storefront.'
          : 'Lanes follow admin mode and address rules again.',
      });
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function setVendorServiceModeLocked(vendorId: string, locked: boolean) {
    if (!vendorsSchema) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update({ service_mode_locked: locked })
        .eq('id', vendorId)
        .select(
          'service_mode_locked, offers_delivery, offers_storefront, allow_both_storefront_and_delivery, admin_service_mode'
        )
        .single();
      if (error) throw error;
      const row = data as {
        service_mode_locked?: boolean;
        offers_delivery?: boolean;
        offers_storefront?: boolean;
        allow_both_storefront_and_delivery?: boolean;
        admin_service_mode?: string | null;
      };
      setVendors((prev) =>
        prev.map((r) =>
          r.id === vendorId
            ? {
                ...r,
                service_mode_locked: row.service_mode_locked !== false,
                offers_delivery: row.offers_delivery === true,
                offers_storefront: row.offers_storefront === true,
                allow_both_storefront_and_delivery: row.allow_both_storefront_and_delivery === true,
                admin_service_mode: normalizeAdminVendorServiceMode(row.admin_service_mode),
              }
            : r
        )
      );
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.service_mode_locked',
        summary: `${locked ? 'Locked' : 'Unlocked'} public service lanes for vendor ${vendorId}`,
        resourceType: 'vendor',
        resourceId: vendorId,
        metadata: { service_mode_locked: locked },
      });
      toast({
        title: locked ? 'Lanes locked' : 'Lanes unlocked',
        description: locked
          ? 'Address changes will not change delivery vs storefront for shoppers.'
          : 'The next save can re-derive lanes from address (unless dual-lane or admin override).',
      });
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function applyServiceModeRequest(requestId: string) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_apply_vendor_service_mode_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.service_mode_request.approved',
        summary: `Approved service mode request ${requestId}`,
        resourceType: 'vendor',
        resourceId: requestId,
        metadata: { request_id: requestId },
      });
      toast({ title: 'Request approved', description: 'Vendor public lane was updated.' });
      await loadVendors();
    } catch (e: unknown) {
      toast({
        title: 'Could not approve',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function rejectServiceModeRequest(requestId: string) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_reject_vendor_service_mode_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
      await logAdminAuditEvent(supabase, {
        actionKey: 'vendor.service_mode_request.rejected',
        summary: `Rejected service mode request ${requestId}`,
        resourceType: 'vendor',
        resourceId: requestId,
        metadata: { request_id: requestId },
      });
      toast({ title: 'Request rejected' });
      try {
        setServiceModeQueue(await fetchPendingServiceModeRequestsForAdmin());
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      toast({
        title: 'Could not reject',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md border-red-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-white">Access denied</h1>
          <p className="text-gray-400">Admin tools are only available to platform administrators.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          {vendorsSchema && (
            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              <span className="text-gray-400">{linkedOwnerCount} linked</span> (shop has a login owner) ·{' '}
              <span className="text-amber-200/80">{unclaimedCount} unclaimed</span> (no user yet — link in{' '}
              <Link href="/admin/dispensaries" className="text-brand-lime-soft underline hover:text-white">
                Dispensary admin
              </Link>
              ).
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
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
            {vendorsSchema && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Directory view</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={clubListFilter === 'all' ? 'default' : 'outline'}
                    className={
                      clubListFilter === 'all'
                        ? 'bg-brand-red hover:bg-brand-red-deep'
                        : 'border-brand-red/40 text-white hover:bg-brand-red/10'
                    }
                    onClick={() => setClubListFilter('all')}
                  >
                    All shops
                  </Button>
                  <Button
                    type="button"
                    variant={clubListFilter === 'smokers_only' ? 'default' : 'outline'}
                    className={
                      clubListFilter === 'smokers_only'
                        ? 'border-brand-lime/60 bg-brand-lime/20 text-brand-lime-soft hover:bg-brand-lime/30'
                        : 'border-brand-lime/35 text-brand-lime-soft hover:bg-brand-lime/10'
                    }
                    onClick={() => {
                      setClubListFilter('smokers_only');
                      setActiveTab('areas');
                    }}
                  >
                    <Award className="mr-1.5 h-4 w-4" />
                    Smokers Club only
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Club-only view is for toggling <span className="text-gray-400">Operating areas</span> per shop. Opens the
                  Areas tab when you pick it here.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {vendorsSchema && (
                <Button
                  asChild
                  variant="outline"
                  className="border-brand-lime/40 text-brand-lime-soft hover:bg-brand-lime/10"
                >
                  <Link href="/admin/dispensaries">Link / unlink owner (Dispensary admin)</Link>
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
            {vendorsSchema && licenseExpiringSoonUrl ? (
              <div className="flex w-full flex-wrap items-center gap-2 md:col-span-2">
                <Badge className="border-amber-600/40 bg-amber-950/40 text-amber-100">
                  Showing vendors with a license expiring in the next 60 days
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-amber-200/90 hover:bg-amber-950/40 hover:text-amber-50"
                  onClick={clearLicenseExpiringSoonFilter}
                >
                  Clear filter
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {vendorsSchema && serviceModeQueue.length > 0 ? (
          <Card className="mb-6 border-amber-500/25 bg-amber-950/15 p-4">
            <h3 className="text-sm font-semibold text-amber-100/95">Pending service mode requests</h3>
            <p className="mt-1 text-xs text-gray-400">
              Vendors asked to turn on delivery or storefront for public listings. Approve to set the matching admin
              override, or reject after you reply to them.
            </p>
            <ul className="mt-3 space-y-2">
              {serviceModeQueue.map((req) => {
                const vn = vendors.find((x) => x.id === req.vendor_id)?.business_name ?? req.vendor_id;
                return (
                  <li
                    key={req.id}
                    className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium text-white">{vn}</p>
                      <p className="text-xs text-gray-400">
                        Wants <span className="text-gray-200">{req.requested_mode}</span> · {req.email} ·{' '}
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                      {req.note ? <p className="mt-1 text-xs text-gray-500">&ldquo;{req.note}&rdquo;</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-brand-lime/90 text-black hover:bg-brand-lime"
                        disabled={saving}
                        onClick={() => void applyServiceModeRequest(req.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-200 hover:bg-gray-900"
                        disabled={saving}
                        onClick={() => void rejectServiceModeRequest(req.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <div className="mb-6 space-y-2">
          <Label htmlFor="admin-vendor-list-search" className="text-gray-300">
            Search vendors
          </Label>
          <div className="relative max-w-2xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden
            />
            <Input
              id="admin-vendor-list-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-gray-800 bg-gray-950 py-2.5 pl-10 pr-3 text-white placeholder:text-gray-600"
              placeholder="Shop name, owner email, vendor UUID, user id, or ZIP…"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-gray-600">
            Results update as you type. Combine with owner and directory filters above.
          </p>
        </div>

        {loadingList && vendors.length === 0 ? (
          <Card className="relative flex min-h-[280px] flex-col items-center justify-center gap-3 border-gray-800 bg-gray-950/50 p-8">
            <Loader2 className="h-10 w-10 animate-spin text-brand-lime" aria-hidden />
            <p className="text-sm text-gray-400">Loading vendors…</p>
          </Card>
        ) : !selectedId || !selected ? (
          vendors.length > 0 && filteredVendors.length === 0 ? (
            <Card className="border-amber-900/30 bg-amber-950/20 p-8 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-brand-lime-soft" />
              <p className="text-white font-medium">No shops match this filter</p>
              <p className="mt-2 text-sm text-gray-400">Try clearing Smokers Club only, owner filters, or search.</p>
              <Button
                type="button"
                className="mt-6 bg-brand-red hover:bg-brand-red-deep"
                onClick={() => {
                  setClubListFilter('all');
                  setOwnerFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset filters
              </Button>
            </Card>
          ) : (
            <p className="text-gray-500">No vendors in database yet.</p>
          )
        ) : (
          <>
            <div className="relative mt-2 min-h-[12rem]">
              {loadingList ? (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/55 backdrop-blur-[1px]"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Loader2 className="h-9 w-9 animate-spin text-brand-lime" aria-hidden />
                  <span className="text-xs text-gray-400">Updating vendor list…</span>
                </div>
              ) : null}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-400">
                  Showing {filteredVendors.length} vendor{filteredVendors.length === 1 ? '' : 's'} ·{' '}
                  {totalCount.toLocaleString()} total
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-700 text-gray-200 hover:bg-gray-900"
                    disabled={loadingList || page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-gray-500">
                    Page {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-700 text-gray-200 hover:bg-gray-900"
                    disabled={loadingList || (page + 1) * pageSize >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
                {!vendorsSchema && (
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
                  const serviceModeBadges =
                    vendorsSchema &&
                    adminVendorPublicServiceModeBadges({
                      address: v.address,
                      city: v.city,
                      state: v.state,
                      zip: v.zip,
                      admin_service_mode: v.admin_service_mode,
                      allow_both_storefront_and_delivery: v.allow_both_storefront_and_delivery,
                      service_mode_locked: v.service_mode_locked,
                    });
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
                        <Link
                          href={listingHrefForVendor({ id: v.id, slug: v.slug })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-20 shrink-0 rounded-lg ring-offset-2 ring-offset-gray-950 transition hover:ring-2 hover:ring-green-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
                          aria-label={`View ${v.business_name} public storefront (opens new tab)`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
                            {v.logo_url ? (
                              <img src={v.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <BarChart3 className="h-5 w-5 text-emerald-600" />
                            )}
                          </div>
                        </Link>

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
                          {serviceModeBadges && serviceModeBadges.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {serviceModeBadges.map((b, i) => (
                                <Badge
                                  key={`${v.id}-svc-${i}-${b.label}`}
                                  variant="outline"
                                  className={`shrink-0 text-[10px] font-medium ${adminVendorPublicServiceModeBadgeClassName(b.variant)}`}
                                >
                                  {b.label}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
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
                          {vendorsSchema && !extractZip5(v.zip || '') && (
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
                            {vendorsSchema && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Smokers Club</span>
                                <Switch
                                  checked={v.smokers_club_eligible === true}
                                  onCheckedChange={(next) => setVendorSmokersClub(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {vendorsSchema && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Map marker</span>
                                <Switch
                                  checked={v.map_visible_override === true}
                                  onCheckedChange={(next) => setVendorMapVisible(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {vendorsSchema && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Online menu</span>
                                <Switch
                                  checked={v.online_menu_enabled !== false}
                                  onCheckedChange={(next) => setVendorOnlineMenu(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {vendorsSchema && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400" title="Clock start/end + daily deal hours">
                                  Deal times
                                </span>
                                <Switch
                                  checked={v.deal_datetime_scheduling_enabled === true}
                                  onCheckedChange={(next) => setVendorDealDatetimeScheduling(v.id, next)}
                                  disabled={saving}
                                />
                              </div>
                            )}
                            {vendorsSchema && (
                              <div className="max-w-[15rem] space-y-1.5">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                  Public service mode
                                </p>
                                <Select
                                  value={normalizeAdminVendorServiceMode(v.admin_service_mode)}
                                  onValueChange={(val) =>
                                    void setVendorAdminServiceMode(v.id, val as AdminVendorServiceMode)
                                  }
                                  disabled={saving}
                                >
                                  <SelectTrigger className="h-8 border-gray-700 bg-gray-950 text-xs text-white">
                                    <SelectValue placeholder="Mode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto (from address)</SelectItem>
                                    <SelectItem value="force_delivery">Force delivery</SelectItem>
                                    <SelectItem value="force_storefront">Force storefront</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] leading-snug text-gray-500">
                                  Auto follows street + city + state. Overrides ignore address for public listings.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                  <Switch
                                    id={`allow-both-${v.id}`}
                                    checked={v.allow_both_storefront_and_delivery === true}
                                    onCheckedChange={(next) => void setVendorAllowBothLanes(v.id, next)}
                                    disabled={saving}
                                  />
                                  <Label
                                    htmlFor={`allow-both-${v.id}`}
                                    className="cursor-pointer text-[10px] font-normal text-gray-400"
                                  >
                                    Both delivery &amp; storefront
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`lock-lanes-${v.id}`}
                                    checked={v.service_mode_locked !== false}
                                    onCheckedChange={(next) => void setVendorServiceModeLocked(v.id, next)}
                                    disabled={saving}
                                  />
                                  <Label
                                    htmlFor={`lock-lanes-${v.id}`}
                                    className="cursor-pointer text-[10px] font-normal text-gray-400"
                                  >
                                    Lock lanes (address edits won&apos;t change public mode)
                                  </Label>
                                </div>
                              </div>
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
                        {vendorsSchema && (
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
                        {vendorsSchema && (
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
              {vendorsSchema && (
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
                <div className="mb-6 flex items-center gap-3 text-brand-lime-soft">
                  <Link
                    href={listingHrefForVendor({ id: selected.id, slug: selected.slug })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg ring-offset-2 ring-offset-gray-950 transition hover:ring-2 hover:ring-green-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
                    aria-label={`View ${selected.business_name} public storefront (opens new tab)`}
                  >
                    {selected.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.logo_url}
                        alt=""
                        className="h-11 w-11 rounded-lg border border-green-900/30 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-green-900/30 bg-emerald-950/50 text-lg font-bold text-white">
                        {(selected.business_name.trim().charAt(0) || '?').toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Building2 className="h-5 w-5 shrink-0" />
                      <span className="truncate text-lg font-semibold">{selected.business_name}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-sm text-gray-400">{selected.approval_status}</span>
                    </div>
                    {vendorsSchema ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {adminVendorPublicServiceModeBadges({
                          address: selected.address,
                          city: selected.city,
                          state: selected.state,
                          zip: selected.zip,
                          admin_service_mode: selected.admin_service_mode,
                          allow_both_storefront_and_delivery: selected.allow_both_storefront_and_delivery,
                          service_mode_locked: selected.service_mode_locked,
                        }).map((b) => (
                          <Badge
                            key={`${selected.id}-${b.label}`}
                            variant="outline"
                            className={`text-[10px] font-medium ${adminVendorPublicServiceModeBadgeClassName(b.variant)}`}
                          >
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
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
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-200/90">Feed shadowban</p>
                          <p className="text-xs text-amber-100/80">
                            Hidden from public feed comments; visible only to this user and admins.
                          </p>
                        </div>
                        <Switch
                          checked={feedShadowbanned}
                          onCheckedChange={(next) => void setOwnerFeedShadowban(next)}
                          disabled={savingShadowban}
                        />
                      </div>
                      {vendorsSchema ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-700/50 text-amber-200 hover:bg-amber-950/40"
                            disabled={unlinkingOwner || loadingList}
                            onClick={() => void handleUnlinkShopOwner(selected.id)}
                          >
                            <UserX className="mr-1.5 h-4 w-4" />
                            Unlink owner
                          </Button>
                          <Button asChild size="sm" variant="secondary" className="border-gray-600">
                            <Link href="/admin/dispensaries">Change owner (Dispensary admin)</Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-amber-200/90">
                        Unclaimed — no login linked. The shop may be directory-only until you attach an owner.
                      </p>
                      {vendorsSchema ? (
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

            {vendorsSchema && (
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
                          <p className="truncate text-xs text-gray-500">
                            {m.slug}
                            {m.region_key ? ` · ${String(m.region_key).toUpperCase()}` : ''}
                          </p>
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
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-white">Extra map markers (allowance)</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Vendors add extra storefront pins on{' '}
                        <span className="text-gray-200">Vendor → Store map pins</span> (
                        <code className="text-gray-300">vendor_locations</code>). Only you can raise this cap; they can
                        move or delete pins anytime, and may add a new pin only when they are under the limit.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="extra-pins-allowed" className="text-white">
                        Max extra map pins allowed
                      </Label>
                      <Input
                        id="extra-pins-allowed"
                        inputMode="numeric"
                        value={extraPinsAllowedDraft}
                        onChange={(e) => setExtraPinsAllowedDraft(e.target.value.replace(/[^\d]/g, ''))}
                        className="border-gray-800 bg-background text-foreground"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500">
                        Current saved extras:{' '}
                        <span className="font-mono text-gray-300">{extraLocationRowCount}</span>. Minimum you can set is
                        that count (delete pins first to go lower). Maximum 500.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-brand-red text-white hover:bg-brand-red/90 sm:w-auto"
                      disabled={saving}
                      onClick={() => void saveExtraMapPinsAllowed()}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save allowance
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="profile">
              <Card className="space-y-6 border-brand-red/20 bg-gray-950/50 p-6">
                {vendorsSchema && (
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
                      className="border-gray-800 bg-background text-foreground"
                      placeholder="90210"
                    />
                    <p className="text-xs text-gray-500">
                      5-digit ZIP maps a default market row (pending) via migration 0026. Approve zones in the Areas tab.
                    </p>
                  </div>
                )}
                {vendorsSchema && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-street" className="text-white">
                        Street address (optional)
                      </Label>
                      <Input
                        id="vendor-street"
                        value={vendorStreet}
                        onChange={(e) => setVendorStreet(e.target.value)}
                        className="border-gray-800 bg-background text-foreground"
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="vendor-city" className="text-white">
                          City
                        </Label>
                        <Input
                          id="vendor-city"
                          value={vendorCity}
                          onChange={(e) => setVendorCity(e.target.value)}
                          className="border-gray-800 bg-background text-foreground"
                          placeholder="Riverside"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendor-state" className="text-white">
                          State (2 letters)
                        </Label>
                        <Input
                          id="vendor-state"
                          value={vendorState}
                          onChange={(e) => setVendorState(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                          maxLength={2}
                          className="border-gray-800 bg-background text-foreground"
                          placeholder="CA"
                        />
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-gray-800 bg-black/30 p-4">
                      <div className="flex gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-white">Discover and map distance</p>
                          <p className="text-xs text-gray-500">
                            Mileage sorting uses the stored map coordinates in the database, not the ZIP field by itself.
                            After a move, save address and ZIP above, then refresh the pin.
                          </p>
                          {storedMapPoint ? (
                            <p className="pt-1 font-mono text-xs text-gray-400">
                              Current pin: {storedMapPoint.lat.toFixed(5)}, {storedMapPoint.lng.toFixed(5)}
                            </p>
                          ) : (
                            <p className="pt-1 text-xs text-amber-600/90">No pin stored — distances may be wrong.</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-200"
                          disabled={saving || syncingMapPin}
                          onClick={() => void syncMapPinFromFullAddress()}
                        >
                          {syncingMapPin ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Update pin from address and ZIP
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-200"
                          disabled={saving || syncingMapPin}
                          onClick={() => void syncMapPinFromZipOnly()}
                        >
                          Set pin from ZIP only
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                {vendorsSchema && (
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
                      className="border-gray-800 bg-background text-foreground"
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
                    className="border-gray-800 bg-background text-foreground"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover">Cover photo URL</Label>
                  <Input
                    id="cover"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="border-gray-800 bg-background text-foreground"
                    placeholder="https://..."
                  />
                </div>
                {vendorsSchema && (
                  <div className="space-y-2">
                    <Label htmlFor="club-tab-bg">Smokers Club tree card background URL</Label>
                    <Input
                      id="club-tab-bg"
                      value={clubTabBgUrl}
                      onChange={(e) => setClubTabBgUrl(e.target.value)}
                      className="border-gray-800 bg-background text-foreground"
                      placeholder="https://... (wide image behind the card; logo stays separate)"
                    />
                    <p className="text-xs text-gray-500">
                      Full-bleed backdrop on the homepage tree tile. Vendors can also set this from Vendor → Smokers Club.
                    </p>
                  </div>
                )}
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
                      className="border-gray-800 bg-background text-foreground"
                      placeholder="State cannabis regulatory license / LIC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>License type</Label>
                    <Input
                      value={license.license_type || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, license_type: e.target.value }))}
                      className="border-gray-800 bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing authority</Label>
                    <Input
                      value={license.issuing_authority || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, issuing_authority: e.target.value }))}
                      className="border-gray-800 bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verification status</Label>
                    <Select
                      value={license.verification_status || 'pending'}
                      onValueChange={(v: string) => setLicense((p) => ({ ...p, verification_status: v }))}
                    >
                      <SelectTrigger className="border-gray-800 bg-background text-foreground">
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
                      className="border-gray-800 bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={license.expiry_date?.slice(0, 10) || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, expiry_date: e.target.value }))}
                      className="border-gray-800 bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Document URL</Label>
                    <Input
                      value={license.document_url || ''}
                      onChange={(e) => setLicense((p) => ({ ...p, document_url: e.target.value }))}
                      className="border-gray-800 bg-background text-foreground"
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
                              className="w-36 border-gray-800 bg-background text-foreground"
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
                              className="w-36 border-gray-800 bg-background text-foreground"
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
