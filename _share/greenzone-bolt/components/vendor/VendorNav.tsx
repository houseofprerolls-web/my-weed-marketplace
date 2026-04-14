"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Store,
  DollarSign,
  Star,
  ChartBar as BarChart3,
  Settings,
  CircleHelp as HelpCircle,
  LogOut,
  Tag,
  Award,
  Users,
  UsersRound,
  UtensilsCrossed as Menu,
  MapPin,
  Link2,
  Truck,
  PanelLeftClose,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { formatVendorArea } from '@/lib/vendorDisplay';

const navigationItems: {
  title: string;
  href: string;
  icon: LucideIcon;
  badge: string | null;
  /** When set, item is active for this path and nested routes (e.g. /vendor/orders/…) */
  activePathPrefix?: string;
}[] = [
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
  },
  {
    title: 'Menu Manager',
    href: '/vendor/menu',
    icon: Menu,
    badge: null
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
    title: 'Subscription',
    href: '/vendor/subscription',
    icon: DollarSign,
    badge: null
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

export function VendorNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor } = useVendorBusiness({ adminMenuVendorId });
  const [mobileOpen, setMobileOpen] = useState(false);

  const vendorProfile = (user as any)?.vendorProfile;
  const displayName = vendor?.name || vendorProfile?.business_name || 'Your Business';
  const plan = vendor?.subscription_tier || vendorProfile?.plan_type || 'basic';
  const isVerified = vendor?.verified === true || vendorProfile?.is_verified || false;
  const areaLine = vendor ? formatVendorArea(vendor) : null;

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.activePathPrefix
          ? pathname === item.activePathPrefix || pathname.startsWith(`${item.activePathPrefix}/`)
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
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
      <div className="lg:hidden">
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
          <SheetContent side="left" className="w-[88vw] max-w-sm border-green-900/30 bg-black p-0 text-white">
            <div className="border-b border-green-900/20 px-4 py-4">
              <SheetTitle className="text-left text-white">Vendor menu</SheetTitle>
              <p className="mt-1 truncate text-sm text-gray-400">{displayName}</p>
            </div>
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-3">
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

      <Card className="sticky top-4 hidden border-green-900/20 bg-gradient-to-br from-gray-900 to-black p-4 lg:block">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-green-600/30 bg-green-900/30">
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
