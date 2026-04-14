"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Store,
  Star,
  ChartBar as BarChart3,
  Settings,
  CircleHelp as HelpCircle,
  LogOut,
  Tag,
  TicketPercent,
  Award,
  Megaphone,
  Users,
  UsersRound,
  UtensilsCrossed as Menu,
  Library,
  MapPin,
  Link2,
  Truck,
  PanelLeftClose,
  ExternalLink,
  FileText,
  Clock,
  Palette,
  Package,
  Code2,
  type LucideIcon,
} from 'lucide-react';
import { VendorMarketplaceToggle } from '@/components/supply/VendorMarketplaceToggle';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { formatVendorArea } from '@/lib/vendorDisplay';
import { publicVendorDisplayName } from '@/lib/vendorDisplayName';
import { listingHrefForVendor } from '@/lib/listingPath';
import { isSupplyExchangeEnabled } from '@/lib/supplyExchange';
import { useVendorUnseenPendingOrders } from '@/hooks/useVendorUnseenPendingOrders';
import { VendorUnseenOrdersAlert } from '@/components/vendor/VendorUnseenOrdersAlert';

type VendorNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge: string | null;
  activePathPrefix?: string;
  profileNavGroup?: 'profile' | 'hours';
};

const navigationItems: VendorNavItem[] = [
  {
    title: 'Overview',
    href: '/vendor/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: 'Fulfillment',
    href: '/vendor/orders',
    icon: Truck,
    badge: null,
    activePathPrefix: '/vendor/orders',
  },
  {
    title: 'Business Profile',
    href: '/vendor/profile',
    icon: Store,
    badge: null,
    profileNavGroup: 'profile',
  },
  {
    title: 'Business hours',
    href: '/vendor/profile#business-hours',
    icon: Clock,
    badge: null,
    profileNavGroup: 'hours',
  },
  {
    title: 'Menu Manager',
    href: '/vendor/menu',
    icon: Menu,
    badge: null
  },
  {
    title: 'Listing design',
    href: '/vendor/listing-design',
    icon: Palette,
    badge: null,
  },
  {
    title: 'Website embed',
    href: '/vendor/embed-menu',
    icon: Code2,
    badge: null,
    activePathPrefix: '/vendor/embed-menu',
  },
  {
    title: 'Brand catalog',
    href: '/vendor/menu/catalog',
    icon: Library,
    badge: null,
    activePathPrefix: '/vendor/menu/catalog',
  },
  {
    title: 'Connect POS',
    href: '/vendor/menu/sources',
    icon: Link2,
    badge: null,
    activePathPrefix: '/vendor/menu/sources',
  },
  {
    title: 'Map pin',
    href: '/vendor/map-location',
    icon: MapPin,
    badge: null
  },
  {
    title: 'Deals & Offers',
    href: '/vendor/deals',
    icon: Tag,
    badge: null
  },
  {
    title: 'Promo codes',
    href: '/vendor/promo-codes',
    icon: TicketPercent,
    badge: null,
    activePathPrefix: '/vendor/promo-codes',
  },
  {
    title: 'Reviews',
    href: '/vendor/reviews',
    icon: Star,
    badge: null
  },
  {
    title: 'Analytics',
    href: '/vendor/analytics',
    icon: BarChart3,
    badge: null
  },
  {
    title: 'Smokers club',
    href: '/vendor/advertising',
    icon: Award,
    badge: null,
    activePathPrefix: '/vendor/advertising',
  },
  {
    title: 'Sponsored ads',
    href: '/vendor/ads',
    icon: Megaphone,
    badge: null,
    activePathPrefix: '/vendor/ads',
  },
  {
    title: 'Platform billing',
    href: '/vendor/billing',
    icon: FileText,
    badge: null,
    activePathPrefix: '/vendor/billing',
  },
  {
    title: 'Customers',
    href: '/vendor/customers',
    icon: Users,
    badge: null
  },
  {
    title: 'Team',
    href: '/vendor/team',
    icon: UsersRound,
    badge: null,
    activePathPrefix: '/vendor/team',
  },
  {
    title: 'Settings',
    href: '/vendor/settings',
    icon: Settings,
    badge: null
  },
  {
    title: 'Help & Support',
    href: '/vendor/help',
    icon: HelpCircle,
    badge: null
  }
];

const supplyNavItem: VendorNavItem = {
  title: 'Supply marketplace',
  href: '/vendor/supply',
  icon: Package,
  badge: null,
  activePathPrefix: '/vendor/supply',
};

