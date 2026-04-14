import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Mail } from 'lucide-react';
import { SITE_NAME } from '@/lib/brand';
import { FooterVendorAdvertisingPricingLink } from '@/components/footer/FooterVendorAdvertisingPricingLink';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-brand-red/20 bg-black text-gray-300">
      <div className="mx-auto max-w-7xl px-4 pb-[max(3rem,calc(3rem+env(safe-area-inset-bottom,0px)))] pt-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 inline-block">
              <Image
                src="/brand/datreehouse-logo.png"
                alt={SITE_NAME}
                width={1024}
                height={1024}
                className="h-14 w-auto object-contain object-left"
              />
            </Link>
            <p className="mb-4 text-sm">
              Your trusted cannabis discovery platform. Find dispensaries, delivery services, and quality products near you.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-lime" />
                <span>Nationwide Service</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-lime" />
                <a href="mailto:support@datreehouse.com" className="hover:text-brand-lime-soft">
                  support@datreehouse.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/discover" className="hover:text-white transition-colors">
                  Browse Vendors
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition-colors">
                  Map View
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-white transition-colors">
                  Deals & Promotions
                </Link>
              </li>
              <li>
                <Link href="/strains" className="hover:text-white transition-colors">
                  Strain Database
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/guides" className="hover:text-white transition-colors">
                  Guides
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">For Business</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/vendor/onboarding" className="hover:text-white transition-colors">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/vendor/onboarding" className="hover:text-white transition-colors">
                  Vendor onboarding
                </Link>
              </li>
              <li>
                <Link href="/vendor-agreement" className="hover:text-white transition-colors">
                  Vendor Agreement
                </Link>
              </li>
              <li>
                <Link href="/advertising-policy" className="hover:text-white transition-colors">
                  Advertising Policy
                </Link>
              </li>
              <FooterVendorAdvertisingPricingLink />
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Support & Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/compliance" className="hover:text-white transition-colors">
                  Compliance disclosures
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/order-refund-policy" className="hover:text-white transition-colors">
                  Order & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" className="hover:text-white transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-brand-red/20 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <p>
              &copy; {currentYear} {SITE_NAME}. All rights reserved.
            </p>
            <p className="text-gray-400">
              Must be 21+ to use {SITE_NAME}. Please consume responsibly.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
