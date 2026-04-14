'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Loader2,
  LayoutList,
  Inbox,
  LayoutDashboard,
  MapPin,
  ImageIcon,
  BarChart3,
  Tag,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSupplyPortalAccess } from '@/hooks/useSupplyPortalAccess';
import { isSupplyExchangeEnabled } from '@/lib/supplyExchange';
import { cn } from '@/lib/utils';

function navActive(pathname: string, accountId: string, key: string): boolean {
  const base = `/supply/${accountId}`;
  if (key === 'overview') {
    return pathname === base || pathname.startsWith(`${base}/dashboard`);
  }
  if (key === 'products') return pathname.includes(`${base}/listings`);
  if (key === 'brand') return pathname.includes(`${base}/brand-showcase`);
  if (key === 'service') return pathname.includes(`${base}/service-areas`);
  if (key === 'catalog') return pathname.includes(`${base}/catalog-media`);
  if (key === 'analytics') return pathname.includes(`${base}/analytics`);
  if (key === 'deals') return pathname.includes(`${base}/deals`);
  if (key === 'rfqs') return pathname.includes(`${base}/rfqs`);
  return false;
}

export function SupplyPortalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdminDashboard } = useRole();
  const { mayAccess, loading, assignments } = useSupplyPortalAccess(user?.id, {
    treatAsAdmin: canAccessAdminDashboard,
  });
  const enabled = isSupplyExchangeEnabled();

  useEffect(() => {
    if (authLoading || loading) return;
    if (!enabled) router.replace('/');
    else if (!user) router.replace('/?login=true&redirect=/supply');
    else if (!mayAccess) router.replace('/');
  }, [authLoading, loading, enabled, mayAccess, user, router]);

  if (!enabled || authLoading || loading || !user || !mayAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  const accountIdFromPath = pathname.match(/^\/supply\/([^/]+)/)?.[1];
  const activeAccountId =
    accountIdFromPath && accountIdFromPath !== 'page' ? accountIdFromPath : assignments[0]?.supply_account_id;

  const linkClass = (key: string) =>
    cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
      activeAccountId && navActive(pathname, activeAccountId, key)
        ? 'bg-green-900/30 text-green-300'
        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
    );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-black/80 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/supply" className="text-lg font-semibold text-white hover:text-green-400">
            Supply portal
          </Link>
          {assignments.length > 1 ? (
            <select
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
              value={activeAccountId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                router.push(`/supply/${id}/dashboard`);
              }}
            >
              {assignments.map((a) => (
                <option key={a.supply_account_id} value={a.supply_account_id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        {activeAccountId ? (
          <aside
            className={cn(
              'flex shrink-0 flex-col gap-2 md:w-52',
              'max-h-[min(52vh,24rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] md:max-h-none md:overflow-visible'
            )}
          >
            <Link href={`/supply/${activeAccountId}/dashboard`} className={linkClass('overview')}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Overview
            </Link>
            <Link href={`/supply/${activeAccountId}/listings`} className={linkClass('products')}>
              <LayoutList className="h-4 w-4 shrink-0" />
              Products
            </Link>
            <Link href={`/supply/${activeAccountId}/brand-showcase`} className={linkClass('brand')}>
              <Sparkles className="h-4 w-4 shrink-0" />
              Brand on site
            </Link>
            <Link href={`/supply/${activeAccountId}/service-areas`} className={linkClass('service')}>
              <MapPin className="h-4 w-4 shrink-0" />
              Service areas
            </Link>
            <Link href={`/supply/${activeAccountId}/catalog-media`} className={linkClass('catalog')}>
              <ImageIcon className="h-4 w-4 shrink-0" />
              Catalog media
            </Link>
            <Link href={`/supply/${activeAccountId}/analytics`} className={linkClass('analytics')}>
              <BarChart3 className="h-4 w-4 shrink-0" />
              Analytics
            </Link>
            <Link href={`/supply/${activeAccountId}/deals`} className={linkClass('deals')}>
              <Tag className="h-4 w-4 shrink-0" />
              Deals
            </Link>
            <Link
              href={`/supply/${activeAccountId}/rfqs`}
              className={linkClass('rfqs')}
              title="Request for Quote: retail buyers ask for wholesale pricing on your products."
            >
              <Inbox className="h-4 w-4 shrink-0" />
              RFQs
            </Link>
          </aside>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
