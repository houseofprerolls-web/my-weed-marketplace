'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { VendorBusinessRow } from '@/hooks/useVendorBusiness';
import {
  mapboxForwardGeocode,
  mapboxReverseGeocodePostcode,
  mapboxTokenForGeocode,
} from '@/lib/mapboxGeocode';
import {
  loadVendorMapAreaGate,
  MAP_PIN_AREA_NOT_ENABLED,
  postcodeAllowedForVendorMarkets,
} from '@/lib/vendorMapAreaGate';
import { US_STATE_OPTIONS } from '@/lib/usStates';

type LocRow = {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  region_key: string | null;
};

type QuotaRow = { id: string; region_key: string; max_markers: number };

function effRegion(loc: LocRow): string {
  const rk = loc.region_key?.trim().toUpperCase();
  if (rk) return rk;
  const st = (loc.state ?? '').trim().toUpperCase();
  return st.length >= 2 ? st.slice(0, 2) : '—';
}

type Props = {
  vendor: VendorBusinessRow;
  onChanged: () => void;
};

export function VendorExtraMapLocations({ vendor, onChanged }: Props) {
  const { toast } = useToast();
  const token = mapboxTokenForGeocode();

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [gateOk, setGateOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addr, setAddr] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zip, setZip] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const gateRes = await loadVendorMapAreaGate(vendor.id);
    setGateOk(gateRes.ok && gateRes.gate.approvedMarketIds.size > 0);

    const [{ data: locData, error: locErr }, { data: qData }] = await Promise.all([
      supabase
        .from('vendor_locations')
        .select('id,address,city,state,zip,lat,lng,region_key')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false }),
      supabase.from('vendor_region_marker_quotas').select('id,region_key,max_markers').eq('vendor_id', vendor.id),
    ]);

    if (locErr) {
      console.error(locErr);
      setLocations([]);
    } else {
      setLocations((locData || []) as LocRow[]);
    }
    setQuotas((qData || []) as QuotaRow[]);
    setLoading(false);
  }, [vendor.id]);

  useEffect(() => {
    load();
  }, [load]);

  const countsByRegion = useMemo(() => {
    const m = new Map<string, number>();
    for (const loc of locations) {
      const k = effRegion(loc);
      if (k === '—') continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [locations]);

  const maxFor = useCallback(
    (region: string) => {
      const q = quotas.find((x) => x.region_key.toUpperCase() === region.toUpperCase());
      return q?.max_markers ?? 1;
    },
    [quotas]
  );

  async function addLocation() {
    if (!gateOk) {
      toast({
        title: MAP_PIN_AREA_NOT_ENABLED,
        description: 'Enable at least one operating area before adding extra pins.',
        variant: 'destructive',
      });
      return;
    }
    const gateRes = await loadVendorMapAreaGate(vendor.id);
    if (!gateRes.ok || gateRes.gate.approvedMarketIds.size === 0) {
      toast({ title: 'Areas not ready', variant: 'destructive' });
      return;
    }
    const gate = gateRes.gate;

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
    } else {
      if (!addr.trim() || !state.trim()) {
        toast({ title: 'Address and state required', variant: 'destructive' });
        return;
      }
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
    }

    let pc = await mapboxReverseGeocodePostcode(lng, lat);
    if (!pc && token) {
      toast({ title: 'Could not detect ZIP', description: 'Check the pin position.', variant: 'destructive' });
      return;
    }
    if (pc && !postcodeAllowedForVendorMarkets(pc, gate)) {
      toast({
        title: MAP_PIN_AREA_NOT_ENABLED,
        description: `ZIP ${pc} is outside admin-enabled operating areas.`,
        variant: 'destructive',
      });
      return;
    }

    const rk = state.trim().toUpperCase().slice(0, 2);
    const current = countsByRegion.get(rk) || 0;
    if (current >= maxFor(rk)) {
      toast({
        title: 'Marker limit reached',
        description: `Your administrator allows ${maxFor(rk)} extra marker(s) in ${rk}. Ask them to raise the quota or remove a pin.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('vendor_locations').insert({
      vendor_id: vendor.id,
      address: addr.trim(),
      city: city.trim() || null,
      state: state.trim(),
      zip: zip.trim() || null,
      lat,
      lng,
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
    setManualLat('');
    setManualLng('');
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
    await load();
    onChanged();
  }

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
          Add more storefront or service-area pins beyond your primary profile pin. Each row is stored as{' '}
          <code className="text-green-400/90">vendor_locations</code>. Platform admins set how many pins you may place per
          state (default <span className="text-gray-200">1</span> per region until they raise it).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(countsByRegion.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([reg, n]) => (
              <Badge key={reg} variant="outline" className="border-green-800/50 text-gray-200">
                {reg}: {n} / {maxFor(reg)}
              </Badge>
            ))}
          {countsByRegion.size === 0 && (
            <span className="text-xs text-gray-500">No extra markers yet — counts appear by state.</span>
          )}
        </div>
      </Card>

      <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
        <h4 className="mb-4 font-medium text-white">Add a marker</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
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
          <div className="flex items-end">
            <p className="text-xs text-gray-500">
              Or enter coordinates instead of using address search (ZIP validation still applies when Mapbox is configured).
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
        </div>
        <Button
          type="button"
          className="mt-4 bg-green-600 hover:bg-green-700"
          disabled={saving || !gateOk}
          onClick={addLocation}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add marker
        </Button>
      </Card>

      {locations.length > 0 && (
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-6">
          <h4 className="mb-3 font-medium text-white">Your extra markers</h4>
          <ul className="space-y-3">
            {locations.map((loc) => (
              <li
                key={loc.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-green-900/25 bg-black/30 p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm text-white">
                    <MapPin className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="font-medium">{loc.address}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {[loc.city, loc.state, loc.zip].filter(Boolean).join(', ')} · region {effRegion(loc)}
                  </p>
                </div>
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
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