export function VendorNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor } = useVendorBusiness({ adminMenuVendorId });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locHash, setLocHash] = useState('');
  const { unseenIds, unseenCount } = useVendorUnseenPendingOrders(vendor?.id, user?.id, pathname);

  const navigationItemsResolved = useMemo((): VendorNavItem[] => {
    const patchOrderBadge = (items: VendorNavItem[]): VendorNavItem[] =>
      items.map((item) =>
        item.href === '/vendor/orders'
          ? { ...item, badge: unseenCount > 0 ? String(unseenCount) : null }
          : item
      );
    const base = patchOrderBadge([...navigationItems]);
    if (!isSupplyExchangeEnabled()) return base;
    const idx = base.findIndex((i) => i.href === '/vendor/menu/catalog');
    if (idx === -1) return [...base, supplyNavItem];
    return [...base.slice(0, idx + 1), supplyNavItem, ...base.slice(idx + 1)];
  }, [unseenCount]);

  useEffect(() => {
    const sync = () => setLocHash(typeof window !== 'undefined' ? window.location.hash : '');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname]);

  const vendorProfile = (user as any)?.vendorProfile;
  const displayName =
    publicVendorDisplayName(vendor?.name || vendorProfile?.business_name || '') || 'Your Business';
  const plan = vendor?.subscription_tier || vendorProfile?.plan_type || 'basic';
  const isVerified = vendor?.verified === true || vendorProfile?.is_verified || false;
  const areaLine = vendor ? formatVendorArea(vendor) : null;
  const storefrontHref = vendor?.id ? listingHrefForVendor({ id: vendor.id, slug: vendor.slug }) : null;

  const renderStorefrontButton = (opts?: { className?: string; onNavigate?: () => void }) => {
    if (!storefrontHref) return null;
    return (
      <Button
        asChild
        variant="outline"
        className={cn(
          'w-full border-green-600/40 bg-green-950/20 text-green-200 hover:bg-green-900/30 hover:text-white',
          opts?.className
        )}
      >
        <Link
          href={storefrontHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={opts?.onNavigate}
          aria-label="View your public storefront in a new tab"
        >
          <ExternalLink className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          View storefront
        </Link>
      </Button>
    );
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {navigationItemsResolved.map((item) => {
        const Icon = item.icon;
        const hrefPath = item.href.split('#')[0] ?? item.href;
        let isActive = false;
        if (item.profileNavGroup === 'hours') {
          isActive = pathname === '/vendor/profile' && locHash === '#business-hours';
        } else if (item.profileNavGroup === 'profile') {
          isActive = pathname === '/vendor/profile' && locHash !== '#business-hours';
        } else if (item.activePathPrefix) {
          isActive =
            pathname === item.activePathPrefix || pathname.startsWith(`${item.activePathPrefix}/`);
        } else {
          isActive = pathname === hrefPath;
        }

        const href =
          adminMenuVendorId != null
            ? withAdminVendorQuery(item.href, adminMenuVendorId)
            : item.href;

        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition ${
              isActive
                ? 'border border-green-600/30 bg-green-600/20 text-green-400'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.title}</span>
            </div>
            {item.badge && (
              <Badge className="bg-green-600 px-2 py-0 text-xs text-white">
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <VendorUnseenOrdersAlert
        vendorId={vendor?.id}
        unseenIds={unseenIds}
        unseenCount={unseenCount}
        adminMenuVendorId={adminMenuVendorId}
      />
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="fixed left-3 top-[78px] z-40 h-11 w-11 rounded-full border border-green-700/40 bg-gray-950/95 text-green-300 shadow-lg backdrop-blur hover:bg-gray-900"
              aria-label="Open vendor menu"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-sm border-green-900/30 bg-background p-0 text-white">
            <div className="border-b border-green-900/20 px-4 py-4">
              <SheetTitle className="text-left text-white">Vendor menu</SheetTitle>
              <p className="mt-1 truncate text-sm text-gray-400">{displayName}</p>
            </div>
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-3">
              {storefrontHref ? (
                <div className="mb-3">
                  {renderStorefrontButton({ onNavigate: () => setMobileOpen(false) })}
                </div>
              ) : null}
              {isSupplyExchangeEnabled() ? (
                <div className="mb-3 flex justify-center">
                  <VendorMarketplaceToggle adminMenuVendorId={adminMenuVendorId} variant="compact" />
                </div>
              ) : null}
              {renderNavLinks(() => setMobileOpen(false))}
              <div className="mt-4 border-t border-green-900/20 pt-3">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-700/50 bg-red-950/40 px-3 py-2.5 font-semibold text-red-200 transition hover:bg-red-900/50"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="sticky top-4 hidden w-full max-w-none shrink-0 border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-4 md:block md:w-56 md:max-w-[15.5rem] lg:w-64 lg:max-w-64">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-green-950/40">
              <span className="text-xl font-bold text-green-500">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-white">{displayName}</h3>
              {areaLine ? (
                <p className="truncate text-xs text-gray-500">{areaLine}</p>
              ) : null}
              <p className="text-xs capitalize text-gray-400">{plan} Plan</p>
            </div>
          </div>
          {isVerified && (
            <Badge className="w-full justify-center border-green-600/30 bg-green-600/20 py-1 text-green-500">
              Active & Verified
            </Badge>
          )}
        </div>

        {storefrontHref ? <div className="mb-4">{renderStorefrontButton()}</div> : null}

        {isSupplyExchangeEnabled() ? (
          <div className="mb-4 flex justify-center">
            <VendorMarketplaceToggle adminMenuVendorId={adminMenuVendorId} variant="compact" />
          </div>
        ) : null}

        {renderNavLinks()}

        <div className="mt-6 border-t border-green-900/20 pt-4">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-700/50 bg-red-950/40 px-3 py-2.5 font-semibold text-red-200 transition hover:bg-red-900/50"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </Card>
    </>
  );
}

export default VendorNav;
