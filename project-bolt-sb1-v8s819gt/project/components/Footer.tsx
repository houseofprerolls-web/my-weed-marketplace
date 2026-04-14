import Link from 'next/link';
import { MapPin, Mail, Phone } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">GreenZone</h3>
            <p className="text-sm mb-4">
              Your trusted cannabis discovery platform. Find dispensaries, delivery services, and quality products near you.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Nationwide Service</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@greenzone.com" className="hover:text-white">
                  support@greenzone.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/directory" className="hover:text-white transition-colors">
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
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">For Business</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/business" className="hover:text-white transition-colors">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/vendor/onboarding" className="hover:text-white transition-colors">
                  Vendor Dashboard
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
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Support & Legal</h4>
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

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>
              &copy; {currentYear} GreenZone. All rights reserved.
            </p>
            <p className="text-gray-400">
              Must be 21+ to use this platform. Please consume responsibly.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
