'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  BookOpen,
  Sparkles,
  Receipt,
  ShieldAlert,
  Gift,
  History,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Users,
  Mail,
  Home,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useEffect, useState } from 'react';
import { MobileAppBackButton } from '@/components/MobileAppBackButton';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { useAdminWorkspaceRegion } from '@/contexts/AdminRegionContext';
import type { AdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true as const },
  { href: '/admin/users', label: 'Users', icon: Users, exact: true as const },
  { href: '/admin/vendors', label: 'Vendors', icon: Store, exact: false as const },
  { href: '/admin/marketplace', label: 'Marketplace', icon: ShoppingBag, exact: false as const },
  { href: '/admin/catalog', label: 'Catalog', icon: BookOpen, exact: false as const },
  { href: '/admin/brand-pages', label: 'Brand pages', icon: Sparkles, exact: true as const },
  { href: '/admin/supply', label: 'Supply B2B', icon: Package, exact: true as const },
  { href: '/admin/billing', label: 'Billing', icon: Receipt, exact: true as const },
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert, exact: false as const },
  { href: '/admin/loyalty', label: 'Loyalty', icon: Gift, exact: false as const },
  { href: '/admin/activity-log', label: 'Activity log', icon: History, exact: false as const },
  { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false as const },
] as const;

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isMasterAdmin, isAdmin } = useRole();
  const [modAlert, setModAlert] = useState(0);
  const [billingOverdue, setBillingOverdue] = useState(0);
  const [billingSoon, setBillingSoon] = useState(0);
  const { region: workspaceRegion, setRegion: setWorkspaceRegion } = useAdminWorkspaceRegion();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const narrow = window.matchMedia('(max-width: 767px)');
    setCollapsed(narrow.matches);
    const onChange = () => setCollapsed(narrow.matches);
    narrow.addEventListener('change', onChange);
    return () => narrow.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token || cancelled) return;
      const res = await fetch('/api/admin/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        stats?: {
          totalReports?: number;
          billingOverdueCount?: number;
          billingDueSoonCount?: number;
        };
        reviewReports?: { status?: string }[];
      };
      if (cancelled || !j.stats) return;
      const pendingReviews = (j.reviewReports || []).filter((r) => r.status === 'pending').length;
      setModAlert((j.stats.totalReports ?? 0) + pendingReviews);
      setBillingOverdue(Number(j.stats.billingOverdueCount) || 0);
      setBillingSoon(Number(j.stats.billingDueSoonCount) || 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100 md:min-h-screen">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <div className="flex min-h-0 flex-1 flex-col md:min-h-screen md:flex-row">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-zinc-800 bg-zinc-900/95 backdrop-blur-sm transition-[width] duration-200 ease-out md:border-r',
            'max-md:border-b max-md:max-h-[min(38vh,16rem)] max-md:min-h-0 max-md:overflow-y-auto',
            collapsed ? 'w-[4.25rem]' : 'w-full min-w-0 sm:w-56 md:w-60'
          )}
          aria-label="Admin navigation"
        >
          <div className="flex h-11 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-2 md:h-14 md:px-3">
            <MobileAppBackButton
              fallbackHref="/admin"
              className="text-zinc-200 hover:bg-zinc-800 hover:text-white"
            />
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Link
                  href="/admin"
                  className="truncate text-sm font-semibold tracking-tight text-white hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded-sm"
                >
                  Admin
                </Link>
                <ToggleGroup
                  type="single"
                  value={workspaceRegion}
                  onValueChange={(v) => {
                    if (v) setWorkspaceRegion(v as AdminWorkspaceRegion);
                  }}
                  className="flex justify-start gap-0 rounded-md bg-zinc-800/80 p-0.5"
                  aria-label="Workspace region"
                >
                  <ToggleGroupItem
                    value="all"
                    aria-label="All regions"
                    className="h-7 flex-1 px-1.5 text-[10px] font-medium data-[state=on]:bg-zinc-700 data-[state=on]:text-white"
                  >
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="ca"
                    aria-label="California workspace"
                    className="h-7 flex-1 px-1.5 text-[10px] font-medium data-[state=on]:bg-emerald-900/80 data-[state=on]:text-emerald-100"
                  >
                    CA
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="ny"
                    aria-label="New York workspace"
                    className="h-7 flex-1 px-1.5 text-[10px] font-medium data-[state=on]:bg-emerald-900/80 data-[state=on]:text-emerald-100"
                  >
                    NY
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-expanded={!collapsed}
              aria-controls="admin-sidebar-nav"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelLeft className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
              <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
            </Button>
          </div>
          <nav
            id="admin-sidebar-nav"
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
          >
            {isMasterAdmin && (
              <Link
                href="/admin/outreach"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                  pathname === '/admin/outreach' || pathname.startsWith('/admin/outreach/')
                    ? 'bg-emerald-950/80 text-emerald-100 ring-1 ring-emerald-800/60'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100'
                )}
                aria-current={pathname.startsWith('/admin/outreach') ? 'page' : undefined}
                title={collapsed ? 'Outreach' : undefined}
              >
                <Mail className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">Outreach</span>}
              </Link>
            )}
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const showModBadge = item.href === '/admin/moderation' && modAlert > 0;
              const showBillingBadges =
                item.href === '/admin/billing' && (billingOverdue > 0 || billingSoon > 0);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                    active
                      ? 'bg-emerald-950/80 text-emerald-100 ring-1 ring-emerald-800/60'
                      : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100'
                  )}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {showModBadge && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600/90 px-1.5 text-[10px] font-bold text-white">
                          {modAlert > 99 ? '99+' : modAlert}
                        </span>
                      )}
                      {showBillingBadges && (
                        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                          {billingOverdue > 0 ? (
                            <span className="rounded-md bg-red-950/90 px-1.5 py-0 text-[10px] font-medium text-red-200">
                              {billingOverdue} overdue
                            </span>
                          ) : null}
                          {billingSoon > 0 ? (
                            <span className="rounded-md border border-amber-800/50 bg-amber-950/50 px-1.5 py-0 text-[10px] text-amber-200">
                              {billingSoon} soon
                            </span>
                          ) : null}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && showModBadge && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                  )}
                  {collapsed && showBillingBadges && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 h-2 w-2 rounded-full',
                        billingOverdue > 0 ? 'bg-red-500' : 'bg-amber-500'
                      )}
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 rounded-lg border border-zinc-700/70 bg-zinc-800/50 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors',
                'hover:border-emerald-800/50 hover:bg-zinc-800 hover:text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? 'Exit admin — return to site' : undefined}
            >
              <Home className="h-4 w-4 shrink-0 text-emerald-400/90" aria-hidden />
              {!collapsed ? <span className="truncate">Exit admin</span> : null}
              {collapsed ? <span className="sr-only">Exit admin — return to site</span> : null}
            </Link>
          </nav>
          {!collapsed && isMasterAdmin && (
            <div className="border-t border-zinc-800 p-3 text-[11px] leading-snug text-zinc-500">
              Master admin: junior admins &amp; sensitive tools live under Settings.
            </div>
          )}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <main
            id="admin-main"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden outline-none [-webkit-overflow-scrolling:touch]"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
