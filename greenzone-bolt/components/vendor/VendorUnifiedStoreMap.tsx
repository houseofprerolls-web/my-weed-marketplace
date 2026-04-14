'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import {
  mapboxForwardGeocode,
  mapboxReverseGeocodePostcode,
  mapboxReverseGeocodeUsAddress,
  mapboxTokenForGeocode,
} from '@/lib/mapboxGeocode';
import { parseVendorLocationToLatLng } from '@/lib/parseVendorLocation';
import { loadVendorMapAreaGate, type VendorMapAreaGate, zipPrefixFromUsPostcode } from '@/lib/vendorMapAreaGate';
import { enableVendorMarketFromPostcode, reloadVendorMapGate } from '@/lib/vendorPinMarketEnable';
import { DEFAULT_MAP_CENTER, offsetLatLngEastMeters } from '@/lib/mapCoordinates';

type LocRow = {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  market_id: string | null;
  zip_prefix: string | null;
  label: string | null;
  created_at?: string;
};

function buildAddressQuery(v: VendorBusinessRow): string {
  const parts = [v.address, v.city, v.state, v.zip].filter((p) => p && String(p).trim());
  return parts.join(', ');
}

type Props = {
  vendor: VendorBusinessRow;
  onSaved: () => void;
  /** Increment when extras change outside this component (e.g. add/remove in the form below). */
  extrasReloadKey?: number;
};

