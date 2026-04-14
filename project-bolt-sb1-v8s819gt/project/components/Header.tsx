"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, Menu, Leaf, Chrome as Home, Sparkles, TrendingUp, Map } from 'lucide-react';
import { useState } from 'react';
import { AuthModal } from './auth/AuthModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-green-900/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-green-600 p-2 rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">GreenZone</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/demo">
                <Button variant="ghost" className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Demo
                </Button>
              </Link>
              <Link href="/directory">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-green-500/10">
                  <Home className="h-4 w-4 mr-2" />
                  Discover
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-green-500/10">
                  <Map className="h-4 w-4 mr-2" />
                  Map
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-green-500/10">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Feed
                </Button>
              </Link>
              <Link href="/strains">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-green-500/10">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Strains
                </Button>
              </Link>
              <Link href="/deals">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-green-500/10">
                  Deals
                </Button>
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative text-white">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>

              {user ? (
                <div className="hidden md:flex items-center space-x-2">
                  <Link href="/vendor/dashboard">
                    <Button variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/10">
                      Vendor Dashboard
                    </Button>
                  </Link>
                  <Link href="/account">
                    <Button variant="ghost" className="text-white">
                      <User className="h-4 w-4 mr-2" />
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
                  className="hidden md:flex bg-green-600 hover:bg-green-700 text-white"
                >
                  Sign In
                </Button>
              )}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden text-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-black border-green-900/20">
                  <nav className="flex flex-col space-y-4 mt-8">
                    <Link
                      href="/directory"
                      className="text-gray-300 hover:text-white transition py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Discover
                    </Link>
                    <Link
                      href="/map"
                      className="text-gray-300 hover:text-white transition py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Map
                    </Link>
                    <Link
                      href="/feed"
                      className="text-gray-300 hover:text-white transition py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Feed
                    </Link>
                    <Link
                      href="/strains"
                      className="text-gray-300 hover:text-white transition py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Strains
                    </Link>
                    <Link
                      href="/deals"
                      className="text-gray-300 hover:text-white transition py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Deals
                    </Link>
                    {user ? (
                      <>
                        <Link
                          href="/vendor/dashboard"
                          className="text-green-400 hover:text-green-300 transition py-2"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Vendor Dashboard
                        </Link>
                        <Link
                          href="/account"
                          className="text-gray-300 hover:text-white transition py-2"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Account
                        </Link>
                        <button
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                          className="text-gray-300 hover:text-white transition py-2 text-left"
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
                        className="text-left bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Sign In
                      </button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
