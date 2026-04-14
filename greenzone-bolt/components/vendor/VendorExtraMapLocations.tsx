'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapboxPickerMap, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Plus, Trash2, Pencil, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import {
  mapboxForwardGeocode,
  mapboxReverseGeocodePostcode,
  mapboxReverseGeocodeUsAddress,
  mapboxTokenForGeocode,
} from '@/lib/mapboxGeocode';
import { loadVendorMapAreaGate, type VendorMapAreaGate, zipPrefixFromUsPostcode } from '@/lib/vendorMapAreaGate';
import { enableVendorMarketFromPostcode } from '@/lib/vendorPinMarketEnable';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { parseVendorLocationToLatLng } from '@/lib/parseVendorLocation';
import { DEFAULT_MAP_CENTER } from '@/lib/mapCoordinates';

type LocRow = {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  region_key: string | null;
  market_id: string | null;
  zip_prefix: string | null;
  label: string | null;
  created_at?: string;
};

type PinVariant = 'primary' | 'extra' | 'new';

function NumberedPinBadge({
  label,
  variant,
  interactive = false,
}: {
  label: string | number;
  variant: PinVariant;
  /** Draggable pins use grab cursor; read-only pins do not. */
  interactive?: boolean;
}) {
  const ring =
    variant === 'primary'
      ? 'border-[3px] border-slate-400 bg-gray-900 text-sm font-bold text-slate-100 shadow-lg'
      : variant === 'new'
        ? 'border-[3px] border-dashed border-amber-400 bg-gray-900 text-xs font-bold text-amber-200 shadow-lg'
        : 'border-[3px] border-emerald-400 bg-gray-900 text-sm font-bold text-emerald-200 shadow-lg';
  const cursor = interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default';
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ring} ${cursor} select-none`}>
      {label}
    </div>
  );
}

function effRegion(loc: LocRow): string {
  const rk = loc.region_key?.trim().toUpperCase();
  if (rk) return rk;
  const st = (loc.state ?? '').trim().toUpperCase();
  return st.length >= 2 ? st.slice(0, 2) : '—';
}

function effZipPrefix(loc: LocRow): string | null {
  const z = loc.zip_prefix?.trim();
  if (z && /^\d{3}$/.test(z)) return z;
  const fromZip = loc.zip ? zipPrefixFromUsPostcode(loc.zip) : null;
  return fromZip;
}

type Props = {
  vendor: VendorBusinessRow;
  onChanged: () => void;
  /** When true, skip embedded map (use with `VendorUnifiedStoreMap` on the same page). */
  formOnly?: boolean;
  /** Increment from parent after unified map saves so this panel refetches `vendor_locations`. */
  reloadKey?: number;
};

export function VendorExtraMapLocations({ vendor, onChanged, formOnly = false, reloadKey }: Props) {
  const { toast } = useToast();
  const token = mapboxTokenForGeocode();
  const gateRef = useRef<VendorMapAreaGate | null>(null);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [markerRemountKey, setMarkerRemountKey] = useState(0);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const extraPinCap = Math.max(0, Math.min(500, Math.floor(Number(vendor.extra_map_pins_allowed ?? 0))));
  const atExtraPinCap = locations.length >= extraPinCap;
  const slotsRemaining = Math.max(0, extraPinCap - locations.length);
  const [marketNamesById, setMarketNamesById] = useState<Map<string, string>>(() => new Map());
  const [saving, setSaving] = useState(false);

  const [addr, setAddr] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zip, setZip] = useState('');
  const [label, setLabel] = useState('');
  const [marketId, setMarketId] = useState<string>('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const primaryPoint = useMemo(() => parseVendorLocationToLatLng(vendor.location), [vendor.location]);

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

  const load = useCallback(async () => {
    setLoading(true);
    const gateRes = await loadVendorMapAreaGate(vendor.id);
    gateRef.current = gateRes.ok ? gateRes.gate : null;
    const { data: locData, error: locErr } = await supabase
      .from('vendor_locations')
      .select('id,address,city,state,zip,lat,lng,region_key,market_id,zip_prefix,label,created_at')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (locErr) {
      console.error(locErr);
      setLocations([]);
    } else {
      setLocations((locData || []) as LocRow[]);
    }

    const m = new Map<string, string>();
    if (gateRes.ok) {
      for (const mk of gateRes.gate.enabledMarkets) {
        m.set(mk.id, mk.name);
      }
      const rowMarketIds = Array.from(
        new Set(((locData || []) as { market_id: string | null }[]).map((r) => r.market_id).filter(Boolean))
      ) as string[];
      const missing = rowMarketIds.filter((id) => !m.has(id));
      if (missing.length) {
        const { data: names } = await supabase.from('listing_markets').select('id,name').in('id', missing);
        for (const r of (names || []) as { id: string; name: string }[]) {
          m.set(r.id, r.name);
        }
      }
    }
    setMarketNamesById(m);

    if (!marketId && gateRes.ok && gateRes.gate.approvedMarketIds.size > 0) {
      const first = gateRes.gate.enabledMarkets[0]?.id ?? Array.from(gateRes.gate.approvedMarketIds)[0] ?? '';
      setMarketId(first);
    }

    setLoading(false);
  }, [vendor.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (reloadKey === undefined || reloadKey === 0) return;
    void load();
  }, [reloadKey, load]);

  /** Seed add-mode draft from primary once map is ready (no edit session). */
  useEffect(() => {
    if (formOnly) return;
    if (loading || !token || editingLocationId) return;
    if (mapDraft !== null) return;
    const p = parseVendorLocationToLatLng(vendor.location);
    const next = p ?? { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng };
    setMapDraft(next);
    if (p) {
      setManualLat(p.lat.toFixed(6));
      setManualLng(p.lng.toFixed(6));
    }
  }, [formOnly, loading, token, editingLocationId, mapDraft, vendor.location]);

  const applyReverseToForm = useCallback(async (lng: number, lat: number) => {
    const rev = await mapboxReverseGeocodeUsAddress(lng, lat);
    if (!rev) return;
    setAddr(rev.addressLine);
    if (rev.city) setCity(rev.city);
    if (rev.state) setState(rev.state);
    if (rev.zip) setZip(rev.zip);
  }, []);

  const commitValidatedPosition = useCallback(
    async (lat: number, lng: number, opts: { reverseFill: boolean }) => {
      setMapDraft({ lat, lng });
      setManualLat(lat.toFixed(6));
      setManualLng(lng.toFixed(6));
      if (opts.reverseFill && token) {
        await applyReverseToForm(lng, lat);
      }
    },
    [applyReverseToForm, token]
  );

  const onActivePinMapClick = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      await commitValidatedPosition(next.lat, next.lng, { reverseFill: true });
    },
    [commitValidatedPosition]
  );

  const onActivePinDragEnd = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      await commitValidatedPosition(next.lat, next.lng, { reverseFill: true });
    },
    [commitValidatedPosition]
  );

  const usePrimaryStorePin = useCallback(() => {
    const p = parseVendorLocationToLatLng(vendor.location);
    if (!p) {
      toast({
        title: 'No primary pin yet',
        description: 'Save a map pin on your main store map first, or place this marker using the map or address.',
        variant: 'destructive',
      });
      return;
    }
    void (async () => {
      await commitValidatedPosition(p.lat, p.lng, { reverseFill: true });
      toast({ title: 'Pin set to your primary store location' });
    })();
  }, [vendor.location, toast, commitValidatedPosition]);

  const moveActivePinToAddress = useCallback(async () => {
    const q = `${addr.trim()}, ${city.trim()}, ${state} ${zip.trim()}`.trim();
    if (!q || !state.trim()) {
      toast({
        title: 'Enter an address',
        description: 'Add street and state at minimum, then move the pin.',
        variant: 'destructive',
      });
      return;
    }
    if (!token) {
      toast({ title: 'Mapbox token required', variant: 'destructive' });
      return;
    }
    const hit = await mapboxForwardGeocode(q);
    if (!hit) {
      toast({ title: 'Address not found', variant: 'destructive' });
      return;
    }
    let pc = hit.postcode;
    if (!pc) pc = await mapboxReverseGeocodePostcode(hit.lng, hit.lat);
    if (pc) {
      await enableVendorMarketFromPostcode(vendor.id, pc);
      await load();
    }
    await commitValidatedPosition(hit.lat, hit.lng, { reverseFill: false });
    toast({ title: 'Pin moved', description: hit.placeName });
  }, [addr, city, state, zip, token, toast, commitValidatedPosition, vendor.id, load]);

  const applyManualCoords = useCallback(async () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast({ title: 'Invalid coordinates', variant: 'destructive' });
      return;
    }
    await commitValidatedPosition(lat, lng, { reverseFill: true });
    toast({ title: 'Coordinates applied' });
  }, [manualLat, manualLng, commitValidatedPosition, toast]);

  const mapViewCenter = mapDraft ?? primaryPoint ?? DEFAULT_MAP_CENTER;
  const extraMarkerCount = locations.length;
  const primaryOnMap = primaryPoint != null;
  const extrasWithCoordsCount = sortedExtrasWithCoords.length;
  const pinsVisibleOnStoreMap = (primaryOnMap ? 1 : 0) + extrasWithCoordsCount;

  function beginEditLocation(loc: LocRow) {
    if (loc.lat == null || loc.lng == null || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      toast({
        title: 'No coordinates on file',
        description: 'Use Add a marker to create this pin on the map first.',
        variant: 'destructive',
      });
      return;
    }
    setEditingLocationId(loc.id);
    setAddr(loc.address?.trim() ?? '');
    setCity(loc.city?.trim() ?? '');
    setState((loc.state?.trim() || 'CA').slice(0, 2).toUpperCase() || 'CA');
    setZip(loc.zip?.trim() ?? '');
    setLabel(loc.label?.trim() ?? '');
    setMapDraft({ lat: loc.lat, lng: loc.lng });
    setManualLat(loc.lat.toFixed(6));
    setManualLng(loc.lng.toFixed(6));
    setMapInstanceKey((k) => k + 1);
  }

  function cancelEditLocation() {
    setEditingLocationId(null);
    setAddr('');
    setCity('');
    setZip('');
    setLabel('');
    const p = parseVendorLocationToLatLng(vendor.location);
    if (p) {
      setMapDraft(p);
      setManualLat(p.lat.toFixed(6));
      setManualLng(p.lng.toFixed(6));
    } else {
      setMapDraft({ lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng });
      setManualLat('');
      setManualLng('');
    }
    setMapInstanceKey((k) => k + 1);
  }

  async function saveEditLocationPosition() {
    if (!editingLocationId || !mapDraft) return;
    let pc = await mapboxReverseGeocodePostcode(mapDraft.lng, mapDraft.lat);
    if (pc) {
      await enableVendorMarketFromPostcode(vendor.id, pc);
      await load();
    }

    const zipPrefix = pc ? zipPrefixFromUsPostcode(pc) : null;
    setSaving(true);
    const { error } = await supabase
      .from('vendor_locations')
      .update({
        lat: mapDraft.lat,
        lng: mapDraft.lng,
        address: addr.trim(),
        city: city.trim() || null,
        state: state.trim(),
        zip: zip.trim() || null,
        zip_prefix: zipPrefix,
      })
      .eq('id', editingLocationId)
      .eq('vendor_id', vendor.id);
    setSaving(false);

    if (error) {
      toast({ title: 'Could not save position', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marker position saved' });
    setEditingLocationId(null);
    setAddr('');
    setCity('');
    setZip('');
    setLabel('');
    const p = parseVendorLocationToLatLng(vendor.location);
    if (p) {
      setMapDraft(p);
      setManualLat(p.lat.toFixed(6));
      setManualLng(p.lng.toFixed(6));
    }
    setMapInstanceKey((k) => k + 1);
    await load();
    onChanged();
  }

  async function addLocation() {
    if (editingLocationId) {
      toast({ title: 'Finish map adjustment first', description: 'Save or cancel editing the other pin.', variant: 'destructive' });
      return;
    }
    if (atExtraPinCap) {
      toast({
        title: 'Extra pin limit reached',
        description: 'Ask an admin to increase your allowance, or delete an extra pin to free a slot.',
        variant: 'destructive',
      });
      return;
    }

    let lat: number;
    let lng: number;
    const q = `${addr.trim()}, ${city.trim()}, ${state} ${zip.trim()}`.trim();

    if (manualLat.trim() && manualLng.trim()) {
      if (!token) {
        toast({
          title: 'Mapbox token required',
          description: 'We use it to read the ZIP for your coordinates and match admin operating areas.',
          variant: 'destructive',
        });
        return;
      }
      lat = Number(manualLat);
      lng = Number(manualLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast({ title: 'Invalid coordinates', variant: 'destructive' });
        return;
      }
    } else if (addr.trim() && state.trim()) {
      if (!token) {
        toast({
          title: 'Mapbox token required',
          description: 'Add NEXT_PUBLIC_MAPBOX_TOKEN to geocode the address, or enter lat/lng manually.',
          variant: 'destructive',
        });
        return;
      }
      const hit = await mapboxForwardGeocode(q);
      if (!hit) {
        toast({ title: 'Address not found', variant: 'destructive' });
        return;
      }
      lat = hit.lat;
      lng = hit.lng;
    } else if (mapDraft) {
      if (!token) {
        toast({
          title: 'Mapbox token required',
          description: 'We use it to read the ZIP for your coordinates and match admin operating areas.',
          variant: 'destructive',
        });
        return;
      }
      lat = mapDraft.lat;
      lng = mapDraft.lng;
    } else {
      toast({
        title: 'Address or pin required',
        description: 'Enter street + state (and city/ZIP if you can), place a pin on the map, or type latitude/longitude.',
        variant: 'destructive',
      });
      return;
    }

    let pc = await mapboxReverseGeocodePostcode(lng, lat);
    if (pc) {
      await enableVendorMarketFromPostcode(vendor.id, pc);
      await load();
    }

    const gateRes = await loadVendorMapAreaGate(vendor.id);
    gateRef.current = gateRes.ok ? gateRes.gate : null;
    let resolvedMarketId: string | null = marketId.trim() || null;
    if (!resolvedMarketId && gateRef.current && pc) {
      const pref = zipPrefixFromUsPostcode(pc);
      if (pref) {
        resolvedMarketId = gateRef.current.prefixToMarketId.get(pref) ?? null;
      }
    }

    setSaving(true);
    const zipPrefix = pc ? zipPrefixFromUsPostcode(pc) : null;
    const { error } = await supabase.from('vendor_locations').insert({
      vendor_id: vendor.id,
      address: addr.trim(),
      city: city.trim() || null,
      state: state.trim(),
      zip: zip.trim() || null,
      lat,
      lng,
      label: label.trim() || null,
      market_id: resolvedMarketId,
      zip_prefix: zipPrefix,
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Could not add marker', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Extra map marker added' });
    setAddr('');
    setCity('');
    setZip('');
    setLabel('');
    const p = parseVendorLocationToLatLng(vendor.location);
    if (p) {
      setMapDraft(p);
      setManualLat(p.lat.toFixed(6));
      setManualLng(p.lng.toFixed(6));
    } else {
      setMapDraft({ lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng });
      setManualLat('');
      setManualLng('');
    }
    await load();
    onChanged();
  }

  async function removeLocation(id: string) {
    const { error } = await supabase.from('vendor_locations').delete().eq('id', id).eq('vendor_id', vendor.id);
    if (error) {
      toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marker removed' });
    if (editingLocationId === id) {
      cancelEditLocation();
    }
    await load();
    onChanged();
  }

  const showNewDraftMarker = !editingLocationId && mapDraft;
  const editingLoc = editingLocationId ? locations.find((l) => l.id === editingLocationId) : null;

  if (loading) {
    return (
      <Card className="flex min-h-[120px] items-center justify-center border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h3 className="mb-2 text-lg font-semibold text-white">Extra map markers</h3>
        <p className="text-sm text-gray-400">
          {formOnly ? (
            <>
              Extra storefront or service-area pins live in <code className="text-green-400/90">vendor_locations</code>.
              <span className="text-gray-200"> Drag pins #2+ on the map above</span> to move them; they save automatically.
              Use this section to add new markers (address or coordinates) or remove one.
            </>
          ) : (
            <>
              Add storefront or service-area pins beyond your primary profile pin. Each row is stored as{' '}
              <code className="text-green-400/90">vendor_locations</code>. Your admin sets how many extras you may have;
              you can always move pins or delete one to free a slot for a new pin.
            </>
          )}
        </p>
        <p className="mt-3 rounded-md border border-green-900/30 bg-black/35 px-3 py-2 text-sm text-gray-300">
          <span className="font-medium text-gray-200">Pins on your store map:</span>{' '}
          <span className="text-white">{pinsVisibleOnStoreMap}</span> visible
          <span className="text-gray-500"> — </span>
          <span className="text-gray-200">{primaryOnMap ? 1 : 0}</span> primary
          <span className="text-gray-500"> + </span>
          <span className="text-gray-200">{extrasWithCoordsCount}</span> extra{extrasWithCoordsCount === 1 ? '' : 's'} with coordinates
          <span className="block pt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-300">Admin allowance:</span>{' '}
            <span className="text-gray-200">{extraPinCap}</span> extra pins max ·{' '}
            <span className="font-medium text-gray-300">Slots left:</span>{' '}
            <span className="text-gray-200">{slotsRemaining}</span>
            {formOnly ? (
              <>
                . Use <span className="text-gray-200">Add another marker</span> on the map above when you have slots; it
                starts beside your primary pin. At your limit you can only move or delete pins.
              </>
            ) : (
              <>
                . Pin <span className="text-gray-200">#1</span> is your primary store; extras are{' '}
                <span className="text-gray-200">#2+</span>.
              </>
            )}
          </span>
        </p>
      </Card>

      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h4 className="mb-2 font-medium text-white">
          {!formOnly && editingLocationId ? 'Adjust marker on map' : 'Add a marker'}
        </h4>
        {!formOnly && editingLocationId && editingLoc ? (
          <p className="mb-4 rounded-md border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            Editing pin <span className="font-mono font-semibold">#{pinNumberByExtraId.get(editingLoc.id) ?? '?'}</span>
            {editingLoc.label?.trim() ? ` — ${editingLoc.label}` : ''}. Drag the pin or use the address tools, then save.
          </p>
        ) : null}

        <div className={`grid gap-6 lg:items-start ${formOnly ? '' : 'lg:grid-cols-2'}`}>
          {!formOnly && token ? (
            <div className="min-w-0 space-y-3">
              <div className="rounded-lg border border-green-900/35 bg-black/40 p-3 text-sm">
                <p className="mb-2 font-medium text-white">Pin guide</p>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-400 text-xs font-bold text-slate-100">
                      1
                    </span>
                    <span>
                      <span className="text-gray-200">Primary store</span> — same location as your main store map above
                      (read-only here).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 text-xs font-bold text-emerald-200">
                      2+
                    </span>
                    <span>
                      <span className="text-gray-200">Saved extra markers</span> — numbers match the list below (oldest
                      extra is #2).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-[10px] font-bold text-amber-200">
                      New
                    </span>
                    <span>
                      <span className="text-gray-200">Draft pin</span> — drag this to set where a new extra marker will be
                      added (or adjust an existing pin when editing).
                    </span>
                  </li>
                </ul>
              </div>

              <div className="h-[min(400px,55vh)] w-full min-h-[280px] overflow-hidden rounded-lg border border-green-900/30">
                <MapboxPickerMap
                  key={mapInstanceKey}
                  mapboxAccessToken={token}
                  initialViewState={{
                    longitude: mapViewCenter.lng,
                    latitude: mapViewCenter.lat,
                    zoom: mapDraft ? 12 : 9,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  onClick={onActivePinMapClick}
                >
                  <NavigationControl position="top-right" />
                  {primaryPoint ? (
                    <Marker longitude={primaryPoint.lng} latitude={primaryPoint.lat} anchor="bottom">
                      <NumberedPinBadge label={1} variant="primary" interactive={false} />
                    </Marker>
                  ) : null}

                  {sortedExtrasWithCoords.map((loc) => {
                    if (editingLocationId === loc.id) return null;
                    const n = pinNumberByExtraId.get(loc.id) ?? '?';
                    return (
                      <Marker key={loc.id} longitude={loc.lng!} latitude={loc.lat!} anchor="bottom">
                        <NumberedPinBadge label={n} variant="extra" interactive={false} />
                      </Marker>
                    );
                  })}

                  {editingLocationId && mapDraft ? (
                    <Marker
                      key={`edit-${markerRemountKey}`}
                      longitude={mapDraft.lng}
                      latitude={mapDraft.lat}
                      anchor="bottom"
                      draggable
                      onDragEnd={onActivePinDragEnd}
                    >
                      <NumberedPinBadge
                        label={editingLoc ? (pinNumberByExtraId.get(editingLoc.id) ?? '?') : '?'}
                        variant="extra"
                        interactive
                      />
                    </Marker>
                  ) : null}

                  {showNewDraftMarker ? (
                    <Marker
                      key={`new-${markerRemountKey}`}
                      longitude={mapDraft!.lng}
                      latitude={mapDraft!.lat}
                      anchor="bottom"
                      draggable
                      onDragEnd={onActivePinDragEnd}
                    >
                      <NumberedPinBadge label="New" variant="new" interactive />
                    </Marker>
                  ) : null}
                </MapboxPickerMap>
              </div>
              <p className="text-xs text-gray-500">
                Drag the active pin (green number when editing, dashed &quot;New&quot; when adding) or click the map.
              </p>
            </div>
          ) : !formOnly ? (
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
              Add NEXT_PUBLIC_MAPBOX_TOKEN to use the interactive map and address tools.
            </div>
          ) : null}

          <div className={`grid min-w-0 gap-3 md:grid-cols-2 ${formOnly ? '' : 'lg:grid-cols-1'}`}>
            {!editingLocationId ? (
              <div className="md:col-span-2 lg:col-span-1">
                <Label className="text-gray-400">Operating area (optional)</Label>
                <Select value={marketId || '__auto__'} onValueChange={(v) => setMarketId(v === '__auto__' ? '' : v)}>
                  <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                    <SelectValue placeholder="Auto from pin / address" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 border-green-900/30 bg-gray-950 text-white">
                    <SelectItem value="__auto__">Auto from pin / address</SelectItem>
                    {Array.from(marketNamesById.entries())
                      .sort((a, b) => a[1].localeCompare(b[1]))
                      .map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  When you pick a market, we store it on the row; otherwise we infer from the pin ZIP when possible.
                </p>
              </div>
            ) : !formOnly ? (
              <div className="md:col-span-2 rounded-md border border-green-900/30 bg-gray-950/50 p-3 text-sm text-gray-400 lg:col-span-1">
                Market for this marker:{' '}
                <span className="text-gray-200">
                  {editingLoc?.market_id ? marketNamesById.get(editingLoc.market_id) || editingLoc.market_id : '—'}
                </span>
                . To change operating area, remove and re-add the marker.
              </div>
            ) : null}
            <div className="md:col-span-2 lg:col-span-1">
              <Label className="text-gray-400">Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="Downtown hub / Westside pickup"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <Label className="text-gray-400">Street address</Label>
              <Input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <Label className="text-gray-400">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="mt-1 border-green-900/30 bg-gray-950 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-green-900/30 bg-gray-950 text-white">
                  {US_STATE_OPTIONS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400">ZIP</Label>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
                placeholder="90210"
              />
            </div>

            {!formOnly && token ? (
              <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="bg-green-800/40 text-white hover:bg-green-800/60"
                    onClick={() => void moveActivePinToAddress()}
                  >
                    Move pin to this address
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-green-800/40 text-gray-200"
                    onClick={usePrimaryStorePin}
                  >
                    Use primary store pin
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="md:col-span-2 lg:col-span-1">
              <p className="text-xs text-gray-500">
                {formOnly
                  ? 'Enter a full address (or latitude/longitude), choose an operating area, then Add marker. Move existing extras on the map above.'
                  : 'Coordinates update when you drag the pin or use Move pin. Dragging the pin can auto-fill the address fields when Mapbox returns a match.'}
              </p>
            </div>
            <div>
              <Label className="text-gray-400">Latitude (optional)</Label>
              <Input
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400">Longitude (optional)</Label>
              <Input
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="mt-1 border-green-900/30 bg-gray-950 text-white"
              />
            </div>
            {token ? (
              <div className="md:col-span-2 lg:col-span-1">
                <Button type="button" variant="outline" size="sm" className="border-green-800/40 text-gray-200" onClick={() => void applyManualCoords()}>
                  Apply lat / lng
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {!formOnly && editingLocationId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              disabled={saving}
              onClick={() => void saveEditLocationPosition()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save position
            </Button>
            <Button type="button" variant="outline" className="border-gray-600 text-gray-200" onClick={cancelEditLocation}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            className="mt-4 bg-green-600 hover:bg-green-700"
            disabled={saving || atExtraPinCap}
            title={atExtraPinCap ? 'At your admin-set extra pin limit' : undefined}
            onClick={() => void addLocation()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add marker
          </Button>
        )}
      </Card>

      {locations.length > 0 && (
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <h4 className="mb-3 font-medium text-white">Your extra markers</h4>
          <ul className="space-y-3">
            {locations.map((loc) => {
              const pinN = pinNumberByExtraId.get(loc.id);
              const hasCoords = loc.lat != null && loc.lng != null && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
              return (
                <li
                  key={loc.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-green-900/25 bg-black/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-white">
                      {pinN != null ? (
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border-2 border-emerald-400 px-1 text-xs font-bold text-emerald-200">
                          {pinN}
                        </span>
                      ) : (
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-gray-600 text-xs text-gray-500">
                          —
                        </span>
                      )}
                      <MapPin className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="font-medium">{loc.label?.trim() ? `${loc.label} — ${loc.address}` : loc.address}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {[loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}{' '}
                      {loc.market_id ? (
                        <>
                          · market {marketNamesById.get(loc.market_id) || loc.market_id}
                          {effZipPrefix(loc) ? ` · ZIP ${effZipPrefix(loc)}xx` : ''}
                        </>
                      ) : (
                        <>· legacy area {effRegion(loc)}</>
                      )}
                      {!hasCoords ? (
                        <span className="text-amber-600/90">
                          · Not on map yet — add coordinates via Add a marker.
                        </span>
                      ) : formOnly ? (
                        <span className="text-gray-500"> · Drag this pin on the map above to move it.</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasCoords && !formOnly ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-green-800/50 text-gray-200"
                        onClick={() => beginEditLocation(loc)}
                        disabled={editingLocationId !== null && editingLocationId !== loc.id}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Adjust on map
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-900/40 text-red-300 hover:bg-red-950/40"
                      onClick={() => removeLocation(loc.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
