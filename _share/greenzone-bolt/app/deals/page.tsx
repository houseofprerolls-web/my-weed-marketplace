"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tag, Clock, MapPin, Percent, Store } from 'lucide-react';
import { isVendorsSchema } from '@/lib/vendorSchema';
import { dealAppliesToStoreRegion, formatDealRegionLabel } from '@/lib/dealRegions';
import { US_STATE_OPTIONS } from '@/lib/usStates';
import { useRole } from '@/hooks/useRole';
import { readShopperZip5 } from '@/lib/shopperLocation';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import { fetchApprovedVendorIdsForMarket } from '@/lib/discoverMarketData';

type DealOptions = {
  hero_image_url?: string;
  promo_code?: string;
};

type MarketplaceDeal = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number;
  products: string[];
  deal_options: DealOptions | null;
  region_keys: string[] | null;
  start_date: string;
  end_date: string;
  created_at: string;
  vendors: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    logo_url: string | null;
  } | null;
};

function dealIsDateActive(d: { start_date: string; end_date: string }) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(d.start_date);
  const e = new Date(d.end_date);
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return t >= s && t <= e;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<MarketplaceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>('all');
  const { isAdmin, isVendor } = useRole();
  const shouldGateAreas = isVendorsSchema() && !isAdmin && !isVendor;
  const [approvedVendorIds, setApprovedVendorIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!isVendorsSchema()) {
        if (!cancelled) {
          setDeals([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('deals')
        .select(
          `
          id,
          title,
          description,
          discount_percent,
          products,
          deal_options,
          region_keys,
          start_date,
          end_date,
          created_at,
          vendors!inner ( id, name, slug, city, state, logo_url )
        `
        )
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error('Deals page:', error);
        setDeals([]);
      } else {
        const rows = (data || []) as unknown as MarketplaceDeal[];
        const active = rows.filter((d) => dealIsDateActive(d));
        setDeals(active);
      }

      if (shouldGateAreas) {
        const zip5 = readShopperZip5();
        if (!zip5) {
          setApprovedVendorIds(new Set());
        } else {
          const market = await getMarketForSmokersClub(zip5);
          if (!market) {
            setApprovedVendorIds(new Set());
          } else {
            const approvedIds = await fetchApprovedVendorIdsForMarket(market.id);
            setApprovedVendorIds(approvedIds);
          }
        }
      } else {
        setApprovedVendorIds(null);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldGateAreas]);

  const filtered = useMemo(() => {
    let out = filterState === 'all' ? deals : deals.filter((d) => dealAppliesToStoreRegion(d.region_keys, filterState));
    if (shouldGateAreas && approvedVendorIds) {
      out = out.filter((d) => d.vendors?.id && approvedVendorIds.has(d.vendors.id));
    }
    return out;
  }, [deals, filterState, shouldGateAreas, approvedVendorIds]);

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-green-400">
            <Percent className="h-8 w-8" />
          </div>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">Live store deals</h1>
          <p className="text-xl text-gray-400">
            Promotions from verified shops on the marketplace — same deals you’ll see on each store’s menu.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {!isVendorsSchema() ? (
          <Card className="border-green-900/20 bg-gray-900/50 p-10 text-center text-gray-400">
            Deals load from the licensed vendor catalog. Enable the vendors schema in this environment to browse live
            promotions.
          </Card>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">
                Showing <span className="text-white">{filtered.length}</span> of {deals.length} active deal
                {deals.length !== 1 ? 's' : ''}.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Filter by region</span>
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-[200px] border-green-900/30 bg-gray-900 text-white">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                    <SelectItem value="all">All regions</SelectItem>
                    {US_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="h-80 animate-pulse border-green-900/20 bg-gray-900/50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-green-900/20 bg-gray-900/50 p-12 text-center">
                <Tag className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h2 className="mb-2 text-2xl font-bold">No deals match this filter</h2>
                <p className="mb-6 text-gray-400">Try “All regions” or check back as shops publish new offers.</p>
                <Link href="/dispensaries">
                  <Button className="bg-green-600 hover:bg-green-700">Browse dispensaries</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((deal) => {
                  const v = deal.vendors;
                  if (!v) return null;
                  const img = deal.deal_options?.hero_image_url?.trim();
                  const days = getDaysLeft(deal.end_date);
                  return (
                    <Card
                      key={deal.id}
                      className="group flex flex-col overflow-hidden border-green-900/20 bg-gray-900/50 transition hover:border-green-600/50"
                    >
                      <div className="relative aspect-[16/10] w-full bg-gray-950">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-800/30 to-gray-950">
                            <Percent className="h-14 w-14 text-green-500/40" />
                          </div>
                        )}
                        <Badge className="absolute left-3 top-3 bg-red-600 text-white">
                          {deal.discount_percent}% off
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="mb-1 line-clamp-2 text-lg font-semibold text-white group-hover:text-green-400">
                          {deal.title}
                        </h3>
                        {deal.description && (
                          <p className="mb-3 line-clamp-2 text-sm text-gray-400">{deal.description}</p>
                        )}
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Store className="h-3.5 w-3.5" />
                            {v.name}
                          </span>
                          {(v.city || v.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[v.city, v.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-green-700/40 text-green-300/90">
                            {formatDealRegionLabel(deal.region_keys)}
                          </Badge>
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            <Clock className="mr-1 h-3 w-3" />
                            {days}d left
                          </Badge>
                        </div>
                        {deal.deal_options?.promo_code && (
                          <p className="mb-3 font-mono text-sm text-green-400">Code: {deal.deal_options.promo_code}</p>
                        )}
                        <div className="mt-auto pt-2">
                          <Link href={`/listing/${v.id}`}>
                            <Button className="w-full bg-green-600 hover:bg-green-700">Shop this store</Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
