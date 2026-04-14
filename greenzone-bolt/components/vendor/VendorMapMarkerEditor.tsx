'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import {
  mapboxForwardGeocode,
  mapboxReverseGeocodePostcode,
  mapboxTokenForGeocode,
} from '@/lib/mapboxGeocode';
import { parseVendorLocationToLatLng } from '@/lib/parseVendorLocation';
import {
  loadVendorMapAreaGate,
  MAP_PIN_AREA_NOT_ENABLED,
  postcodeAllowedForVendorMarkets,
  type VendorMapAreaGate,
} from '@/lib/vendorMapAreaGate';

type Props = {
  vendor: VendorBusinessRow;
  onSaved: () => void;
};

function buildAddressQuery(v: VendorBusinessRow): string {
  const parts = [v.address, v.city, v.state, v.zip].filter((p) => p && String(p).trim());
  return parts.join(', ');
}

export function VendorMapMarkerEditor({ vendor, onSaved }: Props) {
  const { toast } = useToast();
  const token = mapboxTokenForGeocode();

  const [gate, setGate] = useState<VendorMapAreaGate | null>(null);
  const [gateLoadError, setGateLoadError] = useState<string | null>(null);
  const [noApprovedAreas, setNoApprovedAreas] = useState(false);
  const gateRef = useRef<VendorMapAreaGate | null>(null);
  gateRef.current = gate;

  const [anchor, setAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [anchorLabel, setAnchorLabel] = useState<string>('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [markerRemountKey, setMarkerRemountKey] = useState(0);

  const locationFingerprint = useMemo(() => {
    try {
      return JSON.stringify(vendor.location ?? null);
    } catch {
      return '';
    }
  }, [vendor.location]);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const validatePlacement = useCallback(
    async (lat: number, lng: number): Promise<boolean> => {
      const g = gateRef.current;
      if (!g || g.approvedMarketIds.size === 0) {
        toast({
          title: MAP_PIN_AREA_NOT_ENABLED,
          description: 'No operating areas are enabled for your store yet.',
          variant: 'destructive',
        });
        return false;
      }
      if (!token) {
        toast({
          title: 'Mapbox token required',
          description:
            'Add NEXT_PUBLIC_MAPBOX_TOKEN so we can match coordinates to a ZIP in your admin-enabled operating areas.',
          variant: 'destructive',
        });
        return false;
      }
      const pc = await mapboxReverseGeocodePostcode(lng, lat);
      if (!pc) {
        toast({
          title: 'Could not detect ZIP',
          description: 'Try another location or use address search.',
          variant: 'destructive',
        });
        return false;
      }
      if (!postcodeAllowedForVendorMarkets(pc, g)) {
        toast({
          title: MAP_PIN_AREA_NOT_ENABLED,
          description: `ZIP ${pc} is outside the regions an administrator has turned on for your store.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    },
    [token, toast]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingInit(true);
      setGateLoadError(null);
      setNoApprovedAreas(false);
      setAnchorError(null);

      const gateRes = await loadVendorMapAreaGate(vendor.id);
      if (cancelled) return;
      if (!gateRes.ok) {
        setGate(null);
        setGateLoadError(gateRes.error);
        setLoadingInit(false);
        return;
      }
      setGate(gateRes.gate);
      if (gateRes.gate.approvedMarketIds.size === 0) {
        setNoApprovedAreas(true);
        setLoadingInit(false);
        return;
      }

      const q = buildAddressQuery(vendor);
      const saved = parseVendorLocationToLatLng(vendor.location);

      if (!token) {
        if (saved) {
          setAnchor(saved);
          setAnchorLabel('Saved map pin');
          setMarker(saved);
          setAddressInput(q.trim() || '');
          setManualLat(saved.lat.toFixed(6));
          setManualLng(saved.lng.toFixed(6));
        } else if (!q.trim()) {
          setAnchor(null);
          setAnchorError('Add a business address on your profile, or add NEXT_PUBLIC_MAPBOX_TOKEN to place your first pin.');
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

      const g = gateRes.gate;
      const start = saved ?? { lat: hit.lat, lng: hit.lng };
      let pcStart = await mapboxReverseGeocodePostcode(start.lng, start.lat);
      if (!pcStart) pcStart = hit.postcode;
      const startOk = pcStart ? postcodeAllowedForVendorMarkets(pcStart, g) : false;

      let placed = start;
      if (!startOk) {
        let pcAddr = hit.postcode;
        if (!pcAddr) pcAddr = await mapboxReverseGeocodePostcode(hit.lng, hit.lat);
        if (pcAddr && postcodeAllowedForVendorMarkets(pcAddr, g)) {
          placed = { lat: hit.lat, lng: hit.lng };
          setMarker(placed);
          toastRef.current({
            title: 'Pin moved to your business address',
            description: 'Your saved pin was outside an admin-enabled operating area.',
          });
        } else {
          placed = start;
          setMarker(start);
          toastRef.current({
            title: 'Pin may be outside enabled areas',
            description: 'Move the pin into a ZIP covered by an operating area your admin turned on, or ask them to enable the right region.',
            variant: 'destructive',
          });
        }
      } else {
        placed = start;
        setMarker(start);
      }

      setAddressInput(q);
      setManualLat(placed.lat.toFixed(6));
      setManualLng(placed.lng.toFixed(6));
      setLoadingInit(false);
    }
    run();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `vendor` object: only re-init when address, location blob, or token change (avoids extra geocode on unrelated re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- granular vendor.* + locationFingerprint
  }, [vendor.id, vendor.address, vendor.city, vendor.state, vendor.zip, locationFingerprint, token]);

  const onDragEnd = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      if (!anchor) return;
      const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const ok = await validatePlacement(next.lat, next.lng);
      if (!ok) {
        setMarkerRemountKey((k) => k + 1);
        return;
      }
      setMarker(next);
      setManualLat(next.lat.toFixed(6));
      setManualLng(next.lng.toFixed(6));
    },
    [anchor, validatePlacement]
  );

  const movePinToAddress = useCallback(async () => {
    if (!gate || gate.approvedMarketIds.size === 0) return;
    const q = addressInput.trim() || buildAddressQuery(vendor);
    if (!q) return;
    const hit = await mapboxForwardGeocode(q);
    if (!hit) {
      toast({ title: 'Address not found', description: 'Try a fuller street address including city and state.', variant: 'destructive' });
      return;
    }
    let pc = hit.postcode;
    if (!pc) pc = await mapboxReverseGeocodePostcode(hit.lng, hit.lat);
    if (!pc || !postcodeAllowedForVendorMarkets(pc, gate)) {
      toast({
        title: MAP_PIN_AREA_NOT_ENABLED,
        description: pc ? `ZIP ${pc} is not covered by an operating area enabled for your store.` : 'Could not read a ZIP for that address.',
        variant: 'destructive',
      });
      return;
    }
    const next = { lat: hit.lat, lng: hit.lng };
    setMarker(next);
    setManualLat(next.lat.toFixed(6));
    setManualLng(next.lng.toFixed(6));
    toast({ title: 'Pin moved', description: hit.placeName });
  }, [addressInput, vendor, gate, toast]);

  const applyManualCoords = useCallback(async () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ title: 'Invalid coordinates', variant: 'destructive' });
      return;
    }
    const ok = await validatePlacement(lat, lng);
    if (!ok) return;
    setMarker({ lat, lng });
    toast({ title: 'Coordinates applied' });
  }, [manualLat, manualLng, validatePlacement, toast]);

  const onMapClick = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      if (!anchor) return;
      const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const ok = await validatePlacement(next.lat, next.lng);
      if (!ok) {
        setMarkerRemountKey((k) => k + 1);
        return;
      }
      setMarker(next);
      setManualLat(next.lat.toFixed(6));
      setManualLng(next.lng.toFixed(6));
    },
    [anchor, validatePlacement]
  );

  async function save() {
    if (!marker || !anchor) return;
    const ok = await validatePlacement(marker.lat, marker.lng);
    if (!ok) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          location: { type: 'Point', coordinates: [marker.lng, marker.lat] },
        })
        .eq('id', vendor.id);

      if (error) throw error;
      toast({ title: 'Map pin saved', description: 'Shoppers will see this location on the map when your store is live.' });
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Could not save', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loadingInit) {
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

  if (noApprovedAreas) {
    return (
      <Card className="border-amber-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-amber-500/80" />
        <p className="text-lg text-white">No operating areas enabled yet</p>
        <p className="mt-3 text-sm text-gray-400">Ask an admin to enable an operating area for your store.</p>
      </Card>
    );
  }

  if (anchorError || !anchor) {
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

  if (!marker) {
    return null;
  }

  const areasLabel =
    gate && gate.enabledMarketNames.length > 0 ? gate.enabledMarketNames.join(' · ') : 'Admin-enabled regions';

  return (
    <div className="space-y-6">
      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="border-emerald-600/40 bg-emerald-950/50 text-emerald-200">Operating areas</Badge>
        </div>
        <p className="text-sm leading-relaxed text-gray-400">
          You can only place your pin where the ZIP matches a region an admin has <span className="text-gray-200">turned on</span>{' '}
          for your store (same toggles as Admin → Vendors). Reference address:{' '}
          <span className="text-gray-300">{anchorLabel}</span>.
        </p>
        <p className="mt-2 text-xs text-gray-500">Enabled for your store: {areasLabel}</p>
        <p className="mt-3 text-xs italic text-amber-200/90">
          {MAP_PIN_AREA_NOT_ENABLED}
        </p>
      </Card>

      <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Address search</h3>
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
            disabled={!token}
            title={!token ? 'Add NEXT_PUBLIC_MAPBOX_TOKEN to search by address' : undefined}
            onClick={movePinToAddress}
          >
            Move pin to address
          </Button>
        </div>
      </Card>

      {token ? (
        <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-0">
          <div className="border-b border-green-900/20 px-6 py-3">
            <p className="text-sm text-gray-400">Drag the pin, or tap the map. Only ZIPs inside your enabled areas stick.</p>
          </div>
          <div className="h-[min(520px,70vh)] w-full min-h-[360px]">
            <Map
              mapboxAccessToken={token}
              initialViewState={{
                longitude: marker.lng,
                latitude: marker.lat,
                zoom: 12,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              onClick={onMapClick}
            >
              <NavigationControl position="top-right" />
              <Marker
                key={markerRemountKey}
                longitude={marker.lng}
                latitude={marker.lat}
                anchor="bottom"
                draggable
                onDragEnd={onDragEnd}
              >
                <div className="relative flex h-12 w-12 cursor-grab items-center justify-center rounded-full border-[3px] border-green-400 bg-gray-900 text-lg font-bold text-green-400 shadow-lg active:cursor-grabbing">
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-green-300 bg-gray-950 px-0.5 text-[10px] font-bold leading-none text-green-300">
                    1
                  </span>
                  {(vendor.name?.trim().charAt(0) || '?').toUpperCase()}
                </div>
              </Marker>
            </Map>
          </div>
          <p className="border-t border-green-900/20 px-6 py-3 text-xs text-gray-500">
            This is your primary map pin (<span className="font-mono text-gray-300">#1</span>). Additional storefront pins
            numbered <span className="text-gray-300">#2+</span> are set in the <span className="text-gray-200">Extra map markers</span>{' '}
            section below.
          </p>
        </Card>
      ) : (
        <Card className="border-amber-900/30 bg-gray-950/80 p-6">
          <p className="text-sm text-amber-100/90">
            Add <code className="rounded bg-black/50 px-1.5 text-green-300">NEXT_PUBLIC_MAPBOX_TOKEN</code> for an
            interactive map and ZIP checks. Without it, use coordinates below only if your environment already validated them.
          </p>
        </Card>
      )}

      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Coordinates</h3>
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
          <Button type="button" variant="outline" className="border-green-800/40 text-gray-200" onClick={applyManualCoords}>
            Apply
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saving || !marker || !token}
          title={!token ? 'Add Mapbox token to verify ZIP before save' : undefined}
          onClick={save}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save map pin
        </Button>
      </div>
    </div>
  );
}
