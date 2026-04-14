"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Store, DollarSign, Star, ChartBar as BarChart3, Settings, CircleHelp as HelpCircle, LogOut, Tag, Megaphone, Users, UtensilsCrossed as Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  {
    title: 'Overview',
    href: '/vendor/dashboard',
    icon: LayoutDashboard,
    badge: null
  },
  {
    title: 'Business Profile',
    href: '/vendor/profile',
    icon: Store,
    badge: null
  },
  {
    title: 'Menu Manager',
    href: '/vendor/menu',
    icon: Menu,
    badge: null
  },
  {
    title: 'Deals & Offers',
    href: '/vendor/deals',
    icon: Tag,
    badge: '3'
  },
  {
    title: 'Reviews',
    href: '/vendor/reviews',
    icon: Star,
    badge: 'New'
  },
  {
    title: 'Analytics',
    href: '/vendor/analytics',
    icon: BarChart3,
    badge: null
  },
  {
    title: 'Advertising',
    href: '/vendor/advertising',
    icon: Megaphone,
    badge: null
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

  const vendorProfile = (user as any)?.vendorProfile;
  const businessName = vendorProfile?.business_name || 'Your Business';
  const plan = vendorProfile?.plan_type || 'basic';
  const isVerified = vendorProfile?.is_verified || false;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-4 sticky top-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center border-2 border-green-600/30">
            <span className="text-xl font-bold text-green-500">
              {businessName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">{businessName}</h3>
            <p className="text-gray-400 text-xs capitalize">{plan} Plan</p>
          </div>
        </div>
        {isVerified && (
          <Badge className="bg-green-600/20 text-green-500 border-green-600/30 w-full justify-center py-1">
            Active & Verified
          </Badge>
        )}
      </div>

      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.title}</span>
              </div>
              {item.badge && (
                <Badge className="bg-green-600 text-white text-xs px-2 py-0">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-green-900/20">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition w-full"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium text-sm">Log Out</span>
        </button>
      </div>
    </Card>
  );
}

export default VendorNav;
