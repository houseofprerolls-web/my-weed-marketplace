"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  User,
  Menu,
  Chrome as Home,
  Leaf,
  TrendingUp,
  Map,
  Shield,
  Store,
  Package,
  LogOut,
  Tag,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { AuthModal } from './auth/AuthModal';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeaderShopperLocation } from '@/components/HeaderShopperLocation';
import { DaTreehouseLoyaltyHeader } from '@/components/loyalty/DaTreehouseLoyaltyHeader';
import { useRole } from '@/hooks/useRole';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { listingHrefForVendor } from '@/lib/listingPath';
import { useBrandPortalAccess } from '@/hooks/useBrandPortalAccess';
import { useSupplyPortalAccess } from '@/hooks/useSupplyPortalAccess';
import { isSupplyExchangeEnabled } from '@/lib/supplyExchange';
import { MobileAppBackButton } from '@/components/MobileAppBackButton';

type BrowseLink = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  accent: string;
};

/** Shared between phone quick row and left sidebar sheet (tablet + phone). */
const HEADER_BROWSE_LINKS: BrowseLink[] = [
  { href: '/discover', label: 'Discover', Icon: Home, accent: 'text-brand-lime' },
  { href: '/map', label: 'Map', Icon: Map, accent: 'text-emerald-400' },
  { href: '/feed', label: 'Feed', Icon: TrendingUp, accent: 'text-sky-400' },
  { href: '/strains', label: 'Strains', Icon: Leaf, accent: 'text-lime-400' },
  { href: '/brands', label: 'Brands', Icon: Sparkles, accent: 'text-violet-300' },
  { href: '/deals', label: 'Deals', Icon: Tag, accent: 'text-amber-300' },
];

const GlobalSearch = dynamic(
  () => import('@/components/search/GlobalSearch').then((m) => ({ default: m.GlobalSearch })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-9 w-9 shrink-0 rounded-md bg-zinc-900/60 animate-pulse md:h-9 md:w-72"
        aria-hidden
      />
    ),
  },
);

