"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, Menu, Chrome as Home, Leaf, TrendingUp, Map, Shield, Store, Package, LogOut, Tag } from 'lucide-react';
import { useState } from 'react';
import { AuthModal } from './auth/AuthModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeaderShopperLocation } from '@/components/HeaderShopperLocation';
import { useRole } from '@/hooks/useRole';

export function Header() {
  const { user, signOut } = useAuth();
  const { canAccessAdminDashboard } = useRole();
  const { totalItems } = useCart();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[55] border-b border-brand-red/25 bg-black/95 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex h-14 min-h-[3.5rem] items-center justify-between gap-2 md:h-16">
            <div className="flex min-w-0 shrink-0 items-center">
              <BrandLogo priority />
            </div>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 px-1 md:flex lg:gap-1">
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Home className="mr-1.5 h-4 w-4 lg:mr-2" />
                  Discover
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Map className="mr-1.5 h-4 w-4 lg:mr-2" />
                  Map
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <TrendingUp className="mr-1.5 h-4 w-4 lg:mr-2" />
                  Feed
                </Button>
              </Link>
              <Link href="/strains">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  <Leaf className="mr-1.5 h-4 w-4 lg:mr-2 text-brand-lime" />
                  Strains
                </Button>
              </Link>
              <Link href="/deals">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-gray-300 hover:bg-brand-red/10 hover:text-white lg:px-3">
                  Deals
                </Button>
              </Link>
              <Link href="/list-your-business">
                <Button variant="ghost" size="sm" className="whitespace-nowrap text-brand-lime hover:bg-brand-lime/10 hover:text-brand-lime-soft lg:px-3">
                  <Store className="mr-1.5 h-4 w-4 lg:mr-2" />
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
                  className="text-gray-400 hover:text-white md:hidden"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : null}

              {user ? (
                <div className="hidden items-center space-x-2 md:flex">
                  {canAccessAdminDashboard && (
                    <Link href="/admin">
                      <Button variant="ghost" className="text-brand-lime hover:bg-brand-lime/10 hover:text-brand-lime-soft">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link href="/vendor/dashboard">
                    <Button variant="ghost" className="text-brand-lime hover:bg-brand-lime/10 hover:text-brand-lime-soft">
                      Vendor Dashboard
                    </Button>
                  </Link>
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
                  className="hidden bg-brand-red text-white hover:bg-brand-red-deep md:flex"
                >
                  Sign In
                </Button>
              )}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex max-h-[100dvh] flex-col border-brand-red/20 bg-black"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="mt-12 shrink-0 border-b border-brand-red/20 pb-4 md:hidden">
                    <HeaderShopperLocation variant="sheet" />
                  </div>
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
                  <nav className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-6 flex flex-col space-y-4">
                    <Link
                      href="/list-your-business"
                      className="py-2 text-brand-lime transition hover:text-brand-lime-soft"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      List your business
                    </Link>
                    {user ? (
                      <>
                        {canAccessAdminDashboard && (
                          <Link
                            href="/admin"
                            className="py-2 text-brand-lime transition hover:text-brand-lime-soft"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Admin
                          </Link>
                        )}
                        <Link
                          href="/vendor/dashboard"
                          className="py-2 text-brand-lime transition hover:text-brand-lime-soft"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Vendor Dashboard
                        </Link>
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
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2 overflow-x-auto px-1 py-2">
            {[
              { href: '/discover', label: 'Discover', Icon: Home, accent: 'text-brand-lime' },
              { href: '/map', label: 'Map', Icon: Map, accent: 'text-emerald-400' },
              { href: '/feed', label: 'Feed', Icon: TrendingUp, accent: 'text-sky-400' },
              { href: '/strains', label: 'Strains', Icon: Leaf, accent: 'text-lime-400' },
              { href: '/deals', label: 'Deals', Icon: Tag, accent: 'text-amber-300' },
            ].map(({ href, label, Icon, accent }) => (
              <Link key={href} href={href} className="flex-none">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-auto w-[108px] flex-col gap-2 rounded-xl border-brand-red/20 bg-zinc-950/70 px-2 py-2 text-white hover:border-brand-red/40 hover:bg-brand-red/10`}
                >
                  <Icon className={`h-5 w-5 ${accent}`} />
                  <span className="text-[11px] font-semibold">{label}</span>
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-brand-red/15 bg-black/80 py-2.5">
            <div className="min-w-0 flex-1">
              <HeaderShopperLocation />
            </div>
            <Link href="/cart" className="shrink-0">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 text-white hover:bg-brand-red/10" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-red px-0.5 text-[10px] font-medium text-white sm:h-5 sm:min-w-[1.25rem] sm:text-xs">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
