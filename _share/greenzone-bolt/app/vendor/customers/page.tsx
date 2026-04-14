'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VendorSubpageLayout } from '@/components/vendor/VendorSubpageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { supabase } from '@/lib/supabase';

type OrderRow = {
  id: string;
  consumer_id: string | null;
  total_cents: number;
  created_at: string;
  customer_phone: string | null;
};

type CustomerAgg = {
  key: string;
  label: string;
  detail: string;
  orderCount: number;
  spentCents: number;
  lastOrderAt: string;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function aggregateCustomers(rows: OrderRow[]): CustomerAgg[] {
  const map = new Map<string, CustomerAgg>();

  for (const o of rows) {
    const isRegistered = Boolean(o.consumer_id);
    const key = o.consumer_id ?? `guest:${o.customer_phone || o.id}`;
    const existing = map.get(key);
    const spent = o.total_cents || 0;
    const created = o.created_at;

    if (existing) {
      existing.orderCount += 1;
      existing.spentCents += spent;
      if (created > existing.lastOrderAt) existing.lastOrderAt = created;
    } else {
      let label: string;
      let detail: string;
      if (isRegistered && o.consumer_id) {
        label = 'Registered shopper';
        detail = `Account ${shortId(o.consumer_id)}`;
      } else if (o.customer_phone?.trim()) {
        label = 'Guest checkout';
        detail = o.customer_phone.trim();
      } else {
        label = 'Guest checkout';
        detail = `Order ${shortId(o.id)}`;
      }
      map.set(key, {
        key,
        label,
        detail,
        orderCount: 1,
        spentCents: spent,
        lastOrderAt: created,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : -1));
}

export default function VendorCustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const { vendor, loading: vLoading, vendorsMode, mayEnterVendorShell } = useVendorBusiness();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    if (!vendor?.id || !vendorsMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('orders')
      .select('id, consumer_id, total_cents, created_at, customer_phone')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      setOrders([]);
    } else {
      setOrders((data || []) as OrderRow[]);
    }
    setLoading(false);
  }, [vendor?.id, vendorsMode]);

  useEffect(() => {
    load();
  }, [load]);

  const customers = useMemo(() => aggregateCustomers(orders), [orders]);

  const filteredCustomers = useMemo(() => {
    const t = searchQuery.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(
      (c) =>
        c.label.toLowerCase().includes(t) ||
        c.detail.toLowerCase().includes(t) ||
        c.key.toLowerCase().includes(t)
    );
  }, [customers, searchQuery]);

  if (authLoading || vLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
      </div>
    );
  }

  if (!user || !mayEnterVendorShell) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">You need a linked dispensary to open this page.</p>
      </div>
    );
  }

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <p className="text-gray-400">
          This area requires <code className="text-green-400">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>.
        </p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-gray-400">No dispensary linked to this account.</p>
      </div>
    );
  }

  return (
    <VendorSubpageLayout
      title={`Customers — ${vendor.name}`}
      subtitle="Unique shoppers derived from orders to your store (registered accounts and guest checkouts)."
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-lime" />
        </div>
      ) : loadError ? (
        <Card className="border-red-900/40 bg-gray-900/80 p-6 text-red-200">{loadError}</Card>
      ) : customers.length === 0 ? (
        <Card className="border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-10 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <p className="text-lg text-white">No customers yet</p>
          <p className="mt-2 text-sm text-gray-400">
            When shoppers place orders, they&apos;ll appear here with order counts and spend totals.
          </p>
          <Link
            href="/vendor/orders"
            className="mt-6 inline-block text-sm font-medium text-green-400 hover:text-green-300 hover:underline"
          >
            View orders
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black">
          <div className="space-y-4 border-b border-green-900/20 px-6 py-4">
            <p className="text-sm text-gray-400">
              {customers.length} unique {customers.length === 1 ? 'customer' : 'customers'} · {orders.length} total{' '}
              {orders.length === 1 ? 'order' : 'orders'}
              {searchQuery.trim() && (
                <span className="text-gray-500">
                  {' '}
                  · Showing {filteredCustomers.length} match{filteredCustomers.length !== 1 ? 'es' : ''}
                </span>
              )}
            </p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by phone, account id, or label…"
                className="border-green-900/30 bg-gray-950 pl-10 text-white placeholder:text-gray-600"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-green-900/20 hover:bg-transparent">
                <TableHead className="text-gray-300">Customer</TableHead>
                <TableHead className="text-right text-gray-300">Orders</TableHead>
                <TableHead className="text-right text-gray-300">Total spent</TableHead>
                <TableHead className="text-gray-300">Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-gray-500">
                    No customers match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                <TableRow key={c.key} className="border-green-900/15">
                  <TableCell>
                    <div className="font-medium text-white">{c.label}</div>
                    <div className="text-xs text-gray-500">{c.detail}</div>
                  </TableCell>
                  <TableCell className="text-right text-gray-200">{c.orderCount}</TableCell>
                  <TableCell className="text-right text-green-400">{formatUsd(c.spentCents)}</TableCell>
                  <TableCell className="text-gray-400">
                    {new Date(c.lastOrderAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </VendorSubpageLayout>
  );
}