export function VendorUnifiedStoreMap({ vendor, onSaved, extrasReloadKey }: Props) {
  const extraPinCap = Math.max(0, Math.min(500, Math.floor(Number(vendor.extra_map_pins_allowed ?? 0))));
  const { toast } = useToast();
  const token = mapboxTokenForGeocode();
  const gateRef = useRef<VendorMapAreaGate | null>(null);
  const [gate, setGate] = useState<VendorMapAreaGate | null>(null);
  const [gateLoadError, setGateLoadError] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [anchorLabel, setAnchorLabel] = useState('');
  const [anchor, setAnchor] = useState<{ lat: number; lng: number } | null>(null);

  const [primaryPos, setPrimaryPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [pinBust, setPinBust] = useState<{ primary: number; extras: Record<string, number> }>({
    primary: 0,
    extras: {},
  });

  const [addressInput, setAddressInput] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [savingPrimary, setSavingPrimary] = useState(false);
  const [savingExtraId, setSavingExtraId] = useState<string | null>(null);
  const [draftNewExtra, setDraftNewExtra] = useState<{ lat: number; lng: number } | null>(null);
  const [savingNewExtra, setSavingNewExtra] = useState(false);
  const [focusedExtraId, setFocusedExtraId] = useState<string | null>(null);
  const [editExtraAddr, setEditExtraAddr] = useState('');
  const [editExtraCity, setEditExtraCity] = useState('');
  const [editExtraState, setEditExtraState] = useState('');
  const [editExtraZip, setEditExtraZip] = useState('');

  const locationFingerprint = useMemo(() => {
    try {
      return JSON.stringify(vendor.location ?? null);
    } catch {
      return '';
    }
  }, [vendor.location]);

  const sortedExtrasWithCoords = useMemo(() => {
    return [...locations]
      .filter((l) => l.lat != null && l.lng != null && Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .sort((a, b) => {
        const ta = new Date(a.created_at ?? 0).getTime();
        const tb = new Date(b.created_at ?? 0).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      });
  }, [locations]);

  const pinNumberByExtraId = useMemo(() => {
    const m = new Map<string, number>();
    sortedExtrasWithCoords.forEach((loc, i) => m.set(loc.id, 2 + i));
    return m;
  }, [sortedExtrasWithCoords]);

  const pinsOnMapCount = useMemo(() => {
    let n = primaryPos ? 1 : 0;
    n += sortedExtrasWithCoords.length;
    if (draftNewExtra) n += 1;
    return n;
  }, [primaryPos, sortedExtrasWithCoords.length, draftNewExtra]);

  const mapCenter = useMemo(() => {
    const pts: { lat: number; lng: number }[] = [];
    if (primaryPos) pts.push(primaryPos);
    for (const l of sortedExtrasWithCoords) {
      pts.push({ lat: l.lat!, lng: l.lng! });
    }
    if (draftNewExtra) pts.push(draftNewExtra);
    if (pts.length === 0) return DEFAULT_MAP_CENTER;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat, lng };
  }, [primaryPos, sortedExtrasWithCoords, draftNewExtra]);

  /** Reverse-geocode ZIP (when Mapbox is configured) and approve the matching listing_market for this vendor. */
  const tryAutoEnableMarketAt = useCallback(
    async (lat: number, lng: number): Promise<string | null> => {
      if (!token) return null;
      const pc = await mapboxReverseGeocodePostcode(lng, lat);
      if (!pc) return null;
      const beforeIds = new Set(gateRef.current?.approvedMarketIds ?? []);
      const en = await enableVendorMarketFromPostcode(vendor.id, pc);
      if (!en.ok) {
        if (en.reason && en.reason !== 'invalid_zip' && en.reason !== 'no_market' && en.reason !== 'rpc') {
          console.warn('vendor_enable_market_from_pin:', en.reason);
        }
        return null;
      }
      const mid = en.market_id ?? null;
      const nextGate = await reloadVendorMapGate(vendor.id);
      if (nextGate) {
        gateRef.current = nextGate;
        setGate(nextGate);
        if (mid && !beforeIds.has(mid)) {
          toast({
            title: 'Operating area enabled',
            description: 'That ZIP’s region is now turned on for your store (from your pin).',
          });
        }
      }
      return mid;
    },
    [token, vendor.id, toast]
  );

  const fetchLocations = useCallback(async () => {
    setLoadingLocs(true);
    const { data, error } = await supabase
      .from('vendor_locations')
      .select('id,address,city,state,zip,lat,lng,market_id,zip_prefix,label,created_at')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setLocations([]);
    } else {
      setLocations((data || []) as LocRow[]);
    }
    setLoadingLocs(false);
  }, [vendor.id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingInit(true);
      setGateLoadError(null);
      setAnchorError(null);

      const gateRes = await loadVendorMapAreaGate(vendor.id);
      if (cancelled) return;
      if (!gateRes.ok) {
        setGate(null);
        gateRef.current = null;
        setGateLoadError(gateRes.error);
        setLoadingInit(false);
        return;
      }
      setGate(gateRes.gate);
      gateRef.current = gateRes.gate;

      const q = buildAddressQuery(vendor);
      const saved = parseVendorLocationToLatLng(vendor.location);

      if (!token) {
        if (saved) {
          setAnchor(saved);
          setAnchorLabel('Saved map pin');
          setPrimaryPos(saved);
          setAddressInput(q.trim() || '');
          setManualLat(saved.lat.toFixed(6));
          setManualLng(saved.lng.toFixed(6));
        } else if (!q.trim()) {
          setAnchor(null);
          setAnchorError(
            'Add a business address on your profile, or add NEXT_PUBLIC_MAPBOX_TOKEN to place your first pin.'
          );
        } else {
          setAnchor(null);
          setAnchorError(
            'Add NEXT_PUBLIC_MAPBOX_TOKEN so we can verify coordinates against the operating areas your admin enabled.'
          );
        }
        setLoadingInit(false);
        return;
      }

      if (!q.trim()) {
        setAnchor(null);
        setAnchorError('Add a street, city, state, and ZIP on your business profile to center the map and validate regions.');
        setLoadingInit(false);
        return;
      }

      const hit = await mapboxForwardGeocode(q);
      if (cancelled) return;
      if (!hit) {
        setAnchor(null);
        setAnchorError('Could not find coordinates for your business address. Check spelling in Business profile.');
        setLoadingInit(false);
        return;
      }

      setAnchor({ lat: hit.lat, lng: hit.lng });
      setAnchorLabel(hit.placeName);

      const start = saved ?? { lat: hit.lat, lng: hit.lng };
      setPrimaryPos(start);

      setAddressInput(q);
      setManualLat(start.lat.toFixed(6));
      setManualLng(start.lng.toFixed(6));
      setLoadingInit(false);
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror VendorMapMarkerEditor: avoid re-init on toast identity
  }, [vendor.id, vendor.address, vendor.city, vendor.state, vendor.zip, locationFingerprint, token]);

  useEffect(() => {
    const p = parseVendorLocationToLatLng(vendor.location);
    if (p) {
      setPrimaryPos(p);
      setManualLat(p.lat.toFixed(6));
      setManualLng(p.lng.toFixed(6));
    }
  }, [locationFingerprint, vendor.location]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations, locationFingerprint, extrasReloadKey]);

  const bumpExtra = useCallback((id: string) => {
    setPinBust((prev) => ({
      ...prev,
      extras: { ...prev.extras, [id]: (prev.extras[id] ?? 0) + 1 },
    }));
  }, []);

  const persistPrimary = useCallback(
    async (lat: number, lng: number) => {
      setSavingPrimary(true);
      try {
        await tryAutoEnableMarketAt(lat, lng);
        const { error } = await supabase
          .from('vendors')
          .update({
            location: { type: 'Point', coordinates: [lng, lat] },
          })
          .eq('id', vendor.id);
        if (error) throw error;
        setPrimaryPos({ lat, lng });
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        toast({
          title: 'Primary pin updated',
          description: 'Saved to your store profile. Pins can be placed anywhere on the map.',
        });
        onSaved();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Save failed';
        toast({ title: 'Could not save primary pin', description: msg, variant: 'destructive' });
        setPinBust((p) => ({ ...p, primary: p.primary + 1 }));
      } finally {
        setSavingPrimary(false);
      }
    },
    [tryAutoEnableMarketAt, vendor.id, toast, onSaved]
  );

  const persistExtra = useCallback(
    async (loc: LocRow, lat: number, lng: number) => {
      setSavingExtraId(loc.id);
      try {
        const marketIdFromPin = await tryAutoEnableMarketAt(lat, lng);
        const rev = await mapboxReverseGeocodeUsAddress(lng, lat);
        const pc = await mapboxReverseGeocodePostcode(lng, lat);
        const zipPrefix = pc ? zipPrefixFromUsPostcode(pc) : null;
        const address = rev?.addressLine?.trim() || loc.address;
        const city = rev?.city?.trim() || loc.city;
        const state = rev?.state?.trim() || loc.state;
        const zip = rev?.zip?.trim() || loc.zip;
        const nextMarketId = marketIdFromPin ?? loc.market_id;
        const { error } = await supabase
          .from('vendor_locations')
          .update({
            lat,
            lng,
            address,
            city: city || null,
            state: state || loc.state,
            zip: zip || null,
            zip_prefix: zipPrefix,
            ...(nextMarketId ? { market_id: nextMarketId } : {}),
          })
          .eq('id', loc.id)
          .eq('vendor_id', vendor.id);
        if (error) throw error;
        setLocations((prev) =>
          prev.map((r) =>
            r.id === loc.id
              ? {
                  ...r,
                  lat,
                  lng,
                  address,
                  city: city || null,
                  state: state || r.state,
                  zip: zip || null,
                  zip_prefix: zipPrefix,
                  market_id: nextMarketId ?? r.market_id,
                }
              : r
          )
        );
        toast({ title: `Pin #${pinNumberByExtraId.get(loc.id) ?? '?'} updated`, description: 'Extra marker saved.' });
        onSaved();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Save failed';
        toast({ title: 'Could not save marker', description: msg, variant: 'destructive' });
        bumpExtra(loc.id);
      } finally {
        setSavingExtraId(null);
      }
    },
    [tryAutoEnableMarketAt, bumpExtra, vendor.id, toast, onSaved, pinNumberByExtraId]
  );

  const startAddAnotherMarker = useCallback(() => {
    if (!primaryPos) return;
    setFocusedExtraId(null);
    setDraftNewExtra(offsetLatLngEastMeters(primaryPos.lat, primaryPos.lng));
  }, [primaryPos]);

  const cancelDraftNewExtra = useCallback(() => {
    setDraftNewExtra(null);
  }, []);

  const onDraftNewExtraDragEnd = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = e.lngLat;
    setDraftNewExtra({ lat, lng });
  }, []);

  const saveDraftNewExtra = useCallback(async () => {
    if (!draftNewExtra) return;
    if (locations.length >= extraPinCap) {
      toast({
        title: 'Extra pin limit reached',
        description: 'Ask an admin to increase your allowance, or delete an extra pin to free a slot.',
        variant: 'destructive',
      });
      setDraftNewExtra(null);
      return;
    }
    if (!token) {
      toast({ title: 'Mapbox token required', description: 'Add NEXT_PUBLIC_MAPBOX_TOKEN to save a new pin.', variant: 'destructive' });
      return;
    }
    setSavingNewExtra(true);
    try {
      const { lat, lng } = draftNewExtra;
      const marketIdFromPin = await tryAutoEnableMarketAt(lat, lng);
      const rev = await mapboxReverseGeocodeUsAddress(lng, lat);
      const pc = await mapboxReverseGeocodePostcode(lng, lat);
      const zipPrefix = pc ? zipPrefixFromUsPostcode(pc) : null;
      const address = rev?.addressLine?.trim() || 'Map pin';
      const city = rev?.city?.trim() || null;
      const state = (rev?.state?.trim() || 'CA').slice(0, 2).toUpperCase() || 'CA';
      const zip = rev?.zip?.trim() || null;
      const { error } = await supabase.from('vendor_locations').insert({
        vendor_id: vendor.id,
        address,
        city,
        state,
        zip,
        lat,
        lng,
        label: null,
        market_id: marketIdFromPin,
        zip_prefix: zipPrefix,
      });
      if (error) throw error;
      setDraftNewExtra(null);
      await fetchLocations();
      toast({ title: 'Extra marker saved', description: address });
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Could not add marker', description: msg, variant: 'destructive' });
    } finally {
      setSavingNewExtra(false);
    }
  }, [draftNewExtra, token, tryAutoEnableMarketAt, vendor.id, toast, fetchLocations, onSaved, locations.length, extraPinCap]);

  const moveFocusedExtraToAddress = useCallback(async () => {
    if (!focusedExtraId) return;
    const loc = locations.find((l) => l.id === focusedExtraId);
    if (!loc) return;
    if (!token) {
      toast({ title: 'Mapbox token required', variant: 'destructive' });
      return;
    }
    const q = `${editExtraAddr.trim()}, ${editExtraCity.trim()}, ${editExtraState} ${editExtraZip.trim()}`.trim();
    if (!q || !editExtraState.trim()) {
      toast({
        title: 'Enter an address',
        description: 'Include street, city, state, and ZIP when possible.',
        variant: 'destructive',
      });
      return;
    }
    const hit = await mapboxForwardGeocode(q);
    if (!hit) {
      toast({ title: 'Address not found', variant: 'destructive' });
      return;
    }
    await persistExtra(loc, hit.lat, hit.lng);
    setFocusedExtraId(null);
  }, [focusedExtraId, locations, token, editExtraAddr, editExtraCity, editExtraState, editExtraZip, persistExtra, toast]);

  const onExtraMarkerActivate = useCallback((loc: LocRow) => {
    setDraftNewExtra(null);
    setFocusedExtraId(loc.id);
    setEditExtraAddr(loc.address?.trim() ?? '');
    setEditExtraCity(loc.city?.trim() ?? '');
    setEditExtraState((loc.state?.trim() || 'CA').slice(0, 2).toUpperCase() || 'CA');
    setEditExtraZip(loc.zip?.trim() ?? '');
  }, []);

  const onPrimaryDragEnd = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat;
      await persistPrimary(lat, lng);
    },
    [persistPrimary]
  );

  const onExtraDragEnd = useCallback(
    (loc: LocRow) => async (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat;
      await persistExtra(loc, lat, lng);
    },
    [persistExtra]
  );

  const movePrimaryToAddress = useCallback(async () => {
    if (!token) {
      toast({ title: 'Mapbox token required', description: 'Add NEXT_PUBLIC_MAPBOX_TOKEN to search by address.', variant: 'destructive' });
      return;
    }
    const q = addressInput.trim() || buildAddressQuery(vendor);
    if (!q) return;
    const hit = await mapboxForwardGeocode(q);
    if (!hit) {
      toast({ title: 'Address not found', description: 'Try a fuller street address including city and state.', variant: 'destructive' });
      return;
    }
    await persistPrimary(hit.lat, hit.lng);
  }, [addressInput, vendor, persistPrimary, token, toast]);

  const applyManualPrimaryCoords = useCallback(async () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ title: 'Invalid coordinates', variant: 'destructive' });
      return;
    }
    await persistPrimary(lat, lng);
  }, [manualLat, manualLng, persistPrimary, toast]);

  if (loadingInit || loadingLocs) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-12">
        <Loader2 className="h-10 w-10 animate-spin text-brand-lime" />
      </Card>
    );
  }

  if (gateLoadError) {
    return (
      <Card className="border-red-900/40 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
        <p className="text-red-200">Could not load operating areas: {gateLoadError}</p>
        <p className="mt-2 text-sm text-gray-500">If this persists, confirm migrations 0019 and 0026 are applied.</p>
      </Card>
    );
  }

  if (anchorError || !anchor || !primaryPos) {
    return (
      <Card className="border-amber-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-amber-500/80" />
        <p className="text-white">{anchorError}</p>
        <Button asChild className="mt-6 bg-green-600 hover:bg-green-700">
          <Link href="/vendor/profile">Edit business profile</Link>
        </Button>
      </Card>
    );
  }

  const areasLabel =
    gate && gate.enabledMarketNames.length > 0 ? gate.enabledMarketNames.join(' · ') : 'Admin-enabled regions';

  const extrasMissingCoords = locations.length - sortedExtrasWithCoords.length;
  const focusedLocForPanel = focusedExtraId ? locations.find((l) => l.id === focusedExtraId) : null;
  const focusedPinN =
    focusedLocForPanel != null ? pinNumberByExtraId.get(focusedLocForPanel.id) ?? '?' : '?';
  const atExtraPinCap = locations.length >= extraPinCap;
  const canStartNewDraft = Boolean(primaryPos && !draftNewExtra && !savingNewExtra && !atExtraPinCap);

  return (
    <div className="space-y-6">
      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="border-emerald-600/40 bg-emerald-950/50 text-emerald-200">Store map</Badge>
        </div>
        <p className="text-sm leading-relaxed text-gray-400">
          All pins are on this one map. <span className="text-gray-200">Drag any pin</span> anywhere — each drop saves
          immediately. When we can read a US ZIP at the pin, we <span className="text-gray-200">turn on that operating area</span>{' '}
          for your store automatically. Reference: <span className="text-gray-300">{anchorLabel}</span>.
        </p>
        {gate && gate.approvedMarketIds.size === 0 ? (
          <p className="mt-2 rounded-md border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100/95">
            No operating areas are toggled on yet — drop a pin on the map in the ZIP you serve (US) and we will enable that
            region for you.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-gray-500">Enabled for your store: {areasLabel}</p>
        <p className="mt-3 text-xs text-gray-600">
          Featured placements may still follow separate admin rules; your map coordinates always save when you drop a pin.
        </p>
      </Card>

      <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Primary pin — address search</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Street, city, state ZIP"
            className="border-green-900/30 bg-gray-950 text-white sm:flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            className="bg-gray-800 text-white hover:bg-gray-700"
            disabled={!token || savingPrimary}
            onClick={() => void movePrimaryToAddress()}
          >
            Move primary to address
          </Button>
        </div>
      </Card>

      {token ? (
        <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-0">
          <div className="border-b border-green-900/20 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-white">Map markers</p>
                <p className="text-sm text-gray-400">
                  <span className="text-gray-200">{pinsOnMapCount}</span> pin{pinsOnMapCount === 1 ? '' : 's'} on this map
                  <span className="text-gray-500"> — </span>
                  <span className="text-gray-200">#1</span> primary
                  {sortedExtrasWithCoords.length > 0 ? (
                    <>
                      <span className="text-gray-500"> · </span>
                      <span className="text-gray-200">{sortedExtrasWithCoords.length}</span> saved extra
                      {sortedExtrasWithCoords.length === 1 ? '' : 's'} with coordinates
                    </>
                  ) : null}
                  {draftNewExtra ? (
                    <>
                      <span className="text-gray-500"> · </span>
                      <span className="text-amber-200/90">1 new draft</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500">
                  Extra rows in your account:{' '}
                  <span className="font-mono text-gray-300">{locations.length}</span>
                  <span className="text-gray-500"> / </span>
                  <span className="font-mono text-gray-200">{extraPinCap}</span> allowed by admin
                  {extrasMissingCoords > 0 ? (
                    <span className="text-amber-600/90">
                      {' '}
                      ({extrasMissingCoords} still need coordinates — add them from the form below or drag a pin after
                      saving.)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500">
                  {atExtraPinCap ? (
                    <>
                      You are at your pin limit — you can <span className="text-gray-200">move or delete</span> extras.
                      Ask an admin to raise your allowance to add more.
                    </>
                  ) : (
                    <>
                      Slots remaining:{' '}
                      <span className="text-gray-200">{Math.max(0, extraPinCap - locations.length)}</span>. The add
                      button is disabled while a draft pin is open or when you have used every slot.
                    </>
                  )}
                </p>
              </div>
              <Button
                type="button"
                className="shrink-0 bg-green-600 hover:bg-green-700"
                disabled={!canStartNewDraft}
                title={atExtraPinCap ? 'At your admin-set pin limit' : undefined}
                onClick={startAddAnotherMarker}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another marker
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              Pin <span className="font-mono text-gray-200">#1</span> = primary store · <span className="font-mono text-gray-200">#2+</span> = extra markers. Drag to move;{' '}
              <span className="text-gray-200">click an extra pin (#2+)</span> to edit its address.
            </p>
            <div className="mt-3 rounded-md border border-green-900/35 bg-black/40 p-3 text-xs text-gray-400">
              <span className="text-slate-200">#1</span> slate ring · <span className="text-emerald-300">#2+</span> green ring ·{' '}
              <span className="text-amber-200">New</span> dashed = not saved yet (starts next to your primary pin).
            </div>
          </div>

          {draftNewExtra ? (
            <div className="border-b border-amber-900/30 bg-amber-950/25 px-6 py-4">
              <p className="text-sm font-medium text-amber-100">New extra pin (draft)</p>
              <p className="mt-1 text-xs text-amber-100/80">
                Placed just east of your primary pin — drag it on the map, then save. We fill the street row from the pin
                when you save.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={savingNewExtra}
                  onClick={() => void saveDraftNewExtra()}
                >
                  {savingNewExtra ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save new marker
                </Button>
                <Button type="button" variant="outline" className="border-gray-600 text-gray-200" onClick={cancelDraftNewExtra}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {focusedExtraId && focusedLocForPanel ? (
            <div className="border-b border-green-900/30 bg-black/45 px-6 py-4">
              <p className="text-sm font-medium text-white">
                Edit extra pin <span className="font-mono text-emerald-300">#{focusedPinN}</span>
                {focusedLocForPanel.label?.trim() ? ` — ${focusedLocForPanel.label}` : ''}
              </p>
              <p className="mt-1 text-xs text-gray-500">Update the address and move the pin, or drag the pin on the map.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-gray-400">Street</Label>
                  <Input
                    value={editExtraAddr}
                    onChange={(e) => setEditExtraAddr(e.target.value)}
                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">City</Label>
                  <Input
                    value={editExtraCity}
                    onChange={(e) => setEditExtraCity(e.target.value)}
                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">State</Label>
                  <Input
                    value={editExtraState}
                    onChange={(e) => setEditExtraState(e.target.value.slice(0, 2).toUpperCase())}
                    maxLength={2}
                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    placeholder="CA"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-gray-400">ZIP</Label>
                  <Input
                    value={editExtraZip}
                    onChange={(e) => setEditExtraZip(e.target.value)}
                    className="mt-1 border-green-900/30 bg-gray-950 text-white"
                    placeholder="90210"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-green-800/50 text-white hover:bg-green-800/70"
                  disabled={savingExtraId === focusedLocForPanel.id}
                  onClick={() => void moveFocusedExtraToAddress()}
                >
                  Move pin to this address
                </Button>
                <Button type="button" variant="outline" className="border-gray-600 text-gray-200" onClick={() => setFocusedExtraId(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          ) : null}

          <div className="h-[min(520px,70vh)] w-full min-h-[360px]">
            <MapGL
              mapboxAccessToken={token}
              initialViewState={{
                longitude: mapCenter.lng,
                latitude: mapCenter.lat,
                zoom: sortedExtrasWithCoords.length > 0 || draftNewExtra ? 10 : 12,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              onClick={() => setFocusedExtraId(null)}
            >
              <NavigationControl position="top-right" />
              <Marker
                key={`primary-${pinBust.primary}`}
                longitude={primaryPos.lng}
                latitude={primaryPos.lat}
                anchor="bottom"
                draggable={!savingPrimary}
                onDragEnd={onPrimaryDragEnd}
              >
                <div
                  className="relative flex h-12 w-12 cursor-grab items-center justify-center rounded-full border-[3px] border-slate-400 bg-gray-900 text-lg font-bold text-slate-100 shadow-lg active:cursor-grabbing"
                  title="Primary store — drag to move"
                >
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-slate-300 bg-gray-950 px-0.5 text-[10px] font-bold leading-none text-slate-200">
                    1
                  </span>
                  {(vendor.name?.trim().charAt(0) || '?').toUpperCase()}
                </div>
              </Marker>
              {sortedExtrasWithCoords.map((loc) => {
                const n = pinNumberByExtraId.get(loc.id) ?? '?';
                const bust = pinBust.extras[loc.id] ?? 0;
                const isFocused = focusedExtraId === loc.id;
                return (
                  <Marker
                    key={`${loc.id}-${bust}`}
                    longitude={loc.lng!}
                    latitude={loc.lat!}
                    anchor="bottom"
                    draggable={savingExtraId !== loc.id}
                    onDragEnd={onExtraDragEnd(loc)}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      title={`Extra pin #${n} — click to edit address`}
                      className={`relative flex h-11 w-11 cursor-grab items-center justify-center rounded-full border-[3px] border-emerald-400 bg-gray-900 text-sm font-bold text-emerald-200 shadow-lg active:cursor-grabbing ${
                        isFocused ? 'ring-2 ring-cyan-400/70' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExtraMarkerActivate(loc);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onExtraMarkerActivate(loc);
                        }
                      }}
                    >
                      {savingExtraId === loc.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                      ) : (
                        n
                      )}
                    </div>
                  </Marker>
                );
              })}
              {draftNewExtra ? (
                <Marker
                  longitude={draftNewExtra.lng}
                  latitude={draftNewExtra.lat}
                  anchor="bottom"
                  draggable={!savingNewExtra}
                  onDragEnd={onDraftNewExtraDragEnd}
                >
                  <div
                    className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full border-[3px] border-dashed border-amber-400 bg-gray-900 text-[10px] font-bold text-amber-200 shadow-lg active:cursor-grabbing"
                    title="New extra pin — drag, then save above"
                    onClick={(e) => e.stopPropagation()}
                  >
                    New
                  </div>
                </Marker>
              ) : null}
            </MapGL>
          </div>
        </Card>
      ) : (
        <Card className="border-amber-900/30 bg-gray-950/80 p-6">
          <p className="text-sm text-amber-100/90">
            Add <code className="rounded bg-black/50 px-1.5 text-green-300">NEXT_PUBLIC_MAPBOX_TOKEN</code> for the
            interactive map. Without it, primary position still loads from your saved profile coordinates.
          </p>
        </Card>
      )}

      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Primary pin — coordinates</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Latitude</label>
            <Input
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="border-green-900/30 bg-gray-950 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Longitude</label>
            <Input
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="border-green-900/30 bg-gray-950 text-white"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-green-800/40 text-gray-200"
            disabled={savingPrimary || !token}
            onClick={() => void applyManualPrimaryCoords()}
          >
            Apply &amp; save primary
          </Button>
        </div>
      </Card>
    </div>
  );
}