export function Header() {
  const pathname = usePathname() || '';
  const { user, profile, signOut } = useAuth();
  const { canAccessAdminDashboard } = useRole();
  const { totalItems } = useCart();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, mayEnterVendorShell } = useVendorBusiness({ adminMenuVendorId });
  const vendorDashHref = withAdminVendorQuery('/vendor/dashboard', adminMenuVendorId);
  const { mayAccess: mayEnterBrandPortal, loading: brandPortalLoading } = useBrandPortalAccess(user?.id, {
    treatAsAdmin: canAccessAdminDashboard,
  });
  const { mayAccess: mayEnterSupplyPortal, loading: supplyPortalLoading } = useSupplyPortalAccess(user?.id, {
    treatAsAdmin: canAccessAdminDashboard,
  });
  const maySupplyWorkspace = isSupplyExchangeEnabled() && !supplyPortalLoading && mayEnterSupplyPortal;

  const showWorkspacesMenu =
    Boolean(user) &&
    !brandPortalLoading &&
    (canAccessAdminDashboard || mayEnterVendorShell || mayEnterBrandPortal || maySupplyWorkspace);

  useEffect(() => {
    const open = () => setAuthModalOpen(true);
    window.addEventListener('datreehouse:open-auth', open);
    return () => window.removeEventListener('datreehouse:open-auth', open);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[55] border-b border-brand-red/25 bg-black/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex h-12 min-h-12 items-center justify-between gap-2 md:h-16 md:min-h-[4rem]">
            <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
              <MobileAppBackButton fallbackHref="/discover" when={pathname !== '/'} />
              <BrandLogo priority />
            </div>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 px-1 xl:flex xl:gap-1">
              <Link href="/discover">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Home className="mr-2 h-4 w-4" />
                  Discover
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Map className="mr-2 h-4 w-4" />
                  Map
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Feed
                </Button>
              </Link>
              <Link href="/strains">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Leaf className="mr-2 h-4 w-4 text-brand-lime" />
                  Strains
                </Button>
              </Link>
              <Link href="/brands">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Sparkles className="mr-2 h-4 w-4 text-violet-300" />
                  Brands
                </Button>
              </Link>
              <Link href="/deals">
                <Button variant="ghost" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  Deals
                </Button>
              </Link>
              <Link href="/vendor/onboarding">
                <Button variant="ghost" className="whitespace-nowrap text-brand-lime hover:bg-brand-lime/10 hover:text-brand-lime-soft lg:px-3">
                  <Store className="mr-2 h-4 w-4" />
                  <span className="hidden xl:inline">List your business</span>
                  <span className="xl:hidden">List business</span>
                </Button>
              </Link>
            </nav>

            <div className="flex shrink-0 items-center space-x-1 sm:space-x-2 md:space-x-4">
              {user ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white xl:hidden"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : null}

              <div className="xl:hidden">
                <GlobalSearch variant="mobileIcon" />
              </div>

              {!user ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="shrink-0 bg-brand-red px-3 text-xs font-semibold text-white hover:bg-brand-red-deep xl:hidden"
                >
                  Sign in
                </Button>
              ) : null}

              {user ? (
                <div className="hidden items-center space-x-2 xl:flex">
                  {showWorkspacesMenu ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 text-brand-lime hover:bg-brand-lime/10 hover:text-brand-lime-soft"
                      aria-label="Open workspaces menu"
                      aria-expanded={workspacesOpen}
                      onClick={() => setWorkspacesOpen(true)}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Workspaces
                    </Button>
                  ) : null}
                  <Link href="/account/orders">
                    <Button variant="ghost" className="text-gray-300 hover:text-white">
                      <Package className="mr-2 h-4 w-4" />
                      My orders
                    </Button>
                  </Link>
                  <Link href="/account">
                    <Button variant="ghost" className="text-white">
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={signOut} className="text-white">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden bg-brand-red text-white hover:bg-brand-red-deep xl:flex"
                >
                  Sign In
                </Button>
              )}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 text-white xl:hidden md:min-h-10 md:min-w-10"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex h-full max-h-[100dvh] w-[min(100vw,22rem)] max-w-[100vw] flex-col overflow-hidden border-brand-red/20 bg-black pb-[env(safe-area-inset-bottom,0px)] sm:w-96"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Site menu</SheetTitle>
                    <SheetDescription>Navigation and account</SheetDescription>
                  </SheetHeader>
                  <div className="mt-12 shrink-0 border-b border-brand-red/20 pb-4 xl:hidden">
                    <HeaderShopperLocation variant="sheet" />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                    {user && showWorkspacesMenu ? (
                      <nav className="flex shrink-0 flex-col gap-1 border-b border-brand-red/15 py-4">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Workspaces</p>
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-lime transition hover:bg-brand-lime/10 hover:text-brand-lime-soft"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setWorkspacesOpen(true);
                          }}
                        >
                          <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
                          Open workspaces…
                        </button>
                      </nav>
                    ) : null}
                    <nav className="flex shrink-0 flex-col gap-1 border-b border-brand-red/15 py-4">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Browse</p>
                      {HEADER_BROWSE_LINKS.map(({ href, label, Icon, accent }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-brand-red/10 hover:text-white"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${accent}`} aria-hidden />
                          {label}
                        </Link>
                      ))}
                      <Link
                        href="/vendor/onboarding"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-lime transition hover:bg-brand-lime/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Store className="h-5 w-5 shrink-0" aria-hidden />
                        List your business
                      </Link>
                    </nav>
                    <Link
                      href="/cart"
                      className="mt-4 flex shrink-0 items-center justify-between rounded-lg border border-brand-red/25 bg-zinc-950/80 px-4 py-3 text-white transition hover:border-brand-red/40 hover:bg-brand-red/5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-brand-lime" aria-hidden />
                        <span className="font-medium">Cart</span>
                      </span>
                      {totalItems > 0 ? (
                        <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-red px-2 text-xs font-semibold">
                          {totalItems}
                        </span>
                      ) : null}
                    </Link>
                    <nav className="mt-4 flex flex-col space-y-4 pb-8">
                      {user ? (
                        <>
                          {mayEnterVendorShell && vendor?.id ? (
                            <Link
                              href={listingHrefForVendor({ id: vendor.id, slug: vendor.slug })}
                              className="py-2 text-gray-300 transition hover:text-white"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              View storefront
                            </Link>
                          ) : null}
                          <Link
                            href="/account/orders"
                            className="py-2 text-gray-300 transition hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            My orders
                          </Link>
                          <Link
                            href="/account"
                            className="py-2 text-gray-300 transition hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            My Account
                          </Link>
                          <button
                            onClick={() => {
                              signOut();
                              setMobileMenuOpen(false);
                            }}
                            className="py-2 text-left text-gray-300 transition hover:text-white"
                          >
                            Sign Out
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setAuthModalOpen(true);
                            setMobileMenuOpen(false);
                          }}
                          className="rounded-lg bg-brand-red px-4 py-2 text-left text-white hover:bg-brand-red-deep"
                        >
                          Sign In
                        </button>
                      )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile: ZIP / rewards / cart above quick chips so the row is not covered by browser or in-app bottom UI. */}
          <div className="flex flex-col-reverse md:flex-col">
            <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1.5 [-webkit-overflow-scrolling:touch] md:hidden">
              {user && showWorkspacesMenu ? (
                <div className="flex-none">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Open workspaces"
                    onClick={() => setWorkspacesOpen(true)}
                    className="h-auto min-h-[44px] w-[96px] flex-col gap-1 rounded-lg border-brand-lime/30 bg-zinc-950/70 px-1.5 py-1.5 text-brand-lime hover:border-brand-lime/50 hover:bg-brand-lime/10 sm:min-h-[48px] sm:w-[108px] sm:gap-2 sm:rounded-xl sm:px-2 sm:py-2"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">Workspaces</span>
                  </Button>
                </div>
              ) : null}
              {HEADER_BROWSE_LINKS.map(({ href, label, Icon, accent }) => (
                <Link key={href} href={href} className="flex-none">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-auto min-h-[44px] w-[96px] flex-col gap-1 rounded-lg border-brand-red/20 bg-zinc-950/70 px-1.5 py-1.5 text-white hover:border-brand-red/40 hover:bg-brand-red/10 active:bg-brand-red/15 sm:min-h-[48px] sm:w-[108px] sm:gap-2 sm:rounded-xl sm:px-2 sm:py-2`}
                  >
                    <Icon className={`h-5 w-5 ${accent}`} />
                    <span className="text-[11px] font-semibold">{label}</span>
                  </Button>
                </Link>
              ))}
              <div className="flex-none">
                {/* Search moved to the top mobile header row */}
              </div>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-1.5 border-t border-brand-red/15 bg-black/80 py-1 sm:gap-2 sm:py-2">
              <div className="min-w-0 flex-1 basis-[min(100%,calc(100%-5.5rem))] sm:basis-[min(100%,20rem)] lg:basis-auto">
                <HeaderShopperLocation />
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <DaTreehouseLoyaltyHeader variant="compact" />
                <Link href="/cart" className="shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-white hover:bg-brand-red/10 sm:h-9 sm:w-9 md:min-h-10 md:min-w-10"
                    aria-label="Cart"
                  >
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    {totalItems > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-brand-red px-0.5 text-[9px] font-medium text-white sm:h-4 sm:min-w-[1rem] sm:text-[10px]">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
              <div className="hidden min-w-0 flex-1 basis-full xl:block xl:max-w-xl xl:basis-auto xl:flex-none">
                <GlobalSearch variant="desktop" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <Sheet open={workspacesOpen} onOpenChange={setWorkspacesOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-[100dvh] w-[min(100%,20rem)] flex-col overflow-hidden border-brand-red/20 bg-zinc-950 pb-[env(safe-area-inset-bottom,0px)] text-zinc-100"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-zinc-800 pb-4 text-left">
            <SheetTitle className="text-lg text-white">Workspaces</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500">
              Admin, vendor, and brand dashboards. Supply portal appears if you are a platform admin or have been
              assigned to a B2B supply account (wholesale listings / RFQs).
            </SheetDescription>
          </SheetHeader>
          <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-6">
            {canAccessAdminDashboard ? (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-brand-lime transition hover:border-brand-lime/20 hover:bg-brand-lime/5"
                onClick={() => setWorkspacesOpen(false)}
              >
                <Shield className="h-5 w-5 shrink-0" aria-hidden />
                Admin dashboard
              </Link>
            ) : null}
            {mayEnterVendorShell ? (
              <Link
                href={vendorDashHref}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-brand-lime transition hover:border-brand-lime/20 hover:bg-brand-lime/5"
                onClick={() => setWorkspacesOpen(false)}
              >
                <Store className="h-5 w-5 shrink-0" aria-hidden />
                Vendor dashboard
              </Link>
            ) : null}
            {mayEnterBrandPortal ? (
              <Link
                href="/brand"
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-violet-300 transition hover:border-violet-500/25 hover:bg-violet-500/10"
                onClick={() => setWorkspacesOpen(false)}
              >
                <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
                Brand dashboard
              </Link>
            ) : null}
            {maySupplyWorkspace ? (
              <Link
                href="/supply"
                title="B2B supply seller tools: platform admins see all accounts; supplier staff see accounts they are assigned to in Admin → Supply B2B."
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-sky-300 transition hover:border-sky-500/25 hover:bg-sky-500/10"
                onClick={() => setWorkspacesOpen(false)}
              >
                <Package className="h-5 w-5 shrink-0" aria-hidden />
                Supply portal
              </Link>
            ) : null}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
